# Android USB fallback: forwards phone port 8081 to PC (works even if LAN QR fails)
$ErrorActionPreference = "Stop"

$adb = Get-Command adb -ErrorAction SilentlyContinue
if (-not $adb) {
  Write-Host "adb not found. Install Android Platform Tools or connect phone with USB debugging." -ForegroundColor Red
  exit 1
}

adb reverse tcp:8081 tcp:8081
if ($LASTEXITCODE -ne 0) {
  Write-Host "adb reverse failed. Enable USB debugging and accept the RSA prompt on phone." -ForegroundColor Red
  exit 1
}

Write-Host ""
Write-Host "USB port forward active." -ForegroundColor Green
Write-Host "Open Expo Go and use: exp://127.0.0.1:8081" -ForegroundColor Yellow
Write-Host ""

$env:EXPO_NO_TELEMETRY = "1"
Set-Location (Split-Path $PSScriptRoot -Parent)
npx expo start --localhost --clear @args
