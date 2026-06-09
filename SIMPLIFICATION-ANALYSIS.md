# Análisis de Simplificación - Forma Digital

**Fecha:** 2026-06-09
**Branch:** `agent/simplification-plan`
**Objetivo:** Reducir complejidad manteniendo solo: buscar leads, organizarlos, dar seguimiento

---

## 1. Estado Actual

| Métrica | Valor |
|---------|-------|
| Líneas de código fuente | 25,923 |
| Archivos de código | 157 |
| Endpoints API | 121 |
| Rutas frontend | 19 |
| Modelos Prisma | 17 |
| Archivos >300 líneas | 22 |
| Archivo más grande | `prospect.service.ts` (1,463 líneas) |
| Total dependencias NPM | 64 (43 backend + 21 frontend) |

---

## 2. Código Muerto Detectado

### 2.1 Backend - Código Muerto

| Archivo/Línea | Hallazgo |
|---------------|----------|
| `common/logger/logger.module.ts` | LoggerModule importado pero nunca usado por ningún servicio |
| `auth/auth.service.ts` | AuthService nunca inyectado; AuthController usa PrismaService directamente |
| `integrations/google.controller.ts` | GoogleController completamente muerto; CalendarModule usa GoogleAuthService |
| `gmb/gmb.service.ts:882` | `batchUpsertClients()` expuesto en endpoint pero frontend nunca lo llama |
| `gmb/serp-api.service.ts:6` | `getBusinessDetails()` nunca llamado por ningún controller |
| `prospect/harv3st-proxy.controller.ts` | Probablemente muerto; frontend llama directo a Harv3st |

### 2.2 Backend - Endpoints sin Frontend

| Endpoint | Módulo |
|----------|--------|
| `DELETE /gmb/clients/:id` | GMB |
| `POST /gmb/clients/batch` | GMB |
| `POST /gmb/competitors` | GMB |
| `POST /gmb/audit` (versión antigua) | GMB |
| `GET /integrations/:id/media` | Integrations |
| `GET /google/*` (4 endpoints) | Integrations |
| `GET /media` | Media |
| `PUT /api/scoring/rules` | Pipeline |
| `PUT /api/scoring/config` | Pipeline |
| `POST /api/scoring/recalculate` | Pipeline |
| `POST /api/scoring/calculate/:leadId` | Pipeline |
| `POST /api/enrich/instagram/batch` | Pipeline |
| `POST /api/pipeline/leads/:id/validate-channels` | Pipeline |
| `POST /api/pipeline/validate-all-channels` | Pipeline |
| `POST /api/pipeline/leads/:id/register-contact` | Pipeline |
| `DELETE /gbp/reviews/:reviewId/reply` | GBP |
| `GET /gsc/index-coverage` | GSC |
| `GET /gsc/sitemaps` | GSC |
| `GET /api/prospect/validate` | Prospect |
| `GET /api/prospect/config` | Prospect |
| `PATCH /api/prospect/config` | Prospect |
| `POST /api/prospect/templates` | Prospect |

### 2.3 Frontend - Componentes Muertos

| Archivo | Hallazgo |
|---------|----------|
| `components/PostComposer.tsx` | No importado por ninguna página |
| `components/MediaUploader.tsx` | Solo importado por PostComposer (muerto) |
| `components/agency/AgencyDashboard.tsx` | No importado por ninguna página |
| `components/neo/NeoTextarea.tsx` | Solo importado por PostComposer (muerto) |
| `components/neo/NeoLineChart.tsx` | Solo importado por analytics (removible) |
| `components/gmb/LeadsTab.tsx` | 0 imports encontrados |
| `components/gmb/HarvestTab.tsx` | 0 imports encontrados |

### 2.4 Frontend - Páginas Muertas/Stub

| Página | Tipo |
|--------|------|
| `app/negocios/page.tsx` | Stub - solo redirecciona a `/crm?tab=leads` |
| `app/clientes/page.tsx` | Stub - solo redirecciona a `/crm?tab=usuarios` |
| `app/gmb/page.tsx` | Stub - solo redirecciona a `/gmb/today` |
| `app/search-console/page.tsx` | Página huérfana - no enlazada desde ningún menú |

### 2.5 Harv3st - Archivos Duplicados/Muertos

| Archivo | Estado |
|---------|--------|
| `services/harv3st/main_server.py` (raíz) | Duplicado muerto; producción usa `app/main_server.py` |
| `services/harv3st/scraper.py` (raíz) | Idéntico a `app/scraper.py` |
| `services/harv3st/legacy` | Scraper anterior obsoleto |
| `services/harv3st/instagram_enricher.py` | Nunca importado por servidor activo |

---

## 3. Tipos Duplicados

| Tipo | Ubicaciones |
|------|-------------|
| `ServiceOpportunity` | `types/lead.ts:33-44` + `services/harv3st/harv3stTypes.ts:18-29` |
| `DayHours` | `components/gmb/types.ts:8-11` + `services/harv3st/harv3stTypes.ts:9-12` |
| `AgencyClient` | `services/gmb.service.ts:6-13` + `components/agency/AgencyDashboard.tsx:5-13` |
| `ApiKeys` | `components/gmb/ApiKeySettings.tsx:3-7` + `components/gmb/AgentAnalysisButton.tsx:5-9` |
| `Phase` | `components/projects/PhaseItem.tsx:6-12` + `components/gmb/types.ts` |
| `Template` | `app/projects/page.tsx:16-21` + `components/projects/CreateProjectModal.tsx:9-14` |
| `PipelineMetrics` | `app/gmb/metrics/page.tsx:7-19` + `types/lead.ts` |

---

## 4. Dependencias Cruzadas

| Dependencia | Archivo | Impacto |
|-------------|---------|---------|
| ProspectModule → PipelineModule | `prospect.module.ts:7,10` | ProspectService usa `PipelineEnrichmentService.enrichInstagram()` |
| PostsProcessor → IntegrationsModule | `posts.processor.ts:4-5` | Importa directamente FacebookProvider e InstagramProvider |
| GmbAudit → Client (FK) | `schema.prisma:116,133` | Eliminar GmbAudit requiere actualizar queries en GmbService |
| GoogleAuth → 3 módulos | Múltiples | GSC, GBP Reviews, Calendar dependen de él |

---

## 5. Paquetes NPM sin Uso

| Paquete | Ubicación | Evidencia |
|---------|-----------|-----------|
| `@google/genai` | backend | 0 imports en código |
| `form-data` | backend | 0 imports en código |
| `radar-sdk-js` | frontend | 0 imports en código |
| `leaflet-radar` | frontend | 0 imports en código |

---

## 6. Paquetes en Lugar Incorrecto

| Paquete | Debería estar en | Razón |
|---------|-------------------|-------|
| `@prisma/client` | `dependencies` (no devDeps) | Se usa en runtime |
| `@types/bcryptjs` | `devDependencies` | Types son solo build-time |
| `@types/multer` | `devDependencies` | Types son solo build-time |
| `@types/leaflet` | `devDependencies` | Types son solo build-time |

---

## 7. Prisma Schema - Campos WRITE-ONLY en Client

| Campo | Escrito por | Nunca leído en backend |
|-------|-------------|------------------------|
| `revivedAt` | transition.service | — |
| `discardReason` | transition.service | — |
| `hours` | prospect.service | — |
| `attributes` | prospect.service | — |
| `priceLevel` | prospect.service | — |
| `reviewsUrl` | prospect.service | — |
| `instagramFollowers` | enrichment.service | — |
| `instagramPosts` | enrichment.service | — |
| `instagramLastPostDate` | enrichment.service | — |
| `instagramBio` | enrichment.service | — |
| `enrichedAt` | enrichment.service | — |
| `snoozeReason` | pipeline.service | — |
| `businessDescription` | prospect.service | Solo passthrough |
| `summary` | gmb.service | Solo passthrough |

---

## 8. Prisma Schema - Relaciones no Usadas

| Relación | Razón |
|----------|-------|
| `Client.projects` | Nunca incluida en queries (inverse of Project.client) |
| `Client.reminders` | Nunca incluida en queries (inverse of Reminder.client) |

---

## 9. Frontend - Problemas Arquitectónicos

| Problema | Detalle |
|----------|---------|
| `config/api.ts` incompleto | Solo 7 helpers de ~80 endpoints |
| `GMB_API_URL` muerto | Definido pero nunca usado |
| Sin caching | No usa React Query ni SWR |
| Auth frágil | localStorage sin validación de token |
| Prefijos inconsistentes | `/api/pipeline/*` vs `/gmb/*` |

---

## 10. Endpoints Duplicados (llamados desde múltiples lugares)

| Endpoint | Llamadas |
|----------|----------|
| `GET /gmb/leads` | 4 lugares |
| `POST /gmb/clients` | 3 lugares |
| `GET /gmb/users` | 3 lugares |
| `GET /integrations` | 3 lugares |
| `GET /api/pipeline/summary` | 2 lugares |
| `GET /api/pipeline/metrics` | 2 lugares |

---

## 11. Documentación Duplicada/Obsoleta

| Archivo | Duplica a | Estado |
|---------|-----------|--------|
| `SETUP.md` (396 líneas) | `docs/RUNBOOK.md` | Extenso, Windows-focused |
| `INSTALACION.md` (49 líneas) | `SETUP.md` | Referencia rápida |
| `DEVELOPMENT.md` (76 líneas) | `docs/RUNBOOK.md` | Guía simple |
| `AGENT.MD` (114 líneas) | `AGENTS.md` | Obsoleto, contradice arquitectura actual |
| `TODO-UNIFICACION.md` (142 líneas) | Features ya implementados | Obsoleto |
| `.agent/context.md` | — | 5 meses desactualizado |

---

## 12. Archivos que No Deberían Estar en Git

| Archivo/Carpeta | Tipo |
|-----------------|------|
| `lead_audit.json` | Artefacto de auditoría pasada |
| `top5_analysis.json` | Artefacto de análisis |
| `test_lead_id.txt` | UUID de prueba |
| `leads_to_enrich.txt` | Lista de UUIDs |
| `top5_enrich.txt` | Lista de UUIDs |
| `scripts/prospecting_results/` | Resultados de ejecuciones pasadas |
| `scripts/logs/` | Logs de ejecuciones pasadas |
| `scripts/agent_v2/results*.json` | Resultados de tests |
| `**/__pycache__/` | Cache de Python |

---

## 13. Clasificación de Funcionalidades

### CORE (Mantener)

| Función | Archivos Clave | Líneas |
|---------|----------------|--------|
| Pipeline/CRM | `pipeline/` (backend), `pipeline/page.tsx` (frontend) | ~3,000 |
| Prospect | `prospect/` (backend), `prospect/page.tsx` (frontend) | ~4,100 |
| GMB (simplificado) | `gmb/` (backend), `gmb/today`, `gmb/leads`, `gmb/search`, `crm` | ~2,800 |
| Projects (simplificado) | `gmb/` (backend), `projects/page.tsx` | ~400 |
| Auth | `auth/` (backend), `login/page.tsx` | ~250 |
| Neo UI | `components/neo/` | ~210 |
| Home Dashboard | `page.tsx` | ~326 |
| Harv3st (core) | `app/`, `core/`, `config.py`, `manager.py` | ~1,200 |
| Infra compartida | `prisma/`, `config/api.ts`, `middleware.ts` | ~1,300 |

### REMOVABLE

| Función | Líneas | Justificación |
|---------|--------|---------------|
| GMB Intelligence (AI, Audit, Map, Reports) | ~2,257 | Análisis AI no es core |
| Social Integrations (FB, IG) | ~853 | Publicación no es core |
| Google Calendar | ~574 | Recordatorios ya existen |
| GBP Reviews | ~495 | Gestión de reseñas no es core |
| Google Search Console | ~434 | SEO no es core |
| Agency Dashboard | ~515 | No eres agencia |
| Posts/Queue + PostComposer | ~462 | Programación de posts no es core |
| Google Auth | ~383 | Solo sirve para Calendar/GBP/GSC |
| Media Management | ~163 | Solo sirve para Posts |
| Harv3st Campaigns | ~320 | Búsqueda básica suficiente |
| Changelog | ~137 | Innecesario |
| Código muerto varios | ~200+ | Componentes sin import |

### Instagram Enrichment (LEGACY - no eliminar)

| Función | Líneas | Destino |
|---------|--------|---------|
| `pipeline/enrichment.service.ts` | ~140 | Mover a `legacy/` |
| `prospect/services/enrichment.service.ts` | ~299 | Mantener (depende de anterior) |
| `services/harv3st/instagram_enricher.py` | ~161 | Eliminar (muerto) |

---

## 14. Modelos Prisma Eliminables

| Modelo | Razón |
|--------|-------|
| `Post` | Solo usado por PostsModule |
| `Integration` | Solo usado por Social Integrations |
| `GoogleCredential` | Solo usado por GoogleAuth (Calendar/GBP/GSC) |
| `GbpLocation` | Solo usado por GBP Reviews |
| `GscProperty` | Solo usado por Search Console |
| `GmbAudit` | Solo usado por auditorías AI |
| `GmbSearch` | Solo usado por caché de búsqueda |
| `ProjectTemplate` | Solo usado por gestión de proyectos (simplificar) |
| `ProjectPhase` | Mantener pero simplificar |
| `PhaseAttachment` | Mantener pero simplificar |

---

## 15. Resultado Esperado

| Métrica | Antes | Después | Reducción |
|---------|-------|---------|-----------|
| Líneas de código | 25,923 | ~17,000 | ~34% |
| Modelos Prisma | 17 | ~10 | ~41% |
| Endpoints API | 121 | ~55 | ~55% |
| Rutas frontend | 19 | ~10 | ~47% |
| Archivos >300 líneas | 22 | ~5 | ~77% |
| Módulos backend | 15 | ~6 | ~60% |
| Dependencias NPM | 64 | ~45 | ~30% |

---

*Documento generado por análisis de código el 2026-06-09. Verificar antes de ejecutar.*
