@echo off
title Forma Digital - Instalador
color 0A

echo ==========================================
echo   Instalador de Forma Digital
echo ==========================================
echo.

:: Verificar prerrequisitos
echo [1/7] Verificando prerrequisitos...
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js no esta instalado
    echo Descargalo de: https://nodejs.org/
    pause
    exit /b 1
)

where python >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Python no esta instalado
    echo Descargalo de: https://www.python.org/downloads/
    pause
    exit /b 1
)

where docker >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Docker no esta instalado
    echo Descargalo de: https://www.docker.com/products/docker-desktop/
    pause
    exit /b 1
)

echo OK - Todos los prerrequisitos instalados
echo.

:: Iniciar Docker
echo [2/7] Iniciando Docker (base de datos)...
docker compose up -d
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: No se pudo iniciar Docker
    echo Asegurate de que Docker Desktop este corriendo
    pause
    exit /b 1
)
echo OK - Docker iniciado
echo.

:: Instalar dependencias del Backend
echo [3/7] Instalando dependencias del Backend...
pushd apps\backend
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Fallo la instalacion del Backend
    popd
    pause
    exit /b 1
)
popd
echo OK - Backend instalado
echo.

:: Crear archivo .env si no existe
echo [4/7] Configurando variables de entorno...
if not exist "apps\backend\.env" (
    copy "apps\backend\.env.example" "apps\backend\.env"
    echo NOTA: Archivo .env creado - pedile las API keys al lider del equipo
) else (
    echo OK - Archivo .env ya existe
)
echo.

:: Configurar base de datos
echo [5/7] Configurando base de datos...
pushd apps\backend
call npx prisma db push
call npx prisma db seed
popd
echo OK - Base de datos configurada
echo.

:: Instalar dependencias del Frontend
echo [6/7] Instalando dependencias del Frontend...
pushd apps\frontend
call npm install
popd
echo OK - Frontend instalado
echo.

:: Instalar Harv3st
echo [7/7] Instalando Harv3st (scraper)...
pushd services\harv3st
python -m venv venv
call venv\Scripts\activate.bat
pip install -r requirements.txt
playwright install chromium
call venv\Scripts\deactivate.bat
popd
echo OK - Harv3st instalado
echo.

echo ==========================================
echo   INSTALACION COMPLETADA!
echo ==========================================
echo.
echo Proximos pasos:
echo 1. Editar apps\backend\.env y agregar GEMINI_API_KEY
echo 2. Ejecutar: dev.bat
echo 3. Abrir: http://localhost:3001
echo.
pause
