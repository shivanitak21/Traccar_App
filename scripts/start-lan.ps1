# Start Expo on the correct Wi-Fi IP (fixes wrong QR URL on Windows)
$ErrorActionPreference = "Stop"

$wifiIp = (
  Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
  Where-Object {
    $_.InterfaceAlias -match 'Wi-Fi|WLAN' -and
    $_.IPAddress -notlike '169.254.*' -and
    $_.IPAddress -notlike '127.*'
  } |
  Select-Object -First 1 -ExpandProperty IPAddress
)

if (-not $wifiIp) {
  $wifiIp = (
    Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object { $_.IPAddress -like '192.168.*' } |
    Select-Object -First 1 -ExpandProperty IPAddress
  )
}

if (-not $wifiIp) {
  Write-Host "Could not detect Wi-Fi IP. Run: ipconfig" -ForegroundColor Red
  exit 1
}

$env:REACT_NATIVE_PACKAGER_HOSTNAME = $wifiIp
$env:EXPO_NO_TELEMETRY = "1"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " PC Wi-Fi IP:  $wifiIp" -ForegroundColor Green
Write-Host " Manual URL:   exp://$wifiIp`:8081" -ForegroundColor Yellow
Write-Host " In Expo Go:   Enter URL manually if QR fails" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Set-Location (Split-Path $PSScriptRoot -Parent)
npx expo start --lan --clear @args
