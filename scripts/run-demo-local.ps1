#Requires -Version 5.1
<#
.SYNOPSIS
  Start the Smart Parking stack for a client demo (MySQL, backend, frontend, demo data).

.EXAMPLE
  pwsh -File scripts/run-demo-local.ps1

.EXAMPLE
  pwsh -File scripts/run-demo-local.ps1 -Reseed
#>
[CmdletBinding()]
param(
    [switch] $Reseed,
    [switch] $SkipInstall
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$Root = Resolve-Path (Join-Path $PSScriptRoot '..')
$BackendDir = Join-Path $Root 'backend'
$FrontendDir = Join-Path $Root 'frontend'

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

function Wait-ForUrl([string] $Url, [int] $Attempts = 45, [int] $DelaySeconds = 2) {
    for ($i = 1; $i -le $Attempts; $i++) {
        try {
            $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5
            if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 300) {
                return
            }
        }
        catch {
            Start-Sleep -Seconds $DelaySeconds
        }
    }
    throw "Timed out waiting for $Url"
}

Write-Step 'Smart Parking — client demo launcher'

if (-not (Test-TcpPort 3306)) {
    Write-Host 'MySQL is not reachable on port 3306. Start your local MySQL instance first.' -ForegroundColor Yellow
    exit 1
}

Push-Location $BackendDir
try {
    if (-not $SkipInstall -and -not (Test-Path 'node_modules')) {
        Write-Step 'Installing backend dependencies'
        npm ci
    }

    Write-Step 'Applying database migrations'
    npx prisma migrate deploy

    Write-Step 'Running base seed (organization)'
    npm run prisma:seed

    Write-Step 'Seeding demo data (lots, slots, activity, users)'
    if ($Reseed) {
        $env:DEMO_RESEED = '1'
    }
    npm run prisma:demo-seed
    Remove-Item Env:DEMO_RESEED -ErrorAction SilentlyContinue
}
finally {
    Pop-Location
}

if (-not $SkipInstall -and -not (Test-Path (Join-Path $FrontendDir 'node_modules'))) {
    Write-Step 'Installing frontend dependencies'
    Push-Location $FrontendDir
    try {
        npm ci
    }
    finally {
        Pop-Location
    }
}

Write-Step 'Starting backend (port 3000)'
$backendProcess = Start-Process -FilePath 'npm' -ArgumentList 'run', 'start:dev' -WorkingDirectory $BackendDir -PassThru -NoNewWindow

Write-Step 'Starting frontend (port 5173)'
$frontendProcess = Start-Process -FilePath 'npm' -ArgumentList 'run', 'dev' -WorkingDirectory $FrontendDir -PassThru -NoNewWindow

try {
    Wait-ForUrl 'http://127.0.0.1:3000/api/health'
    Wait-ForUrl 'http://127.0.0.1:5173'

    Write-Host "`nDemo is ready." -ForegroundColor Green
    Write-Host '  Login:    http://localhost:5173/login'
    Write-Host '  Admin:    http://localhost:5173/admin/dashboard'
    Write-Host '  Password: password123 (all demo accounts)'
    Write-Host "`nPress Ctrl+C to stop backend and frontend.`n"

    while (-not $backendProcess.HasExited -and -not $frontendProcess.HasExited) {
        Start-Sleep -Seconds 2
    }
}
finally {
    if (-not $backendProcess.HasExited) {
        Stop-Process -Id $backendProcess.Id -Force -ErrorAction SilentlyContinue
    }
    if (-not $frontendProcess.HasExited) {
        Stop-Process -Id $frontendProcess.Id -Force -ErrorAction SilentlyContinue
    }
}