@echo off
REM Forceer een update naar de laatste versie.
REM Normaal gesproken doet Watchtower dit elke nacht om 03:00 automatisch.
REM Gebruik dit script alleen als je niet wilt wachten.
cd /d "%~dp0"

echo Nieuwste image ophalen...
docker compose pull
if errorlevel 1 (
    echo FOUT bij ophalen van de image. Internetverbinding?
    pause
    exit /b 1
)

echo Container herstarten met de nieuwe versie...
docker compose up -d
if errorlevel 1 (
    echo FOUT bij herstart.
    pause
    exit /b 1
)

echo Klaar. De bridge draait nu op de laatste versie.
pause
