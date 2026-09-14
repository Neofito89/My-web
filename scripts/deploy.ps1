$ErrorActionPreference = "Stop"

$HostName = "www547.your-server.de"
$UserName = "sergiou"
$RemotePath = "/public_html/sergioalegre/"

$ProjectRoot = Split-Path $PSScriptRoot -Parent
$DistPath = Join-Path $ProjectRoot "dist"

if (-not (Test-Path $DistPath)) {
    Write-Error "No existe la carpeta dist: $DistPath"
    exit 1
}

Write-Host ""
Write-Host "Deploying dist to $HostName..." -ForegroundColor Cyan
Write-Host ""

scp -r "$DistPath\." "${UserName}@${HostName}:${RemotePath}"

if ($LASTEXITCODE -ne 0) {
    Write-Error "Deploy failed."
    exit $LASTEXITCODE
}

Write-Host ""
Write-Host "Deploy completed." -ForegroundColor Green