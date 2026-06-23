param(
    [string]$OutputDir = (Join-Path (Split-Path $PSScriptRoot -Parent) "wwwroot\models")
)

$ModelName = "vosk-model-small-de-0.15"
$ZipUrl = "https://archive.org/download/vosk-models-small/$ModelName.zip"
$TempZip = Join-Path $env:TEMP "$ModelName.zip"
$TempExtract = Join-Path $env:TEMP "$ModelName-extract"

Write-Host "=== Vosk-Modell-Download ===" -ForegroundColor Cyan
Write-Host "Modell : $ModelName"
Write-Host "Ziel   : $OutputDir"
Write-Host ""

# Zielverzeichnis erstellen
New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null

# Prüfen ob Modell bereits existiert
$TargetFile = Join-Path $OutputDir "model.tar.gz"
if (Test-Path -LiteralPath $TargetFile) {
    $size = (Get-Item -LiteralPath $TargetFile).Length
    Write-Host "Modell existiert bereits ($([math]::Round($size/1MB, 1)) MB)" -ForegroundColor Green
    Write-Host "Loeschen und neu laden? Loeschen Sie einfach $TargetFile"
    exit 0
}

# ZIP herunterladen
Write-Host "Download von $ZipUrl ..." -ForegroundColor Yellow
try {
    Invoke-WebRequest -Uri $ZipUrl -OutFile $TempZip -UseBasicParsing -ErrorAction Stop
    $zipSize = (Get-Item -LiteralPath $TempZip).Length
    Write-Host "Download abgeschlossen ($([math]::Round($zipSize/1MB, 1)) MB)" -ForegroundColor Green
}
catch {
    Write-Host "FEHLER: Download fehlgeschlagen: $_" -ForegroundColor Red
    exit 1
}

# Entpacken
Write-Host "Entpacke ZIP ..." -ForegroundColor Yellow
Remove-Item -LiteralPath $TempExtract -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Path $TempExtract -Force | Out-Null
tar -xf $TempZip -C $TempExtract 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "FEHLER: Entpacken fehlgeschlagen" -ForegroundColor Red
    exit 1
}

# Als tar.gz packen (Format, das vosk-browser erwartet)
Write-Host "Erstelle model.tar.gz ..." -ForegroundColor Yellow
tar -czf $TargetFile -C $TempExtract $ModelName 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "FEHLER: Packen fehlgeschlagen" -ForegroundColor Red
    exit 1
}

$finalSize = (Get-Item -LiteralPath $TargetFile).Length
Write-Host "Modell erfolgreich erstellt: $([math]::Round($finalSize/1MB, 1)) MB" -ForegroundColor Green
Write-Host "  $TargetFile"

# Aufräumen
Remove-Item -LiteralPath $TempZip -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $TempExtract -Recurse -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "=== Fertig ===" -ForegroundColor Cyan
