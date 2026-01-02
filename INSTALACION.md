# 📥 Instalación Rápida - Forma Digital

## 1. Descargar e Instalar (hacer una sola vez)

| Programa | Link de Descarga | Notas |
|----------|------------------|-------|
| **Git** | https://git-scm.com/download/win | Click en "Download for Windows" |
| **Node.js** | https://nodejs.org/ | Descargar versión **LTS** (botón verde) |
| **Python** | https://www.python.org/downloads/ | ⚠️ Marcar **"Add Python to PATH"** al instalar |
| **Docker Desktop** | https://www.docker.com/products/docker-desktop/ | Reiniciar PC después de instalar |

## 2. Clonar el Repositorio

Abrir PowerShell y ejecutar:

```powershell
git clone https://github.com/yura9011/formadigital_app.git
cd formadigital_app
```

## 3. Ejecutar Script de Instalación

```powershell
.\install.bat
```

Este script instala todas las dependencias automáticamente.

## 4. Configurar API Keys

Pedile al líder del equipo las API keys y agregalas en:
- `apps/backend/.env` → `GEMINI_API_KEY`

## 5. Iniciar la App

```powershell
.\dev.bat
```

## 6. Verificar

Abrir en el navegador:
- http://localhost:3001 → Frontend
- http://localhost:3000/api → Backend  
- http://localhost:5050/api/status → Harv3st

---

📖 Para instrucciones detalladas, ver `SETUP.md`
