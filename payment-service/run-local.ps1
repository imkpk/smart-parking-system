# Load payment-service/.env and start Spring Boot (local PostgreSQL)
$envFile = Join-Path $PSScriptRoot '.env'
if (-not (Test-Path $envFile)) {
    throw "Missing $envFile - copy from env.example"
}

Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
        $name = $matches[1].Trim()
        $value = $matches[2].Trim().Trim('"')
        Set-Item -Path "env:$name" -Value $value
    }
}

Write-Host "DB_URL=$env:DB_URL"
Write-Host "DB_USERNAME=$env:DB_USERNAME"
Set-Location $PSScriptRoot
mvn spring-boot:run