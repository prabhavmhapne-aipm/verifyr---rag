@echo off
title Stop Verifyr Server
echo.
echo ========================================
echo   STOPPING VERIFYR SERVER
echo ========================================
echo.
echo Killing all Python processes...
taskkill /F /IM python.exe 2>nul
if %errorlevel%==0 (
    echo Server stopped successfully!
) else (
    echo No Python processes were running.
)
echo.
pause
