@echo off
title Forma Digital Launcher

echo ==========================================
echo   Starting Forma Digital App (Dev Mode)
echo ==========================================

echo.
echo 1. Launching Harv3st (Python) on Port 5050...
start "Forma Digital - Harv3st" cmd /k "cd services\harv3st && python manager.py server"

echo.
echo 2. Launching Backend (NestJS) on Port 3000...
start "Forma Digital - Backend" cmd /k "cd apps\backend && npm run start:dev"

echo.
echo 3. Launching Frontend (Next.js) on Port 3001...
start "Forma Digital - Frontend" cmd /k "cd apps\frontend && npm run dev -- -H 0.0.0.0 -p 3001"

echo.
echo ==========================================
echo   Servers are starting up!
echo   Frontend:  http://localhost:3001
echo   Backend:   http://localhost:3000
echo   Harv3st:   http://localhost:5050
echo ==========================================
pause
