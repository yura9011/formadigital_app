@echo off
echo ============================================
echo   EJECUTANDO PROSPECTING TOOL
echo ============================================
echo.

cd /d "%~dp0"

:: Verificar dependencias criticas rapido
pip install playwright pandas requests -q

echo Iniciando agente...
python main_orchestrator.py

echo.
if errorlevel 1 (
    echo [ERROR] Algo salio mal. Revisa los logs.
) else (
    echo [OK] Proceso finalizado correctamente.
)
pause
