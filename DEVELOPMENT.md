# Desarrollo y deploy

La aplicación mantiene su estructura actual:

- Backend NestJS: `apps/backend`, puerto `3000`
- Frontend Next.js: `apps/frontend`, puerto `3001`
- Harv3st: `services/harv3st`, puerto `5050`
- PostgreSQL y Redis locales: Docker Compose
- Producción: procesos del host administrados por PM2, sin Docker

## Preparación local

Requisitos: Node.js 22, Python 3.12 y Docker Compose.

```bash
docker compose up -d

cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env.local

cd apps/backend
npm install
npx prisma db push
npx prisma db seed

cd ../frontend
npm install

cd ../../services/harv3st
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
python -m playwright install chromium
```

En Windows PowerShell, usá `copy` en lugar de `cp`, `python` en lugar de
`python3` y activá Harv3st con:

```powershell
.\services\harv3st\.venv\Scripts\Activate.ps1
```

Completá solamente las claves que necesites en los archivos `.env`, sin
versionarlos.

## Ejecución local

Abrí tres terminales desde la raíz:

```bash
cd services/harv3st && .venv/bin/python manager.py server
cd apps/backend && npm run start:dev
cd apps/frontend && npm run dev
```

En Windows también podés ejecutar `dev.bat`.

Verificación:

- Frontend: http://localhost:3001
- Backend: http://localhost:3000/api/pipeline/summary
- Harv3st: http://localhost:5050

## Deploy

Cada push a `main` ejecuta builds y tests en GitHub Actions. Si pasan, el
workflow se conecta al VPS y ejecuta `/opt/data/formadigital_app/deploy.sh`.

El script actualiza el repositorio, instala dependencias modificadas, aplica
migraciones Prisma, construye backend/frontend, recarga los tres procesos PM2
y valida sus endpoints.

Para corregir un deploy, hacé `git revert` del commit problemático y subí el
revert a `main`.
