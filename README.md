# Forma Digital App

Plataforma de prospección y gestión de negocios locales. Incluye scraping de Google Maps, auditorías de competencia con IA, y CRM de leads con pipeline de ventas.

## Stack

- **Backend**: NestJS 11, Prisma, PostgreSQL
- **Frontend**: Next.js 16, React 19, TailwindCSS
- **Scraper**: Python + Playwright (Harv3st)
- **IA**: Google Gemini

## Instalacion

```bash
# 1. Instalar dependencias
npm install

# 2. Iniciar PostgreSQL y Redis
docker compose up -d

# 3. Configurar base de datos
cd apps/backend
npx prisma db push
npx prisma db seed

# 4. Instalar scraper
cd services/harv3st
pip install -r requirements.txt
playwright install
```

## Uso

```bash
# Iniciar todos los servicios
dev.bat

# O manualmente:
cd services/harv3st && python manager.py server  # Puerto 5050
cd apps/backend && npm run start:dev             # Puerto 3000
cd apps/frontend && npm run dev -- -p 3001       # Puerto 3001
```

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

| Archivo | Proposito |
|---------|-----------|
| `.agent/context.md` | Estado actual del proyecto |
| `.agent/workflows/` | Workflows ejecutables |
| `SALES_PLAYBOOK.md` | Manual de ventas |
| `.github/agents/` | Definiciones de agentes tecnicos |

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
