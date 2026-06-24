param(
    [switch]$StartNgrok
)

$ErrorActionPreference = "Stop"

# Pfade
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$projectRoot = Join-Path $repoRoot "TestTranskription"
$projectFile = Join-Path $projectRoot "TestTranskription.csproj"
$publishDir  = Join-Path $projectRoot "bin\IisExpress"
$publishWwwroot = Join-Path $publishDir "wwwroot"

# IIS Express
$iisExeCandidates = @(
    "${env:ProgramFiles}\IIS Express\iisexpress.exe",
    "${env:ProgramFiles(x86)}\IIS Express\iisexpress.exe"
)
$iisExe = $iisExeCandidates | Where-Object { $_ -and (Test-Path -LiteralPath $_) } | Select-Object -First 1

$iisBaseConfigCandidates = @(
    "$env:USERPROFILE\Documents\IISExpress\config\applicationhost.config",
    "${env:ProgramFiles}\IIS Express\config\templates\PersonalWebServer\applicationhost.config",
    "${env:ProgramFiles(x86)}\IIS Express\config\templates\PersonalWebServer\applicationhost.config"
)
$iisBaseConfigSrc = $iisBaseConfigCandidates | Where-Object { $_ -and (Test-Path -LiteralPath $_) } | Select-Object -First 1
$workConfig  = Join-Path $publishDir "applicationhost.test.config"

# Ports fuer lokalen Smartphone-/PWA-Test mit IIS Express
$httpPort  = 5105
$httpsPort = 44372
$httpUrl   = "http://localhost:$httpPort"
$httpsUrl  = "https://localhost:$httpsPort"

# --- Voraussetzungen pruefen ---
if (-not (Get-Command dotnet -ErrorAction SilentlyContinue)) {
    Write-Host "dotnet CLI wurde nicht im PATH gefunden."
    Read-Host "Enter zum Beenden"
    exit 1
}
if (-not $iisExe) {
    Write-Host "IIS Express wurde nicht gefunden."
    Read-Host "Enter zum Beenden"
    exit 1
}
if (-not (Test-Path -LiteralPath $projectFile)) {
    Write-Host "Projektdatei wurde nicht gefunden: $projectFile"
    Read-Host "Enter zum Beenden"
    exit 1
}
if (-not $iisBaseConfigSrc) {
    Write-Host "Keine IIS-Express-Basiskonfiguration gefunden."
    Write-Host "Erwartet z.B.: $env:USERPROFILE\Documents\IISExpress\config\applicationhost.config"
    Read-Host "Enter zum Beenden"
    exit 1
}

# --- alte lokale Testprozesse beenden ---
Get-Process -Name "iisexpress" -ErrorAction SilentlyContinue | Stop-Process -Force
if ($StartNgrok) {
    Get-Process -Name "ngrok" -ErrorAction SilentlyContinue | Stop-Process -Force
}

# --- 1) Projekt veroeffentlichen ---
Write-Host "Veroeffentliche TestTranskription fuer IIS Express ..."
$publishArgs = @("publish", $projectFile, "-c", "Debug", "-o", $publishDir)
& dotnet @publishArgs
if ($LASTEXITCODE -ne 0) {
    Write-Host "Die Veroeffentlichung ist fehlgeschlagen (Exit $LASTEXITCODE)."
    Read-Host "Enter zum Beenden"
    exit 1
}
if (-not (Test-Path (Join-Path $publishWwwroot "index.html"))) {
    Write-Host "Der veroeffentlichte wwwroot-Ordner enthaelt keine index.html: $publishWwwroot"
    Read-Host "Enter zum Beenden"
    exit 1
}

# Lokale IP ermitteln, bevor URL-ACLs und Bindings erstellt werden.
$localIp = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notmatch 'Loopback|Virtual|Hyper-V|Docker|vEthernet' -and $_.PrefixOrigin -ne 'WellKnown' } | Select-Object -First 1).IPAddress
if (-not $localIp) { $localIp = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -like '192.*' -or $_.IPAddress -like '10.*' -or $_.IPAddress -like '172.*' } | Select-Object -First 1).IPAddress }
if (-not $localIp) { $localIp = "localhost" }

# --- 2) Arbeits-ApplicationHost.config vorbereiten ---
if (-not (Test-Path $publishDir)) { New-Item -ItemType Directory -Path $publishDir -Force | Out-Null }
Copy-Item -LiteralPath $iisBaseConfigSrc -Destination $workConfig -Force

[xml]$cfg = Get-Content $workConfig -Raw
$sites = $cfg.configuration.'system.applicationHost'.sites
# Alle vorhandenen Sites entfernen, nur TestTranskription wird neu angelegt
$sitesToRemove = $sites.site | Where-Object { $_.name -ne "TestTranskription" }
foreach ($s in $sitesToRemove) { [void]$sites.RemoveChild($s) }
$existing = $sites.site | Where-Object { $_.name -eq "TestTranskription" }
if ($existing) { [void]$sites.RemoveChild($existing) }

# --- 3) Netzwerkfreigabe versuchen (URL ACL + Firewall) ---
$isAdmin = ([System.Security.Principal.WindowsPrincipal][System.Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([System.Security.Principal.WindowsBuiltInRole]::Administrator)
$networkEnabled = $false

if ($isAdmin) {
    Write-Host "Richte Firewall fuer Netzwerkzugriff ein ..."
    $staleUrlAcls = @(
        "http://+:$httpPort/",
        "https://+:$httpsPort/"
    )
    if ($localIp -ne "localhost") {
        $staleUrlAcls += @(
            "http://${localIp}:$httpPort/",
            "https://${localIp}:$httpsPort/"
        )
    }

    # IIS Express registriert die URLs selbst. Starke URL-ACLs (+/IP) koennen
    # HTTP.sys vor IIS Express matchen lassen und dann 503 erzeugen.
    foreach ($acl in $staleUrlAcls) {
        netsh http delete urlacl url=$acl | Out-Null
    }

    $firewallRules = @(
        @{ Name = "TestTranskription-HTTP-$httpPort"; Port = $httpPort; Protocol = "TCP" },
        @{ Name = "TestTranskription-HTTPS-$httpsPort"; Port = $httpsPort; Protocol = "TCP" }
    )
    foreach ($rule in $firewallRules) {
        $existing = netsh advfirewall firewall show rule name=$($rule.Name) 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) {
            netsh advfirewall firewall add rule name=$($rule.Name) dir=in action=allow protocol=$($rule.Protocol) localport=$($rule.Port) | Out-Null
        }
    }

    $networkEnabled = $true
}
else {
    Write-Host "Hinweis: Nicht als Administrator gestartet - Netzwerkzugriff ist deaktiviert."
    Write-Host "Fuer LAN-Zugriff Skript als Administrator neu starten."
}

# --- 4) Site in ApplicationHost.config eintragen ---
$bindingDefinitions = @(
    @{ Protocol = "http"; Address = ""; Port = $httpPort; Host = "localhost" },
    @{ Protocol = "https"; Address = ""; Port = $httpsPort; Host = "localhost" }
)
if ($networkEnabled -and $localIp -ne "localhost") {
    $bindingDefinitions += @(
        @{ Protocol = "http"; Address = ""; Port = $httpPort; Host = $localIp },
        @{ Protocol = "https"; Address = ""; Port = $httpsPort; Host = $localIp }
    )
}

$site = $cfg.CreateElement("site")
$site.SetAttribute("name", "TestTranskription")
$site.SetAttribute("id", "2")
$app = $cfg.CreateElement("application")
$app.SetAttribute("path", "/")
$app.SetAttribute("applicationPool", "Clr4IntegratedAppPool")
$vd = $cfg.CreateElement("virtualDirectory")
$vd.SetAttribute("path", "/")
$vd.SetAttribute("physicalPath", $publishWwwroot)
[void]$app.AppendChild($vd)
[void]$site.AppendChild($app)
$bindings = $cfg.CreateElement("bindings")
foreach ($bindingDefinition in $bindingDefinitions) {
    $binding = $cfg.CreateElement("binding")
    $binding.SetAttribute("protocol", $bindingDefinition.Protocol)
    $binding.SetAttribute("bindingInformation", ("{0}:{1}:{2}" -f $bindingDefinition.Address, $bindingDefinition.Port, $bindingDefinition.Host))
    [void]$bindings.AppendChild($binding)
}
[void]$site.AppendChild($bindings)
[void]$sites.AppendChild($site)

$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($workConfig, $cfg.OuterXml, $utf8NoBom)

if ($networkEnabled) {
    Write-Host "Konfiguriert fuer lokalen und Netzwerkzugriff (Bindings: :${httpsPort}:localhost, :${httpsPort}:${localIp})."
}
else {
    Write-Host "Konfiguriert fuer lokalen Zugriff (Binding: :${httpsPort}:localhost)."
}

# --- 5) IIS Express starten ---
Write-Host "Starte IIS Express: $httpsUrl"
$iisArgs = @("/config:$workConfig", "/site:TestTranskription", "/systray:false")
$iisProcess = Start-Process -FilePath $iisExe -ArgumentList $iisArgs -PassThru
Start-Sleep -Seconds 2
if ($iisProcess.HasExited) {
    Write-Host "IIS Express wurde gestartet, aber sofort wieder beendet (Exit $($iisProcess.ExitCode))."
    Read-Host "Enter zum Beenden"
    exit 1
}

# --- 6) Warten bis HTTPS verfuegbar ist ---
Write-Host "Warte auf lokale Anwendung ..."
$deadline = (Get-Date).AddSeconds(120)
$appReady = $false

do {
    try {
        $response = Invoke-WebRequest -Uri $httpUrl -UseBasicParsing -TimeoutSec 2
        if ($response.StatusCode -lt 500) {
            $appReady = $true
            break
        }
    }
    catch {
        Start-Sleep -Seconds 1
    }
} while ((Get-Date) -lt $deadline)

if (-not $appReady) {
    Write-Host "Die lokale Anwendung war nach 120 Sekunden unter $httpUrl nicht erreichbar."
    Write-Host "Pruefe das geoeffnete IIS-Express-Fenster auf Startfehler."
    Write-Host "Hinweis: HTTPS-Ports muessen im Bereich 44300-44399 liegen (IIS-Express-Zertifikat)."
    Read-Host "Enter zum Beenden"
    exit 1
}

$networkHttpUrl  = "http://${localIp}:$httpPort"
$networkHttpsUrl = "https://${localIp}:$httpsPort"

Write-Host ""
Write-Host "Anwendung ist verfuegbar unter:"
Write-Host "  Lokal:  $httpUrl"
Write-Host "  Lokal:  $httpsUrl  - HTTPS, fuer Kameratests"
if ($localIp -ne "localhost" -and $networkEnabled) {
    Write-Host "  Netzwerk (alle Geraete im LAN):"
    Write-Host "    HTTP:   $networkHttpUrl"
    Write-Host "    HTTPS:  $networkHttpsUrl"
}
Write-Host ""

# --- 7) optionaler ngrok-Tunnel fuer externe Tests ---
if (-not $StartNgrok) {
    Write-Host "ngrok wird nicht gestartet. Fuer einen externen Tunnel optional mit -StartNgrok ausfuehren."
    Start-Process $httpsUrl
    Read-Host "Enter zum Beenden"
    exit 0
}

$ngrokHost = if ($networkEnabled -and $localIp -ne "localhost") { $localIp } else { "localhost" }
$ngrokCommand = Get-Command ngrok -ErrorAction SilentlyContinue
if (-not $ngrokCommand) {
    Write-Host "ngrok wurde nicht im PATH gefunden. Oeffne lokale Browser-Adresse."
    Start-Process $httpsUrl
    Write-Host "Fuer externe Tests installiere ngrok und starte diese Datei mit -StartNgrok erneut."
    Read-Host "Enter zum Beenden"
    exit 0
}

Write-Host "Starte ngrok-Tunnel fuer externe Tests ..."
Start-Process -FilePath "powershell.exe" -ArgumentList @(
    "-NoExit",
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-Command",
    "ngrok http https://${ngrokHost}:$httpsPort"
)

Write-Host "Warte auf oeffentliche HTTPS-Adresse von ngrok ..."
$deadline = (Get-Date).AddSeconds(30)
$publicUrl = $null

do {
    try {
        $tunnels = (Invoke-RestMethod -Uri "http://127.0.0.1:4040/api/tunnels" -TimeoutSec 2).tunnels
        $httpsTunnel = $tunnels | Where-Object { $_.proto -eq "https" } | Select-Object -First 1
        if ($httpsTunnel.public_url) {
            $publicUrl = $httpsTunnel.public_url
            break
        }
    }
    catch {
        Start-Sleep -Seconds 1
    }
} while ((Get-Date) -lt $deadline)

if ($publicUrl) {
    Write-Host "Oeffne $publicUrl im Browser."
    Start-Process $publicUrl
    Write-Host ""
    Write-Host "Externer Test: Oeffne diese Adresse:"
    Write-Host $publicUrl
}
else {
    Write-Host "ngrok wurde gestartet, aber die HTTPS-Adresse konnte nicht automatisch gelesen werden."
    Write-Host "Falls ngrok nach einem Authtoken fragt, fuehre einmalig aus:"
    Write-Host "ngrok config add-authtoken DEIN_TOKEN"
    Write-Host ""
    Write-Host "Oeffne http://127.0.0.1:4040 und kopiere dort die HTTPS-Adresse."
    Start-Process "http://127.0.0.1:4040"
    Start-Process $httpsUrl
}

Read-Host "Enter zum Beenden"
