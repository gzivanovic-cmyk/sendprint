@echo off
REM ============================================================================
REM SendPrint Bridge - eerste installatie
REM
REM Wat doet dit script?
REM   1. Controleert of Docker Desktop draait
REM   2. Controleert of .env.example al ingevuld is met de juiste image
REM   3. Vraagt eenmalig om een admin-wachtwoord en schrijft .env veilig
REM      weg via PowerShell (zodat tekens als & ! | ^ < > geen problemen geven)
REM   4. Trekt de laatste image van GHCR en start de containers
REM   5. Opent de browser op het dashboard
REM
REM Dubbelklik dit bestand om de bridge te installeren.
REM ============================================================================

setlocal
cd /d "%~dp0"

echo.
echo ============================================
echo  SendPrint Bridge - installatie
echo ============================================
echo.

REM --- Stap 1: Docker check -------------------------------------------------
echo [1/5] Controleren of Docker Desktop draait...
docker info >nul 2>&1
if errorlevel 1 (
    echo.
    echo FOUT: Docker Desktop draait niet of is niet geinstalleerd.
    echo.
    echo   Download Docker Desktop hier:
    echo   https://www.docker.com/products/docker-desktop/
    echo.
    echo   Start Docker Desktop, wacht tot het icoontje rechts onder
    echo   in de taakbalk groen wordt, en draai dit script opnieuw.
    echo.
    pause
    exit /b 1
)
echo       Docker draait. OK.

REM --- Stap 2: .env.example aanwezig? --------------------------------------
echo [2/5] Configuratie-template controleren...
if not exist .env.example (
    echo FOUT: .env.example ontbreekt in deze map. Pakket is incompleet.
    pause
    exit /b 1
)
echo       Template OK.

REM --- Stap 3: .env aanmaken als die er nog niet is ------------------------
if exist .env (
    echo [3/5] .env bestaat al, sla wachtwoord-vraag over.
) else (
    echo [3/5] Eenmalige configuratie.
    echo.
    REM Vraag het wachtwoord op via PowerShell. PowerShell parsed niet
    REM zoals cmd.exe, dus tekens als ^ ! ^& ^| ^< ^> geven geen problemen.
    REM Het wachtwoord wordt vervolgens door PowerShell zelf weggeschreven
    REM naar .env via een veilige string-replace - we passen het nooit via
    REM cmd-echo aan.
    powershell -NoProfile -ExecutionPolicy Bypass -Command ^
      "$pw = Read-Host -Prompt 'Kies een admin-wachtwoord voor het dashboard';" ^
      "if ([string]::IsNullOrWhiteSpace($pw)) { Write-Host 'FOUT: leeg wachtwoord is niet toegestaan.'; exit 1 };" ^
      "$tpl = Get-Content -Raw -LiteralPath '.env.example';" ^
      "$out = $tpl -replace '(?m)^ADMIN_PASSWORD=.*$', ('ADMIN_PASSWORD=' + $pw);" ^
      "[System.IO.File]::WriteAllText((Join-Path (Get-Location) '.env'), $out, (New-Object System.Text.UTF8Encoding $false));"
    if errorlevel 1 (
        echo FOUT bij aanmaken van .env.
        pause
        exit /b 1
    )
    echo       .env aangemaakt.
)

REM --- Stap 4: Image trekken + starten -------------------------------------
echo [4/5] Image ophalen en containers starten ^(kan eerste keer 1-2 min duren^)...
docker compose pull
if errorlevel 1 (
    echo FOUT bij ophalen van de image. Internetverbinding?
    pause
    exit /b 1
)
docker compose up -d
if errorlevel 1 (
    echo FOUT bij starten van de containers.
    pause
    exit /b 1
)
echo       Containers gestart.

REM --- Stap 5: Browser openen ----------------------------------------------
echo [5/5] Dashboard openen in browser...
timeout /t 3 /nobreak >nul

REM Lees de poort uit .env via PowerShell (cmd 'for /f' breekt op spaties /
REM regel-eindes; PowerShell is voorspelbaarder).
for /f "usebackq delims=" %%P in (`powershell -NoProfile -Command ^
    "$m = Select-String -Path .env -Pattern '^SENDPRINT_PORT=(.*)$';" ^
    "if ($m) { $m.Matches[0].Groups[1].Value.Trim() } else { '8080' }"`) do set PORT=%%P
if "%PORT%"=="" set PORT=8080
start "" "http://localhost:%PORT%"

echo.
echo ============================================
echo  KLAAR. Het dashboard is geopend.
echo ============================================
echo.
echo   - Log in met het wachtwoord dat je net hebt gekozen
echo   - Vul het IP-adres van de Zebra-printer in
echo   - Kopieer de API-key naar Promesse
echo.
echo   Zie Installatie.md voor de volgende stappen.
echo.
pause
