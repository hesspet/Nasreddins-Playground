param(
    [string]$ArchiveUrl = "https://github.com/k2-fsa/sherpa-onnx/releases/download/v1.12.15/sherpa-onnx-wasm-simd-1.12.15-vad-asr-multi_lang-dolphin_ctc.tar.bz2",
    [switch]$Force
)

$ErrorActionPreference = "Stop"

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$wwwroot = Join-Path $projectRoot "wwwroot"
$jsDir = Join-Path $wwwroot "js"
$tempDir = Join-Path $projectRoot "bin\sherpa-assets"
$archivePath = Join-Path $tempDir "sherpa-vad-asr.tar.bz2"
$extractDir = Join-Path $tempDir "extract"
$requiredAssets = @(
    "sherpa-onnx-asr.js",
    "sherpa-onnx-vad.js",
    "sherpa-onnx-wasm-main-vad-asr.js",
    "sherpa-onnx-wasm-main-vad-asr.wasm",
    "sherpa-onnx-wasm-main-vad-asr.data"
)

function Ensure-Command {
    param([string]$Name)

    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "$Name wurde nicht im PATH gefunden."
    }
}

function Copy-RequiredAsset {
    param(
        [Parameter(Mandatory=$true)] [string]$Name,
        [Parameter(Mandatory=$true)] [string]$SourceRoot,
        [Parameter(Mandatory=$true)] [string]$TargetRoot
    )

    $source = Get-ChildItem -LiteralPath $SourceRoot -Recurse -File -Filter $Name | Select-Object -First 1
    if (-not $source) {
        throw "Sherpa-Asset fehlt im Archiv: $Name"
    }

    Copy-Item -LiteralPath $source.FullName -Destination (Join-Path $TargetRoot $Name) -Force
}

New-Item -ItemType Directory -Path $jsDir -Force | Out-Null

$missingAssets = @($requiredAssets | Where-Object { -not (Test-Path -LiteralPath (Join-Path $jsDir $_)) })
if (-not $Force -and $missingAssets.Count -eq 0) {
    Write-Host "Sherpa-ONNX Assets sind bereits bereit in: $jsDir"
    exit 0
}

Ensure-Command "tar"
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

if (Test-Path -LiteralPath $extractDir) {
    Remove-Item -LiteralPath $extractDir -Recurse -Force
}
New-Item -ItemType Directory -Path $extractDir -Force | Out-Null

Write-Host "Lade Sherpa-ONNX VAD+ASR Paket: $ArchiveUrl"
Invoke-WebRequest -Uri $ArchiveUrl -OutFile $archivePath

Write-Host "Entpacke Sherpa-ONNX VAD+ASR Paket ..."
tar -xf $archivePath -C $extractDir

foreach ($asset in $requiredAssets) {
    Copy-RequiredAsset -Name $asset -SourceRoot $extractDir -TargetRoot $jsDir
}

Write-Host "Sherpa-ONNX Assets sind bereit in: $jsDir"
Get-ChildItem -LiteralPath $jsDir -File | Where-Object { $_.Name -like "sherpa-onnx-*" } | ForEach-Object {
    Write-Host ("  {0} ({1:N1} MB)" -f $_.Name, ($_.Length / 1MB))
}
