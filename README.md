# Forma Digital App

Plataforma de prospección y gestión de negocios locales. Incluye scraping de Google Maps, auditorías de competencia con IA, y CRM de leads con pipeline de ventas.

## Stack

- **Backend**: NestJS 11, Prisma, PostgreSQL
- **Frontend**: Next.js 16, React 19, TailwindCSS
- **Scraper**: Python + Playwright (Harv3st)
- **IA**: Google Gemini

## Instalacion y uso

Seguir `DEVELOPMENT.md` para preparar y ejecutar el entorno local. Cada aplicación administra sus propias dependencias; no ejecutar `npm install` desde la raíz.

Resumen:

```bash
docker compose up -d
cd apps/backend && npm install
cd ../frontend && npm install
cd ../../services/harv3st && python3 -m venv .venv
```

Para operación, deploy y recuperación consultar `docs/RUNBOOK.md`.

## Modulos

### GMB Intelligence (/gmb)
Busqueda de competidores en Google Maps, analisis de metricas, auditorias con IA.

### Pipeline de Ventas (/pipeline)
- Etapas: DISCOVERED > ANALYZED > CONTACTED > RESPONDED > CONVERTED
- Acciones rapidas de contacto
- Historial de transiciones

### Prospecting (/gmb/today)
Leads listos para contactar, sistema de snooze, validacion de canales.

## Documentacion para Agentes

Todo agente debe comenzar por `AGENTS.md`. La documentacion autoritativa es:

| Archivo | Proposito |
|---------|-----------|
| `AGENTS.md` | Reglas obligatorias y proceso de relevo |
| `docs/STATUS.md` | Estado productivo, riesgos y siguiente trabajo |
| `docs/ARCHITECTURE.md` | Componentes y flujo de datos |
| `docs/RUNBOOK.md` | Desarrollo, deploy y operacion |
| `DEVELOPMENT.md` | Guia rapida de desarrollo local |

## API Endpoints

### Pipeline
- `GET /api/pipeline/summary` - Conteo por etapa
- `POST /api/pipeline/leads/:id/transition` - Cambiar etapa
- `POST /api/pipeline/leads/:id/contact` - Registrar contacto

### Prospecting
- `GET /api/prospect/leads` - Listar leads
- `POST /api/prospect/search` - Buscar via Harv3st

## Variables de Entorno

```env
DATABASE_URL=postgresql://...
GEMINI_API_KEY=...
HARV3ST_URL=http://localhost:5050
```

## License

AGPL-3.0
