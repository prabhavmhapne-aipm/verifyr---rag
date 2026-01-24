@echo off
title Verifyr Status Check
echo.
echo ========================================
echo   VERIFYR STATUS CHECK
echo ========================================
echo.

echo [1] Checking Python processes...
echo.
tasklist /FI "IMAGENAME eq python.exe" 2>nul | find /I "python.exe" >nul
if %errorlevel%==0 (
    echo Python processes running:
    tasklist /FI "IMAGENAME eq python.exe"
) else (
    echo No Python processes running.
)

echo.
echo [2] Checking server health...
echo.
curl -s http://localhost:8000/health 2>nul
if %errorlevel%==0 (
    echo.
    echo Server is ONLINE!
) else (
    echo Server is OFFLINE or not reachable.
)

echo.
echo ========================================
echo.
pause
