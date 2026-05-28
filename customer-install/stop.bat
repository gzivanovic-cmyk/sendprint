@echo off
REM Stop de SendPrint Bridge tijdelijk. Data blijft bewaard.
REM Gebruik start.bat om weer aan te zetten.
cd /d "%~dp0"
docker compose stop
echo Bridge is gestopt.
pause
