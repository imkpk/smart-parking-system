#Requires -Version 5.1
<#
.SYNOPSIS
  Start the full local E2E stack (MySQL, backend, payment service, frontend) and run Cypress.

.DESCRIPTION
  Mirrors the CI e2e-smoke job for local development on Windows.

  Services started:
    - MySQL (existing local instance, or a Docker container with -UseDocker)
    - NestJS backend API  -> http://localhost:3000/api
    - Payment service     -> http://localhost:8081
    - Vite frontend       -> http://localhost:5173 (via e2e:ci or dev)

.PARAMETER Mode
  smoke  - Run headless Cypress smoke suite (default)
  open   - Open Cypress interactive UI (stack stays up until you close Cypress)
  stack  - Start all services only; press Ctrl+C to stop

.PARAMETER UseDocker
  Start a disposable MySQL 8 container when port 3306 is not reachable.

.EXAMPLE
  pwsh -File scripts/run-e2e-local.ps1

.EXAMPLE
  pwsh -File scripts/run-e2e-local.ps1 -Mode open

.EXAMPLE
  pwsh -File scripts/run-e2e-local.ps1 -Mode stack
#>
[CmdletBinding()]
param(
    [ValidateSet('smoke', 'open', 'stack')]
    [string] $Mode = 'smoke',

    [switch] $UseDocker,
    [switch] $SkipInstall
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$Root = Resolve-Path (Join-Path $PSScriptRoot '..')
$BackendDir = Join-Path $Root 'backend'
$FrontendDir = Join-Path $Root 'frontend'
$PaymentDir = Join-Path $Root 'payment-service'
$LogDir = Join-Path $Root '.grok/tmp/e2e-local'
$DockerMysqlName = 'smart-parking-mysql-e2e'

$StartedProcesses = New-Object System.Collections.Generic.List[System.Diagnostics.Process]
$StartedDocker = $false

function Write-Step([string] $Message) {
    Write-Host "`n==> $Message" -ForegroundColor Cyan
}

function Test-TcpPort([int] $Port, [string] $HostName = '127.0.0.1') {
    try {
        $client = New-Object System.Net.Sockets.TcpClient
        $async = $client.BeginConnect($HostName, $Port, $null, $null)
        $waited = $async.AsyncWaitHandle.WaitOne(1500, $false)
        if (-not $waited) {
            $client.Close()
            return $false
        }
        $client.EndConnect($async) | Out-Null
        $client.Close()
        return $true
    }
    catch {
        return $false
    }
}

function Wait-ForUrl([string] $Url, [int] $Attempts = 60, [int] $DelaySeconds = 2) {
    for ($i = 1; $i -le $Attempts; $i++) {
        try {
            $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5
            if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 300) {
                Write-Host "Ready: $Url"
                return
            }
        }
        catch {
            # retry
        }
        Start-Sleep -Seconds $DelaySeconds
    }
    throw "Timed out waiting for $Url"
}

function Read-DotEnvValue([string] $FilePath, [string] $Key) {
    if (-not (Test-Path $FilePath)) {
        return $null
    }
    $pattern = "^\s*$([regex]::Escape($Key))\s*=\s*(.+?)\s*$"
    foreach ($line in Get-Content $FilePath) {
        if ($line -match $pattern) {
            return $Matches[1].Trim().Trim('"').Trim("'")
        }
    }
    return $null
}

function Parse-MySqlUrl([string] $DatabaseUrl) {
    if ([string]::IsNullOrWhiteSpace($DatabaseUrl)) {
        throw 'DATABASE_URL is missing. Create backend/.env from backend/.env.example.'
    }
    if ($DatabaseUrl -notmatch '^mysql://([^:]+):([^@]+)@([^:/]+):(\d+)/([^?]+)') {
        throw "Could not parse DATABASE_URL: $DatabaseUrl"
    }
    return [pscustomobject]@{
        User = [uri]::UnescapeDataString($Matches[1])
        Password = [uri]::UnescapeDataString($Matches[2])
        Host = $Matches[3]
        Port = [int]$Matches[4]
        Database = $Matches[5]
    }
}

function Invoke-MySqlSql([string] $Sql, [string] $MySqlHost, [int] $Port, [string] $User, [string] $Password) {
    $mysqlCli = Get-Command mysql -ErrorAction SilentlyContinue
    if ($null -ne $mysqlCli) {
        $mysqlArgs = @(
            '-h', $MySqlHost,
            '-P', $Port,
            "-u$User",
            "-p$Password",
            '-e', $Sql
        )
        & $mysqlCli.Source @mysqlArgs | Out-Null
        return
    }

    if ($StartedDocker -and (docker ps --format '{{.Names}}' 2>$null | Select-String -SimpleMatch $DockerMysqlName)) {
        docker exec $DockerMysqlName mysql -uroot -ppassword -e $Sql | Out-Null
        return
    }

    $dockerCli = Get-Command docker -ErrorAction SilentlyContinue
    if ($null -ne $dockerCli) {
        try {
            $hostTarget = if ($MySqlHost -in @('localhost', '127.0.0.1')) { 'host.docker.internal' } else { $MySqlHost }
            docker run --rm mysql:8.0 mysql `
                -h $hostTarget `
                -P $Port `
                -u$User `
                -p$Password `
                -e $Sql 2>$null | Out-Null
            return
        }
        catch {
            Write-Host 'Docker MySQL client unavailable; assuming required databases already exist.'
            return
        }
    }

    Write-Host 'mysql CLI not found; assuming parking_lot_db, parking_lot_shadow_db, and parking_payment_db already exist.'
}

function Resolve-NpmExecutable() {
    if ($IsWindows -or $env:OS -match 'Windows') {
        return 'npm.cmd'
    }
    return 'npm'
}

function Start-BackgroundProcess(
    [string] $Name,
    [string] $WorkingDirectory,
    [string] $FilePath,
    [string[]] $ArgumentList,
    [hashtable] $Environment = @{}
) {
    foreach ($key in $Environment.Keys) {
        Set-Item -Path "env:$key" -Value $Environment[$key]
    }

    New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
    $stdout = Join-Path $LogDir "$Name.log"
    $stderr = Join-Path $LogDir "$Name.err.log"

    Write-Host "Starting $Name (logs: $stdout)"
    $proc = Start-Process `
        -FilePath $FilePath `
        -ArgumentList $ArgumentList `
        -WorkingDirectory $WorkingDirectory `
        -RedirectStandardOutput $stdout `
        -RedirectStandardError $stderr `
        -PassThru `
        -WindowStyle Hidden

    $StartedProcesses.Add($proc) | Out-Null
    return $proc
}

function Stop-AllServices() {
    Write-Step 'Stopping local E2E services'

    foreach ($proc in $StartedProcesses) {
        if ($proc.HasExited) { continue }
        try {
            Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
        }
        catch {
            # ignore
        }
    }

    if ($StartedDocker) {
        docker rm -f $DockerMysqlName 2>$null | Out-Null
    }
}

try {
    Write-Step 'Preparing directories and environment'
    New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

    $envFile = Join-Path $BackendDir '.env'
    $databaseUrl = Read-DotEnvValue $envFile 'DATABASE_URL'
    if (-not $databaseUrl) {
        $databaseUrl = 'mysql://root:password@localhost:3306/parking_lot_db'
        Write-Host "backend/.env not found; using default DATABASE_URL for E2E."
    }

    $db = Parse-MySqlUrl $databaseUrl
    $mysqlReachable = Test-TcpPort -Port $db.Port -HostName '127.0.0.1'

    if (-not $mysqlReachable) {
        if (-not $UseDocker) {
            throw @"
MySQL is not reachable on $($db.Host):$($db.Port).
Start MySQL locally, or re-run with -UseDocker to start a disposable container.

  pwsh -File scripts/run-e2e-local.ps1 -UseDocker
"@
        }

        Write-Step 'Starting MySQL via Docker'
        docker rm -f $DockerMysqlName 2>$null | Out-Null
        docker run -d `
            --name $DockerMysqlName `
            -e MYSQL_ROOT_PASSWORD=password `
            -e MYSQL_DATABASE=parking_lot_db `
            -p 3306:3306 `
            mysql:8.0 | Out-Null
        $StartedDocker = $true

        $db = Parse-MySqlUrl 'mysql://root:password@localhost:3306/parking_lot_db'
        $databaseUrl = 'mysql://root:password@localhost:3306/parking_lot_db'
        $env:DATABASE_URL = $databaseUrl
        $env:SHADOW_DATABASE_URL = 'mysql://root:password@localhost:3306/parking_lot_shadow_db'

        Write-Step 'Waiting for Docker MySQL'
        for ($i = 1; $i -le 30; $i++) {
            if (Test-TcpPort -Port 3306) { break }
            Start-Sleep -Seconds 2
        }
        if (-not (Test-TcpPort -Port 3306)) {
            throw 'Docker MySQL failed to start on port 3306.'
        }
    }

    Write-Step 'Ensuring MySQL databases exist'
    $sql = @"
CREATE DATABASE IF NOT EXISTS parking_lot_db;
CREATE DATABASE IF NOT EXISTS parking_lot_shadow_db;
CREATE DATABASE IF NOT EXISTS parking_payment_db;
"@
    Invoke-MySqlSql -Sql $sql -MySqlHost $db.Host -Port $db.Port -User $db.User -Password $db.Password

    Write-Step 'Installing and migrating backend'
    Push-Location $BackendDir
    if (-not $SkipInstall) {
        npm install
    }
    npx prisma generate
    npx prisma migrate deploy
    npm run prisma:seed
    npm run build
    Pop-Location

    $backendHealthy = $false
    try {
        $null = Invoke-WebRequest -Uri 'http://127.0.0.1:3000/api/health' -UseBasicParsing -TimeoutSec 2
        $backendHealthy = $true
    }
    catch {
        $backendHealthy = $false
    }

    if (-not $backendHealthy) {
        Write-Step 'Starting backend API'
        Start-BackgroundProcess `
            -Name 'backend' `
            -WorkingDirectory $BackendDir `
            -FilePath (Resolve-NpmExecutable) `
            -ArgumentList @('run', 'start') | Out-Null
    }
    else {
        Write-Host 'Backend already running on port 3000 — skipping start.'
    }

    $paymentHealthy = $false
    try {
        $null = Invoke-WebRequest -Uri 'http://127.0.0.1:8081/actuator/health' -UseBasicParsing -TimeoutSec 2
        $paymentHealthy = $true
    }
    catch {
        $paymentHealthy = $false
    }

    if (-not $paymentHealthy) {
        Write-Step 'Building and starting payment service'
        Push-Location $PaymentDir
        if (-not $SkipInstall) {
            mvn -B -q package -DskipTests
        }
        else {
            if (-not (Get-ChildItem -Path (Join-Path $PaymentDir 'target') -Filter '*.jar' -ErrorAction SilentlyContinue)) {
                mvn -B -q package -DskipTests
            }
        }
        $jar = Get-ChildItem -Path (Join-Path $PaymentDir 'target') -Filter '*.jar' |
            Where-Object { $_.Name -notmatch 'sources|javadoc|original' } |
            Select-Object -First 1
        if (-not $jar) {
            throw 'Payment service JAR not found. Run without -SkipInstall.'
        }
        Pop-Location

        $paymentDbUrl = "jdbc:mysql://127.0.0.1:$($db.Port)/parking_payment_db?createDatabaseIfNotExist=true&useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC"
        Start-BackgroundProcess `
            -Name 'payment-service' `
            -WorkingDirectory $PaymentDir `
            -FilePath 'java' `
            -ArgumentList @('-jar', $jar.FullName) `
            -Environment @{
                DB_URL = $paymentDbUrl
                DB_USERNAME = $db.User
                DB_PASSWORD = $db.Password
                JWT_SECRET = 'smart_parking_dev_jwt_secret_32_chars_minimum'
            } | Out-Null
    }
    else {
        Write-Host 'Payment service already running on port 8081 — skipping start.'
    }

    Write-Step 'Waiting for backend and payment service health checks'
    Wait-ForUrl 'http://127.0.0.1:3000/api/health'
    Wait-ForUrl 'http://127.0.0.1:8081/actuator/health'

    Push-Location $FrontendDir
    if (-not $SkipInstall) {
        npm install
    }
    npx cypress verify | Out-Null

    switch ($Mode) {
        'smoke' {
            Write-Step 'Running Cypress smoke suite (starts Vite automatically)'
            npm run e2e:ci
        }
        'open' {
            Write-Step 'Starting Vite and opening Cypress UI'
            if (-not (Test-TcpPort -Port 5173)) {
                Start-BackgroundProcess `
                    -Name 'frontend' `
                    -WorkingDirectory $FrontendDir `
                    -FilePath (Resolve-NpmExecutable) `
                    -ArgumentList @('run', 'dev') | Out-Null
                Wait-ForUrl 'http://127.0.0.1:5173'
            }
            npm run e2e:open
        }
        'stack' {
            Write-Step 'Starting frontend dev server (stack only — Ctrl+C to stop)'
            if (-not (Test-TcpPort -Port 5173)) {
                Start-BackgroundProcess `
                    -Name 'frontend' `
                    -WorkingDirectory $FrontendDir `
                    -FilePath (Resolve-NpmExecutable) `
                    -ArgumentList @('run', 'dev') | Out-Null
                Wait-ForUrl 'http://127.0.0.1:5173'
            }
            Write-Host @"

Stack is up:
  Frontend : http://localhost:5173
  Backend  : http://localhost:3000/api
  Payment  : http://localhost:8081

Run Cypress manually:
  cd frontend
  npm run e2e:open    # interactive
  npm run e2e:smoke   # headless

Press Ctrl+C to stop all services started by this script.
"@
            while ($true) { Start-Sleep -Seconds 3600 }
        }
    }
    Pop-Location

    Write-Step 'E2E run finished successfully'
}
catch {
    Write-Host "`nE2E script failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Logs: $LogDir" -ForegroundColor Yellow
    exit 1
}
finally {
    Stop-AllServices
}