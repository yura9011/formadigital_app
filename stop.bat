@echo off
title Forma Digital - Stop All Services

echo ==========================================
echo   Stopping Forma Digital Services
echo ==========================================

echo.
echo Stopping Node.js processes (Backend & Frontend)...
taskkill /F /IM node.exe /T 2>nul
if %errorlevel%==0 (
    echo   [OK] Node.js processes stopped
) else (
    echo   [--] No Node.js processes found
)

echo.
echo Stopping Python processes (Harv3st)...
taskkill /F /IM python.exe /T 2>nul
if %errorlevel%==0 (
    echo   [OK] Python processes stopped
) else (
    echo   [--] No Python processes found
)

echo.
echo ==========================================
echo   All services stopped!
echo ==========================================
pause
