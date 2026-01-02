# 🚀 Guía de Instalación - Forma Digital App

Esta guía te ayudará a instalar y configurar la aplicación Forma Digital en tu computadora desde cero.

**Tiempo estimado:** 30-45 minutos

---

## 📋 Índice

0. [Antes de Empezar (Prerrequisitos)](#0-antes-de-empezar-prerrequisitos)
1. [Clonar el Repositorio](#1-clonar-el-repositorio)
2. [Abrir en Kiro](#2-abrir-en-kiro)
3. [Configurar Variables de Entorno](#3-configurar-variables-de-entorno)
4. [Levantar Docker (Base de Datos)](#4-levantar-docker-base-de-datos)
5. [Configurar Backend](#5-configurar-backend)
6. [Configurar Frontend](#6-configurar-frontend)
7. [Configurar Harv3st](#7-configurar-harv3st)
8. [Iniciar la Aplicación](#8-iniciar-la-aplicación)
9. [Verificar Instalación](#9-verificar-instalación)
10. [Sobre Kiro y los Steering Files](#10-sobre-kiro-y-los-steering-files)
11. [Troubleshooting](#11-troubleshooting)

---

## 0. Antes de Empezar (Prerrequisitos)

Necesitás instalar estos 4 programas antes de continuar:

### 📦 Git

Git es el sistema de control de versiones que usamos para el código.

1. Descargá Git desde: https://git-scm.com/download/win
2. Ejecutá el instalador
3. Dejá todas las opciones por defecto y hacé click en "Next" hasta terminar
4. **Verificá la instalación** abriendo PowerShell y ejecutando:
   ```powershell
   git --version
   ```
   Deberías ver algo como: `git version 2.43.0`

### 📦 Node.js

Node.js es el entorno de ejecución para el Backend y Frontend.

1. Descargá Node.js **LTS** desde: https://nodejs.org/
2. Ejecutá el instalador
3. **IMPORTANTE:** Marcá la opción "Automatically install the necessary tools" si aparece
4. Dejá las demás opciones por defecto
5. **Verificá la instalación** abriendo PowerShell y ejecutando:
   ```powershell
   node --version
   npm --version
   ```
   Deberías ver algo como: `v20.11.0` y `10.2.4`

### 📦 Python

Python es necesario para el servicio Harv3st (scraper de Google Maps).

1. Descargá Python desde: https://www.python.org/downloads/
2. Ejecutá el instalador
3. **MUY IMPORTANTE:** Marcá la casilla **"Add Python to PATH"** antes de instalar
4. Click en "Install Now"
5. **Verificá la instalación** abriendo PowerShell y ejecutando:
   ```powershell
   python --version
   pip --version
   ```
   Deberías ver algo como: `Python 3.12.0` y `pip 23.3.1`

### 📦 Docker Desktop

Docker es necesario para correr la base de datos PostgreSQL y Redis.

1. Descargá Docker Desktop desde: https://www.docker.com/products/docker-desktop/
2. Ejecutá el instalador
3. Cuando termine, **reiniciá tu computadora**
4. Después de reiniciar, abrí Docker Desktop y esperá a que inicie completamente
5. **Verificá la instalación** abriendo PowerShell y ejecutando:
   ```powershell
   docker --version
   docker compose version
   ```
   Deberías ver algo como: `Docker version 24.0.7` y `Docker Compose version v2.23.3`

> ⚠️ **Nota:** Docker Desktop debe estar corriendo (icono en la barra de tareas) cada vez que trabajes con la aplicación.

---

## 1. Clonar el Repositorio

Abrí PowerShell y ejecutá:

```powershell
# Navegá a la carpeta donde querés guardar el proyecto
cd C:\Users\TU_USUARIO\Documents

# Cloná el repositorio (pedile la URL exacta al líder del equipo)
git clone https://github.com/FormaDigital/forma-digital-app.git

# Entrá a la carpeta del proyecto
cd forma-digital-app
```

### Estructura del Proyecto

```
forma-digital-app/
├── apps/
│   ├── backend/        # API NestJS (Puerto 3000)
│   └── frontend/       # Interfaz Next.js (Puerto 3001)
├── services/
│   └── harv3st/        # Scraper de Google Maps (Puerto 5050)
├── scripts/            # Scripts de Python para IA
├── .kiro/              # Configuración de Kiro (steering files)
├── dev.bat             # Script para iniciar todo
├── stop.bat            # Script para detener todo
└── docker-compose.yml  # Configuración de Docker
```

---

## 2. Abrir en Kiro

1. Abrí Kiro
2. Hacé click en **File > Open Folder**
3. Navegá hasta la carpeta `forma-digital-app` y seleccionala
4. Kiro va a cargar el proyecto y los steering files automáticamente

---

## 3. Configurar Variables de Entorno

Las variables de entorno contienen configuraciones sensibles (contraseñas, API keys).

### Backend

```powershell
# Desde la raíz del proyecto
cd apps/backend

# Copiá el archivo de ejemplo
copy .env.example .env
```

Ahora abrí el archivo `apps/backend/.env` y **pedile al líder del equipo** los valores para:
- `GEMINI_API_KEY` - API key de Google Gemini

Los demás valores ya vienen configurados para desarrollo local.

---

## 4. Levantar Docker (Base de Datos)

Docker va a crear los contenedores de PostgreSQL (base de datos) y Redis (cache).

1. **Asegurate de que Docker Desktop esté corriendo** (icono en la barra de tareas)

2. Desde la raíz del proyecto, ejecutá:
   ```powershell
   docker compose up -d
   ```

3. Esperá unos segundos y verificá que los contenedores estén corriendo:
   ```powershell
   docker ps
   ```
   
   Deberías ver algo como:
   ```
   CONTAINER ID   IMAGE         STATUS         PORTS                    NAMES
   abc123...      postgres:15   Up 2 minutes   0.0.0.0:5432->5432/tcp   forma-digital-app-postgres-1
   def456...      redis:7       Up 2 minutes   0.0.0.0:6379->6379/tcp   forma-digital-app-redis-1
   ```

---

## 5. Configurar Backend

```powershell
# Desde la raíz del proyecto
cd apps/backend

# Instalá las dependencias (puede tardar unos minutos)
npm install

# Creá las tablas en la base de datos
npx prisma db push

# Cargá datos iniciales (seed)
npx prisma db seed
```

Si todo salió bien, deberías ver mensajes de éxito sin errores rojos.

---

## 6. Configurar Frontend

```powershell
# Desde la raíz del proyecto
cd apps/frontend

# Instalá las dependencias (puede tardar unos minutos)
npm install
```

---

## 7. Configurar Harv3st

Harv3st es el servicio que scrapea negocios de Google Maps.

```powershell
# Desde la raíz del proyecto
cd services/harv3st

# Creá un entorno virtual de Python
python -m venv venv

# Activá el entorno virtual
.\venv\Scripts\activate

# Instalá las dependencias
pip install -r requirements.txt

# Instalá los navegadores de Playwright (necesario para el scraping)
playwright install
```

> 💡 **Nota:** Cada vez que abras una nueva terminal para trabajar con Harv3st, tenés que activar el entorno virtual con `.\venv\Scripts\activate`

---

## 8. Iniciar la Aplicación

La forma más fácil de iniciar todo es usando el script `dev.bat`:

```powershell
# Desde la raíz del proyecto (forma-digital-app/)
.\dev.bat
```

Esto va a abrir **3 ventanas de terminal**, una para cada servicio:
- **Harv3st** - Puerto 5050
- **Backend** - Puerto 3000
- **Frontend** - Puerto 3001

Esperá unos segundos hasta que todos los servicios terminen de iniciar.

### Para detener todo

```powershell
.\stop.bat
```

O simplemente cerrá las 3 ventanas de terminal.

---

## 9. Verificar Instalación

### ✅ Checklist de Verificación

Abrí tu navegador y verificá cada uno:

| Servicio | URL | Qué deberías ver |
|----------|-----|------------------|
| Frontend | http://localhost:3001 | Página de login de Forma Digital |
| Backend | http://localhost:3000/api | Mensaje JSON de la API |
| Harv3st | http://localhost:5050/api/status | `{"active_tasks": []}` |

### Verificación por Terminal

También podés verificar desde PowerShell:

```powershell
# Verificar Docker
docker ps

# Verificar Harv3st
Invoke-RestMethod -Uri "http://localhost:5050/api/status"
```

Si todo funciona, ¡felicitaciones! 🎉 La aplicación está lista para usar.

---

## 10. Sobre Kiro y los Steering Files

### ¿Qué es Kiro?

Kiro es un IDE (editor de código) con inteligencia artificial integrada. Podés pedirle que escriba código, explique funciones, o te ayude a resolver problemas.

### ¿Qué son los Steering Files?

Los steering files son archivos de configuración que le dicen a Kiro cómo debe comportarse cuando trabaja en este proyecto. Están en la carpeta `.kiro/steering/`.

**¿Por qué son importantes?**
- Mantienen consistencia en el código que genera la IA
- Contienen reglas específicas del proyecto
- Definen flujos de trabajo (como el de prospección)

**No tenés que hacer nada especial** - los steering files ya vienen incluidos en el repositorio y Kiro los usa automáticamente.

---

## 11. Troubleshooting

### ❌ "Docker daemon is not running"

**Causa:** Docker Desktop no está iniciado.

**Solución:** 
1. Abrí Docker Desktop desde el menú de inicio
2. Esperá a que el icono en la barra de tareas deje de mostrar "Starting..."
3. Intentá de nuevo

### ❌ "Port 3000 is already in use"

**Causa:** Hay otro proceso usando ese puerto.

**Solución:**
```powershell
# Encontrá qué proceso usa el puerto
netstat -ano | findstr :3000

# Matá el proceso (reemplazá XXXX con el PID que aparece)
taskkill /PID XXXX /F
```

### ❌ "Port 5050 is already in use"

**Causa:** Harv3st ya está corriendo de una sesión anterior.

**Solución:**
```powershell
.\stop.bat
```

### ❌ "ECONNREFUSED" o "Connection refused" en Prisma

**Causa:** Docker no está corriendo o los contenedores no iniciaron.

**Solución:**
```powershell
# Verificá que Docker esté corriendo
docker ps

# Si no hay contenedores, inicialos
docker compose up -d

# Esperá 10 segundos y reintentá
```

### ❌ "playwright not found" o errores de Playwright

**Causa:** Playwright no se instaló correctamente.

**Solución:**
```powershell
cd services/harv3st
.\venv\Scripts\activate
playwright install
```

### ❌ "'python' is not recognized"

**Causa:** Python no está en el PATH.

**Solución:**
1. Desinstalá Python
2. Volvé a instalarlo asegurándote de marcar **"Add Python to PATH"**
3. Reiniciá PowerShell

### ❓ Otro problema

Si tenés un problema que no está listado acá, contactá al líder del equipo con:
1. Captura de pantalla del error
2. Qué comando ejecutaste
3. En qué paso de esta guía estabas

---

## 🎉 ¡Listo!

Si llegaste hasta acá y todo funciona, ya podés empezar a trabajar con Forma Digital.

**Próximos pasos:**
- El líder del equipo te va a mostrar cómo usar la aplicación
- Explorá el código con Kiro
- Preguntá si tenés dudas

¡Bienvenido al equipo! 💪
