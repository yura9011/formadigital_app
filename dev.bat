@echo off
title Forma Digital Launcher

echo ==========================================
echo   Starting Forma Digital App (Dev Mode)
echo ==========================================

echo.
echo 1. Launching Backend (NestJS) on Port 3000...
start "Forma Digital - Backend" cmd /k "cd apps\backend && npm run start:dev"

echo.
echo 2. Launching Frontend (Next.js) on Port 3001...
start "Forma Digital - Frontend" cmd /k "cd apps\frontend && npm run dev -- -H 0.0.0.0 -p 3001"

echo.
echo ==========================================
echo   Servers are starting up!
echo   Local:    http://localhost:3001
echo   Network:  http://192.168.0.3:3001
echo ==========================================
pause
