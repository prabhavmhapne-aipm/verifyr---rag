@echo off
title Verifyr Server
cd /d "%~dp0.."
echo.
echo ========================================
echo   VERIFYR RAG SERVER
echo ========================================
echo.
echo Starting server on http://localhost:8000
echo Press Ctrl+C to stop
echo.
call venv\Scripts\python.exe -m uvicorn backend.main:app --host 0.0.0.0 --port 8000
pause
