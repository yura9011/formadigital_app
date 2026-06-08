# Runbook

## Desarrollo local

Requisitos: Node.js 22, Python 3.12 y Docker Compose.

```bash
docker compose up -d
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env.local
# Definir DEFAULT_USER_PASSWORD en apps/backend/.env antes del seed.

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

Iniciar en tres terminales:

```bash
cd apps/backend && npm run start:dev
cd apps/frontend && npm run dev
cd services/harv3st && .venv/bin/python manager.py server
```

URLs locales:

- `http://localhost:3001`
- `http://localhost:3000/api/pipeline/summary`
- `http://localhost:5050`

## Validación antes de push

```bash
cd apps/backend && npm run build && npm test -- --runInBand
cd apps/frontend && npm run build
cd services/harv3st && python3 -m compileall -q app core config.py manager.py
git diff --check
git status --short --branch
```

## Deploy normal

1. Subir un commit a `main`.
2. GitHub Actions ejecuta build y tests.
3. Si pasa, GitHub actualiza la rama `deploy`.
4. El VPS detecta el cambio dentro de un minuto y ejecuta `deploy.sh`.

Observar CI:

```bash
gh run list --workflow deploy.yml --limit 3
gh run watch RUN_ID --exit-status
```

Verificar producción sin mostrar secretos:

```bash
ssh forma@2.24.89.243 'cut -c1-7 /opt/data/formadigital_app/.runtime/deploy/deployed.sha'
ssh forma@2.24.89.243 'tail -80 /opt/data/formadigital_app/.runtime/logs/deploy.log'
ssh forma@2.24.89.243 'PM2_HOME=/opt/data/formadigital_app/.runtime/pm2 pm2 status'
```

Health checks:

```bash
curl -f http://2.24.89.243:3001/
curl -f http://2.24.89.243:3000/api/pipeline/summary
ssh forma@2.24.89.243 'curl -f http://127.0.0.1:3000/api/harv3st/api/status'
```

## Fallo o rollback

- No tocar otros servicios del VPS.
- Revisar primero `.runtime/logs/deploy.log` y logs PM2.
- Corregir mediante un commit nuevo o `git revert` en `main`; no editar producción directamente.
- El rollback de código no revierte migraciones de base de datos. Las migraciones deben ser retrocompatibles.
- Si CI falla, la rama `deploy` no avanza y producción conserva la versión anterior.

## Usuarios de login

Usuarios permitidos: `admin`, `lucas`, `marcos`. No documentar su contraseña.

Para sincronizarlos o cambiar su contraseña en producción, usar el script con entrada oculta:

```bash
ssh -tt forma@2.24.89.243 \
  'cd /opt/data/formadigital_app/apps/backend && read -rsp "Password: " LOGIN_USER_PASSWORD && export LOGIN_USER_PASSWORD && node prisma/sync-login-users.js'
```

Validar login sin imprimir la contraseña y confirmar que usuarios desconocidos reciban `401`.

## Límites operativos

- Docker está prohibido en producción.
- Redis `6379` pertenece a otros servicios; no usarlo sin una decisión explícita.
- No tocar `/root`, PM2 ajenos, firewall, PostgreSQL ajeno ni servicios fuera de Forma Digital.
- No imprimir `.env`, hashes, tokens o claves en terminales, logs o documentación.
