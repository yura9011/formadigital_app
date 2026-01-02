@echo off
SETLOCAL EnableDelayedExpansion

:: --- CONFIGURATION ---
SET PORT=5050
SET DASHBOARD_URL=http://localhost:!PORT!
SET SCRIPT_DIR=%~dp0
cd /d "!SCRIPT_DIR!"

TITLE Harv3st - Lead Harvester

echo =======================================================
echo              Harv3st - Lead Generation Tool
echo =======================================================
echo.

:: 1. Check Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in your PATH.
    echo Please install Python and try again.
    pause
    exit /b
)

:: 2. Check Dependencies
echo [1/3] Checking dependencies (pip install)...
pip install -r requirements.txt --quiet
if %errorlevel% neq 0 (
    echo [WARNING] There was an issue installing dependencies. 
    echo Trying to continue anyway...
)

:: 3. Launch Dashboard in Browser
echo [2/3] Opening Dashboard in your browser...
start !DASHBOARD_URL!

:: 4. Start Server
echo [3/3] Launching Backend Server...
echo.
echo -------------------------------------------------------
echo  SERVER RUNNING ON: !DASHBOARD_URL!
echo  (Keep this window open while using the dashboard)
echo -------------------------------------------------------
echo.

python manager.py server

if %errorlevel% neq 0 (
    echo.
    echo [CRITICAL] The server stopped unexpectedly.
    pause
)

ENDLOCAL
