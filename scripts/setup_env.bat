@echo off
echo ============================================
echo   PROSPECTING ENVIRONMENT SETUP
echo ============================================
echo.

:: 1. Instalar Python (si no existe)
python --version >nul 2>&1
if errorlevel 1 (
    echo [1/4] Instalando Python (descargando installer)...
    winget install -e --id Python.Python.3.11
    if errorlevel 1 (
        echo [ERROR] Fallo la instalacion de Python. Instala manualmente desde python.org
        pause
        exit /b 1
    )
    :: Refrescar variables de entorno
    refreshenv
) else (
    echo [1/4] Python ya instalado.
)

:: 2. Instalar Ollama (si no existe)
where ollama >nul 2>&1
if errorlevel 1 (
    echo [2/4] Instalando Ollama...
    winget install -e --id Ollama.Ollama
    if errorlevel 1 (
        echo [ERROR] Fallo la instalacion de Ollama. Instala manualmente desde ollama.com
        pause
        exit /b 1
    )
) else (
    echo [2/4] Ollama ya instalado.
)

:: 3. Descargar Modelo Llama 3.2
echo [3/4] Verificando/Descargando modelo 'llama3.2'...
ollama pull llama3.2

:: 4. Instalar librerias Python
echo [4/4] Instalando librerias de Python...
pip install playwright pandas requests browser-use langchain-ollama python-dotenv
python -m playwright install chromium

echo.
echo ============================================
echo   ¡SETUP COMPLETADO!
echo   Ahora ejecuta 'run_prospecting.bat'
echo ============================================
pause
