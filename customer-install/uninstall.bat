@echo off
REM ============================================================================
REM SendPrint Bridge - de-installatie
REM
REM Dit verwijdert de containers en images.
REM De DATA (printer-config, API-key, log-historie) BLIJFT staan in een
REM Docker-volume genaamd "sendprint-data". Zie onderaan hoe je die wist.
REM ============================================================================

cd /d "%~dp0"

echo.
echo Containers stoppen en verwijderen...
docker compose down --rmi all

echo.
echo ============================================
echo  Bridge is verwijderd.
echo ============================================
echo.
echo  LET OP: de data (database, configuratie, logs) staat nog in
echo  een Docker-volume. Wil je die OOK weggooien? Voer dit handmatig uit:
echo.
echo     docker volume rm sendprint-data
echo.
echo  Dat is onomkeerbaar - alle print-historie is dan weg.
echo.
pause
