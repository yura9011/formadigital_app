# Arquitectura

## Resumen

Forma Digital es una aplicación monorepo para prospección, CRM y análisis de negocios locales.

| Componente | Ruta | Tecnología | Puerto |
|---|---|---|---|
| Frontend | `apps/frontend` | Next.js 16 / React 19 | `3001` |
| Backend | `apps/backend` | NestJS 11 / Prisma | `3000` |
| Scraper | `services/harv3st` | Python / Flask / Playwright | `5050` |
| Base de datos | Prisma datasource | PostgreSQL 16 | local `5432`, producción `5433` |
| Cola opcional | Backend | Redis / BullMQ | local `6379`; desactivada en producción |

## Flujo principal

```text
Navegador -> Frontend Next.js -> Backend NestJS -> PostgreSQL
                                  |
                                  +-> Harv3st privado -> Playwright / Google Maps
                                  +-> Gemini y otras integraciones externas
```

El navegador usa `NEXT_PUBLIC_API_URL` para acceder al backend. Harv3st no se publica directamente: el frontend lo consume mediante el proxy del backend bajo `/api/harv3st/api/*`.

## Módulos principales

- `gmb`: búsquedas, auditorías y gestión de negocios.
- `pipeline`: etapas y métricas del pipeline comercial.
- `prospect`: prospección, contactos y conexión con Harv3st.
- `integrations`: integraciones sociales y externas.
- `auth`: login básico de la interfaz.

Endpoints de salud funcional usados por deploy:

- Frontend: `GET /`
- Backend: `GET /api/pipeline/summary`
- Harv3st mediante backend: `GET /api/harv3st/api/status`

## Login actual

El usuario ingresa con uno de estos nombres: `admin`, `lucas` o `marcos`. El backend los traduce a emails internos porque el modelo Prisma todavía requiere `User.email`.

La autenticación actual es básica: verifica bcrypt y el frontend guarda identidad en `localStorage`. No existe todavía autorización JWT real sobre los endpoints de API. Tratar esto como una limitación de seguridad conocida, no como autenticación completa.

## Producción

Producción corre sin Docker en `/opt/data/formadigital_app`:

- PM2 administra backend, frontend y Harv3st usando `ecosystem.config.cjs`.
- PostgreSQL 16 usa `/opt/data/formadigital_pg16` y escucha en `127.0.0.1:5433`.
- Harv3st escucha solo en `127.0.0.1:5050`.
- Variables y datos operativos permanecen fuera de Git.
- `.runtime/` contiene PM2, logs, Playwright y estado de deploy.

## Deploy

GitHub Actions valida cada push a `main`. Si CI pasa, mueve la rama `deploy` al commit aprobado. Un cron del VPS ejecuta `poll-deploy.sh` cada minuto; cuando detecta una referencia nueva, ejecuta `deploy.sh`.

`deploy.sh` instala dependencias modificadas, ejecuta `prisma migrate deploy`, construye backend/frontend, recarga PM2 y valida endpoints antes de registrar el SHA desplegado.
