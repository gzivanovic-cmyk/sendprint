@echo off
REM Start de SendPrint Bridge handmatig (na een reboot start hij normaal
REM gesproken vanzelf dankzij 'restart: unless-stopped').
cd /d "%~dp0"
docker compose up -d
if errorlevel 1 (
    echo Kon de bridge niet starten. Draait Docker Desktop?
    pause
    exit /b 1
)
echo Bridge is gestart.
pause
