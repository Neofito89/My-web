$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path $PSScriptRoot -Parent
$DistPath = Join-Path $ProjectRoot "dist"
$DeployScript = Join-Path $PSScriptRoot "deploy.ps1"

if (-not (Test-Path $DistPath)) {
    Write-Error "No existe la carpeta dist: $DistPath"
    exit 1
}

Write-Host ""
Write-Host "Watching: $DistPath" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop." -ForegroundColor DarkGray
Write-Host ""

$Watcher = New-Object System.IO.FileSystemWatcher
$Watcher.Path = $DistPath
$Watcher.Filter = "*"
$Watcher.IncludeSubdirectories = $true
$Watcher.EnableRaisingEvents = $true

$LastDeploy = [datetime]::MinValue

$Action = {
    $Now = Get-Date

    # Evita varios deploys provocados por una misma escritura
    if (($Now - $script:LastDeploy).TotalSeconds -lt 2) {
        return
    }

    $script:LastDeploy = $Now

    Write-Host ""
    Write-Host "Change detected: $($Event.SourceEventArgs.Name)" -ForegroundColor Yellow
    Write-Host "Deploying..." -ForegroundColor Cyan

    try {
        & $DeployScript

        if ($LASTEXITCODE -eq 0) {
            Write-Host "Deploy completed." -ForegroundColor Green
        }
    }
    catch {
        Write-Host "Deploy failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Register-ObjectEvent -InputObject $Watcher -EventName Changed -Action $Action | Out-Null
Register-ObjectEvent -InputObject $Watcher -EventName Created -Action $Action | Out-Null
Register-ObjectEvent -InputObject $Watcher -EventName Deleted -Action $Action | Out-Null
Register-ObjectEvent -InputObject $Watcher -EventName Renamed -Action $Action | Out-Null

try {
    while ($true) {
        Wait-Event -Timeout 1 | Out-Null
    }
}
finally {
    $Watcher.EnableRaisingEvents = $false
    $Watcher.Dispose()

    Get-EventSubscriber | Unregister-Event
}