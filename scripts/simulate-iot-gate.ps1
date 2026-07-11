#Requires -Version 5.1
<#
.SYNOPSIS
  Smart Parking IoT edge local simulation scenarios.

.EXAMPLE
  pwsh -File scripts/simulate-iot-gate.ps1

.EXAMPLE
  pwsh -File scripts/simulate-iot-gate.ps1 -Scenario 6
#>
[CmdletBinding()]
param(
    [ValidateRange(1, 10)]
    [int] $Scenario = 0
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$EdgeUrl = if ($env:EDGE_URL) { $env:EDGE_URL } else { 'http://127.0.0.1:3100' }
$ApiKey = if ($env:EDGE_LOCAL_API_KEY) { $env:EDGE_LOCAL_API_KEY } else { 'dev-edge-key' }
$OrgId = if ($env:ORGANIZATION_ID) { [int]$env:ORGANIZATION_ID } else { 1 }
$GateId = if ($env:GATE_ID) { [int]$env:GATE_ID } else { 1 }
$DeviceId = if ($env:EXTERNAL_DEVICE_ID) { $env:EXTERNAL_DEVICE_ID } else { 'edge-gw-demo-001' }
$TopicPrefix = if ($env:MQTT_TOPIC_PREFIX) { $env:MQTT_TOPIC_PREFIX } else { 'smart-parking' }
$TopicBase = "$TopicPrefix/$OrgId/$DeviceId"

function Invoke-VendorPost([string] $Path, [string] $BodyJson) {
    Invoke-RestMethod -Method Post -Uri "$EdgeUrl$Path" `
        -Headers @{ 'x-api-key' = $ApiKey } `
        -ContentType 'application/json' `
        -Body $BodyJson
}

function Publish-Command([string] $PayloadJson) {
    docker exec smart-parking-mosquitto mosquitto_pub `
        -h 127.0.0.1 -t "$TopicBase/commands" -m $PayloadJson
}

function Get-ScenarioScript([int] $Number) {
    switch ($Number) {
        1 {
            {
                Write-Host 'Scenario 1: GET /health'
                Invoke-RestMethod -Uri "$EdgeUrl/health"
            }
        }
        2 {
            {
                Write-Host 'Scenario 2: POST /vendor/anpr'
                Invoke-VendorPost '/vendor/anpr' '{"plate":"KA01AB1234","confidence":0.95,"capturedAt":"2026-07-11T10:00:00.000Z"}'
            }
        }
        3 {
            {
                Write-Host 'Scenario 3: POST /vendor/rfid'
                Invoke-VendorPost '/vendor/rfid' '{"tagId":"E20034120123456789012","readAt":"2026-07-11T10:01:00.000Z"}'
            }
        }
        4 {
            {
                Write-Host 'Scenario 4: POST /vendor/qr'
                Invoke-VendorPost '/vendor/qr' '{"code":"qr-token-demo-001","scannedAt":"2026-07-11T10:02:00.000Z"}'
            }
        }
        5 {
            {
                Write-Host 'Scenario 5: unauthorized vendor call (expect error)'
                try {
                    Invoke-RestMethod -Method Post -Uri "$EdgeUrl/vendor/anpr" -ContentType 'application/json' -Body '{"plate":"NOPE"}'
                }
                catch {
                    $_.Exception.Message
                }
            }
        }
        6 {
            {
                Write-Host 'Scenario 6: publish OPEN command'
                $cmdId = "sim-cmd-$([DateTimeOffset]::UtcNow.ToUnixTimeSeconds())"
                $requestedAt = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
                $expiresAt = (Get-Date).ToUniversalTime().AddSeconds(30).ToString('yyyy-MM-ddTHH:mm:ssZ')
                $payload = (@{
                    schemaVersion = 1
                    commandId = $cmdId
                    action = 'OPEN'
                    requestedAt = $requestedAt
                    expiresAt = $expiresAt
                } | ConvertTo-Json -Compress)
                Publish-Command $payload
                Write-Host "Published command $cmdId"
            }
        }
        7 {
            {
                Write-Host 'Scenario 7: duplicate commandId'
                $requestedAt = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
                $expiresAt = (Get-Date).ToUniversalTime().AddSeconds(30).ToString('yyyy-MM-ddTHH:mm:ssZ')
                $payload = (@{
                    schemaVersion = 1
                    commandId = 'sim-dup-cmd'
                    action = 'OPEN'
                    requestedAt = $requestedAt
                    expiresAt = $expiresAt
                } | ConvertTo-Json -Compress)
                Publish-Command $payload
                Publish-Command $payload
            }
        }
        8 {
            {
                Write-Host 'Scenario 8: expired command'
                $payload = (@{
                    schemaVersion = 1
                    commandId = "sim-expired-cmd-$([DateTimeOffset]::UtcNow.ToUnixTimeSeconds())"
                    action = 'OPEN'
                    requestedAt = '2026-07-11T09:00:00.000Z'
                    expiresAt = '2026-07-11T09:00:01.000Z'
                } | ConvertTo-Json -Compress)
                Publish-Command $payload
            }
        }
        9 {
            {
                Write-Host 'Scenario 9: observe status heartbeat topic'
                Write-Host "mosquitto_sub -h 127.0.0.1 -p 1883 -t '$TopicBase/heartbeat' -v"
            }
        }
        10 {
            {
                Write-Host 'Scenario 10: HTTP_RELAY failure path'
                Write-Host 'Restart edge with BARRIER_MODE=HTTP_RELAY and unreachable HTTP_RELAY_URL, then publish OPEN command.'
            }
        }
        default { throw "Unknown scenario: $Number" }
    }
}

if ($Scenario -eq 0) {
    1..10 | ForEach-Object {
        Write-Host ''
        (& (Get-ScenarioScript $_))
        Write-Host '----------------------------------------'
    }
}
else {
    & (Get-ScenarioScript $Scenario)
}