param(
    [string]$RuntimeArchiveUrl = "https://github.com/k2-fsa/sherpa-onnx/releases/download/v1.13.2/sherpa-onnx-wasm-simd-1.13.2-vad-asr-en-whisper_tiny.tar.bz2",
    [string]$ModelArchiveUrl = "https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-whisper-tiny.tar.bz2",
    [switch]$Force
)

$ErrorActionPreference = "Stop"

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$wwwroot = Join-Path $projectRoot "wwwroot"
$jsDir = Join-Path $wwwroot "js"
$tempDir = Join-Path $projectRoot "bin\sherpa-assets"
$runtimeArchivePath = Join-Path $tempDir "sherpa-vad-asr-runtime.tar.bz2"
$modelArchivePath = Join-Path $tempDir "sherpa-whisper-tiny.tar.bz2"
$runtimeExtractDir = Join-Path $tempDir "runtime"
$modelExtractDir = Join-Path $tempDir "model"
$assetVersion = "whisper-tiny-multilingual-de-v1"
$assetVersionPath = Join-Path $jsDir "sherpa-assets.version.txt"
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

function Find-RequiredFile {
    param(
        [Parameter(Mandatory=$true)] [string]$Name,
        [Parameter(Mandatory=$true)] [string]$SourceRoot
    )

    $file = Get-ChildItem -LiteralPath $SourceRoot -Recurse -File -Filter $Name | Select-Object -First 1
    if (-not $file) {
        throw "Datei fehlt im Archiv: $Name"
    }

    return $file.FullName
}

function Extract-DataPackageFile {
    param(
        [Parameter(Mandatory=$true)] [string]$RuntimeJsPath,
        [Parameter(Mandatory=$true)] [string]$DataPath,
        [Parameter(Mandatory=$true)] [string]$VirtualName,
        [Parameter(Mandatory=$true)] [string]$DestinationPath
    )

    $runtimeJs = [System.IO.File]::ReadAllText($RuntimeJsPath, [System.Text.Encoding]::UTF8)
    $escapedName = [System.Text.RegularExpressions.Regex]::Escape($VirtualName)
    $match = [System.Text.RegularExpressions.Regex]::Match($runtimeJs, 'filename:"' + $escapedName + '",start:(\d+),end:(\d+)')
    if (-not $match.Success) {
        $match = [System.Text.RegularExpressions.Regex]::Match($runtimeJs, '"filename":"' + $escapedName + '","start":(\d+),"end":(\d+)')
    }
    if (-not $match.Success) {
        throw "Metadaten fuer $VirtualName wurden nicht in $RuntimeJsPath gefunden."
    }

    $start = [long]$match.Groups[1].Value
    $end = [long]$match.Groups[2].Value
    $remaining = $end - $start
    $buffer = [byte[]]::new(1024 * 1024)
    $input = [System.IO.File]::OpenRead($DataPath)
    $output = [System.IO.File]::Create($DestinationPath)
    try {
        $input.Seek($start, [System.IO.SeekOrigin]::Begin) | Out-Null
        while ($remaining -gt 0) {
            $readSize = [int][System.Math]::Min($buffer.Length, $remaining)
            $read = $input.Read($buffer, 0, $readSize)
            if ($read -le 0) {
                throw "Unerwartetes Ende beim Extrahieren von $VirtualName."
            }

            $output.Write($buffer, 0, $read)
            $remaining -= $read
        }
    }
    finally {
        $output.Dispose()
        $input.Dispose()
    }
}

function Add-DataPackageFile {
    param(
        [Parameter(Mandatory=$true)] [System.IO.FileStream]$Output,
        [Parameter(Mandatory=$true)] [string]$VirtualName,
        [Parameter(Mandatory=$true)] [string]$SourcePath
    )

    $start = $Output.Position
    $input = [System.IO.File]::OpenRead($SourcePath)
    try {
        $input.CopyTo($Output)
    }
    finally {
        $input.Dispose()
    }

    return [PSCustomObject]@{
        Filename = $VirtualName
        Start = $start
        End = $Output.Position
    }
}

function Write-WhisperDataPackage {
    param(
        [Parameter(Mandatory=$true)] [string]$RuntimeJsPath,
        [Parameter(Mandatory=$true)] [string]$RuntimeDataPath,
        [Parameter(Mandatory=$true)] [string]$ModelRoot,
        [Parameter(Mandatory=$true)] [string]$TargetDataPath,
        [Parameter(Mandatory=$true)] [string]$TargetRuntimeJsPath
    )

    $sileroPath = Join-Path $tempDir "silero_vad.onnx"
    Extract-DataPackageFile -RuntimeJsPath $RuntimeJsPath -DataPath $RuntimeDataPath -VirtualName "/silero_vad.onnx" -DestinationPath $sileroPath

    $encoderPath = Find-RequiredFile -Name "tiny-encoder.int8.onnx" -SourceRoot $ModelRoot
    $decoderPath = Find-RequiredFile -Name "tiny-decoder.int8.onnx" -SourceRoot $ModelRoot
    $tokensPath = Find-RequiredFile -Name "tiny-tokens.txt" -SourceRoot $ModelRoot

    $entries = @()
    $output = [System.IO.File]::Create($TargetDataPath)
    try {
        $entries += Add-DataPackageFile -Output $output -VirtualName "/whisper-encoder.onnx" -SourcePath $encoderPath
        $entries += Add-DataPackageFile -Output $output -VirtualName "/whisper-decoder.onnx" -SourcePath $decoderPath
        $entries += Add-DataPackageFile -Output $output -VirtualName "/silero_vad.onnx" -SourcePath $sileroPath
        $entries += Add-DataPackageFile -Output $output -VirtualName "/tokens.txt" -SourcePath $tokensPath
        $packageSize = $output.Position
    }
    finally {
        $output.Dispose()
    }

    $fileMetadata = ($entries | ForEach-Object { '{filename:"' + $_.Filename + '",start:' + $_.Start + ',end:' + $_.End + '}' }) -join ','
    $replacement = 'loadPackage({files:[' + $fileMetadata + '],remote_package_size:' + $packageSize + '})'
    $runtimeJs = [System.IO.File]::ReadAllText($TargetRuntimeJsPath, [System.Text.Encoding]::UTF8)
    $regex = [System.Text.RegularExpressions.Regex]::new('loadPackage\(\{files:\[.*?\],remote_package_size:\d+\}\)|loadPackage\(\{"files":\[.*?\],"remote_package_size":\d+\}\)')
    $patchedRuntimeJs = $regex.Replace($runtimeJs, $replacement, 1)
    if ($patchedRuntimeJs -eq $runtimeJs) {
        throw "Sherpa-Runtime-Metadaten konnten nicht aktualisiert werden."
    }

    [System.IO.File]::WriteAllText($TargetRuntimeJsPath, $patchedRuntimeJs, [System.Text.UTF8Encoding]::new($false))
}

New-Item -ItemType Directory -Path $jsDir -Force | Out-Null

$missingAssets = @($requiredAssets | Where-Object { -not (Test-Path -LiteralPath (Join-Path $jsDir $_)) })
$currentAssetVersion = if (Test-Path -LiteralPath $assetVersionPath) { (Get-Content -LiteralPath $assetVersionPath -Raw).Trim() } else { "" }
if (-not $Force -and $missingAssets.Count -eq 0 -and $currentAssetVersion -eq $assetVersion) {
    Write-Host "Sherpa-ONNX Assets sind bereits bereit in: $jsDir"
    exit 0
}

Ensure-Command "tar"
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

foreach ($dir in @($runtimeExtractDir, $modelExtractDir)) {
    if (Test-Path -LiteralPath $dir) {
        Remove-Item -LiteralPath $dir -Recurse -Force
    }

    New-Item -ItemType Directory -Path $dir -Force | Out-Null
}

Write-Host "Lade Sherpa-ONNX VAD+ASR Runtime: $RuntimeArchiveUrl"
Invoke-WebRequest -Uri $RuntimeArchiveUrl -OutFile $runtimeArchivePath

Write-Host "Lade Sherpa-ONNX Whisper Tiny multilingual Modell: $ModelArchiveUrl"
Invoke-WebRequest -Uri $ModelArchiveUrl -OutFile $modelArchivePath

Write-Host "Entpacke Sherpa-ONNX Pakete ..."
tar -xf $runtimeArchivePath -C $runtimeExtractDir
tar -xf $modelArchivePath -C $modelExtractDir

foreach ($asset in $requiredAssets) {
    Copy-RequiredAsset -Name $asset -SourceRoot $runtimeExtractDir -TargetRoot $jsDir
}

$runtimeJsPath = Join-Path $jsDir "sherpa-onnx-wasm-main-vad-asr.js"
$runtimeDataPath = Find-RequiredFile -Name "sherpa-onnx-wasm-main-vad-asr.data" -SourceRoot $runtimeExtractDir
$targetDataPath = Join-Path $jsDir "sherpa-onnx-wasm-main-vad-asr.data"
Write-Host "Erzeuge deutschfaehiges Whisper Tiny Datenpaket ..."
Write-WhisperDataPackage -RuntimeJsPath $runtimeJsPath -RuntimeDataPath $runtimeDataPath -ModelRoot $modelExtractDir -TargetDataPath $targetDataPath -TargetRuntimeJsPath $runtimeJsPath
[System.IO.File]::WriteAllText($assetVersionPath, $assetVersion, [System.Text.UTF8Encoding]::new($false))

Write-Host "Sherpa-ONNX Assets sind bereit in: $jsDir"
Get-ChildItem -LiteralPath $jsDir -File | Where-Object { $_.Name -like "sherpa-onnx-*" } | ForEach-Object {
    Write-Host ("  {0} ({1:N1} MB)" -f $_.Name, ($_.Length / 1MB))
}
