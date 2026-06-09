# Plan de Simplificación - Forma Digital

**Branch:** `agent/simplification-plan`
**Fecha:** 2026-06-09
**Objetivo:** Reducir complejidad de ~25,900 a ~17,000 líneas (~34%)

---

## Orden de Ejecución

```
Fase 0 (sin riesgo) → Fase 6 (docs) → Fase 1 (backend) → Fase 2 (frontend) → Fase 3 (GMB) → Fase 4 (archivos) → Fase 5 (Prisma)
```

---

## Fase 0: Limpieza de Código Muerto y Artefactos

**Riesgo:** Mínimo | **Líneas eliminadas:** ~500

### Harv3st - Eliminar duplicados
- [ ] `services/harv3st/main_server.py` (raíz) - duplicado muerto
- [ ] `services/harv3st/scraper.py` (raíz) - idéntico a `app/scraper.py`
- [ ] `services/harv3st/legacy` - scraper anterior obsoleto
- [ ] `services/harv3st/instagram_enricher.py` - nunca importado por servidor activo
- [ ] Eliminar `instaloader` de `services/harv3st/requirements.txt`

### Paquetes NPM sin uso
- [ ] Backend: eliminar `@google/genai` de package.json
- [ ] Backend: eliminar `form-data` de package.json
- [ ] Frontend: eliminar `radar-sdk-js` de package.json
- [ ] Frontend: eliminar `leaflet-radar` de package.json

### Paquetes en lugar incorrecto
- [ ] Backend: mover `@prisma/client` de devDependencies a dependencies
- [ ] Backend: mover `@types/bcryptjs` a devDependencies
- [ ] Backend: mover `@types/multer` a devDependencies
- [ ] Frontend: mover `@types/leaflet` a devDependencies

### Frontend - Componentes muertos
- [ ] Eliminar `components/PostComposer.tsx`
- [ ] Eliminar `components/MediaUploader.tsx`
- [ ] Eliminar `components/agency/AgencyDashboard.tsx`
- [ ] Eliminar `components/neo/NeoTextarea.tsx` (solo usado por PostComposer)

### Backend - Código muerto
- [ ] Eliminar `common/logger/logger.module.ts` (importado pero nunca usado)
- [ ] Eliminar `auth/auth.service.ts` (nunca inyectado)
- [ ] Eliminar import de LoggerModule en `app.module.ts`
- [ ] Eliminar import de AuthService en `auth.module.ts`

### Artefactos de git
- [ ] Eliminar `lead_audit.json`
- [ ] Eliminar `top5_analysis.json`
- [ ] Eliminar `test_lead_id.txt`
- [ ] Eliminar `leads_to_enrich.txt`
- [ ] Eliminar `top5_enrich.txt`
- [ ] Verificar `.gitignore` incluye `__pycache__/`
- [ ] Eliminar `**/__pycache__/` del repo si existe

### Archivos legacy
- [ ] Eliminar `tools/host.js` (referencia rota a `map-scraper-dashboard`)

---

## Fase 6: Documentación

**Riesgo:** Mínimo | **Líneas eliminadas:** ~500

### Consolidar documentación
- [ ] Eliminar `AGENT.MD` (obsoleto, contradice arquitectura actual)
- [ ] Eliminar `SETUP.md` (duplica docs/RUNBOOK.md)
- [ ] Eliminar `INSTALACION.md` (duplica SETUP.md)
- [ ] Eliminar `DEVELOPMENT.md` (duplica docs/RUNBOOK.md)
- [ ] Eliminar `TODO-UNIFICACION.md` (features ya implementados)
- [ ] Eliminar `.agent/context.md` (5 meses desactualizado)
- [ ] Eliminar `.agent/sessions/` (logs históricos)

### Actualizar documentación
- [ ] Actualizar `docs/STATUS.md` con estado simplificado
- [ ] Actualizar `README.md` reflejando nueva estructura
- [ ] Verificar que `docs/RUNBOOK.md` sigue siendo correcto

---

## Fase 1: Eliminar Módulos Backend Removibles

**Riesgo:** Medio | **Líneas eliminadas:** ~3,300

### Módulos a eliminar (completos)
- [ ] `integrations/` - Instagram, Facebook, GoogleService
  - `integrations.module.ts`
  - `integrations.service.ts`
  - `integrations.controller.ts`
  - `instagram.provider.ts`
  - `facebook.provider.ts`
  - `social.interface.ts`
  - `google.service.ts`
  - `google.controller.ts`
- [ ] `posts/` - BullMQ queue
  - `posts.module.ts`
  - `posts.service.ts`
  - `posts.processor.ts`
  - `posts.controller.ts`
- [ ] `calendar/` - Google Calendar
  - `calendar.module.ts`
  - `calendar.service.ts`
  - `calendar.controller.ts`
- [ ] `gbp/` - GBP Reviews
  - `gbp-reviews.module.ts`
  - `gbp-reviews.service.ts`
  - `gbp-reviews.controller.ts`
- [ ] `gsc/` - Search Console
  - `gsc.module.ts`
  - `gsc.service.ts`
  - `gsc.controller.ts`
- [ ] `agency/` - Agency Dashboard
  - `agency.module.ts`
  - `agency.service.ts`
  - `agency.controller.ts`
- [ ] `media/` - File upload
  - `media.module.ts`
  - `media.controller.ts`
- [ ] `google-auth/` - OAuth
  - `google-auth.module.ts`
  - `google-auth.service.ts`
  - `google-auth.controller.ts`
- [ ] `common/mock-data.service.ts` (solo usado por GBP y GSC)

### Actualizar app.module.ts
- [ ] Eliminar imports de módulos removidos
- [ ] Eliminar `BullModule.forRoot()` y condición `ENABLE_POSTS_QUEUE`
- [ ] Eliminar `ServeStaticModule` (solo servía uploads de Posts)
- [ ] Eliminar variables de entorno: `REDIS_HOST`, `REDIS_PORT`, `ENABLE_POSTS_QUEUE`

### Paquetes NPM a eliminar (backend)
- [ ] `bullmq`
- [ ] `@nestjs/bullmq`
- [ ] `@nestjs/cache-manager`
- [ ] `cache-manager`
- [ ] `google-auth-library`
- [ ] `googleapis`
- [ ] `multer`
- [ ] `dayjs` (solo usado por posts e integrations)
- [ ] `axios` (solo usado por gmb.service.ts y serp-api.service.ts - reemplazar con fetch)

### Eliminar endpoints no usados
- [ ] `DELETE /gmb/clients/:id` de gmb.controller.ts
- [ ] `POST /gmb/clients/batch` de gmb.controller.ts
- [ ] `POST /gmb/competitors` de gmb.controller.ts
- [ ] `POST /gmb/audit` (versión antigua) de gmb.controller.ts
- [ ] `PUT /api/scoring/rules` de scoring.controller.ts
- [ ] `PUT /api/scoring/config` de scoring.controller.ts
- [ ] `POST /api/scoring/recalculate` de scoring.controller.ts
- [ ] `POST /api/scoring/calculate/:leadId` de scoring.controller.ts
- [ ] `POST /api/enrich/instagram/batch` de enrichment.controller.ts
- [ ] `POST /api/pipeline/leads/:id/validate-channels` de pipeline.controller.ts
- [ ] `POST /api/pipeline/validate-all-channels` de pipeline.controller.ts
- [ ] `POST /api/pipeline/leads/:id/register-contact` de pipeline.controller.ts
- [ ] `GET /api/prospect/validate` de prospect.controller.ts
- [ ] `GET /api/prospect/config` de prospect.controller.ts
- [ ] `PATCH /api/prospect/config` de prospect.controller.ts
- [ ] `POST /api/prospect/templates` de prospect.controller.ts

### Mover Instagram enrichment a legacy
- [ ] Crear carpeta `legacy/` en raíz del proyecto
- [ ] Mover `pipeline/enrichment.service.ts` a `legacy/pipeline-enrichment.service.ts`
- [ ] Actualizar ProspectModule para no importar PipelineModule
- [ ] Eliminar `enrichInstagramBatch()` de ProspectService

---

## Fase 2: Eliminar Frontend Removable

**Riesgo:** Medio | **Líneas eliminadas:** ~2,500

### Páginas a eliminar
- [ ] `app/analytics/page.tsx` - Instagram analytics
- [ ] `app/search-console/page.tsx` - GSC
- [ ] `app/resenas/page.tsx` - GBP Reviews
- [ ] `app/calendar/page.tsx` - Google Calendar
- [ ] `app/changelog/page.tsx` - changelog
- [ ] `app/negocios/page.tsx` - stub redirect
- [ ] `app/clientes/page.tsx` - stub redirect

### Componentes a eliminar
- [ ] `components/gsc/GscTab.tsx`
- [ ] `components/gmb/ReviewsTab.tsx`
- [ ] `components/gmb/MapTab.tsx`
- [ ] `components/gmb/AuditTab.tsx`
- [ ] `components/gmb/AnalysisTab.tsx`
- [ ] `components/gmb/AgentAnalysisButton.tsx`
- [ ] `components/gmb/ReportTab.tsx`
- [ ] `components/gmb/ApiKeySettings.tsx`
- [ ] `components/google/GoogleConnectButton.tsx`
- [ ] `components/calendar/CalendarEventModal.tsx`
- [ ] `components/neo/NeoLineChart.tsx` (solo usado por analytics)

### Middleware
- [ ] Eliminar `middleware.ts` (solo protegía `/calendar`)

### Actualizar menú
- [ ] Editar `app/page.tsx` - eliminar items: Reseñas, Calendario, Analíticas

### Paquetes NPM a eliminar (frontend)
- [ ] `@fullcalendar/react`
- [ ] `@fullcalendar/daygrid`
- [ ] `@fullcalendar/timegrid`
- [ ] `@fullcalendar/interaction`
- [ ] `leaflet`
- [ ] `html2pdf.js`
- [ ] `xlsx`
- [ ] `recharts` (solo usado por analytics)

### Limpiar config/api.ts
- [ ] Eliminar `GMB_API_URL` (nunca usado)
- [ ] Eliminar helpers de endpoints removidos

---

## Fase 3: Simplificar GMB y Projects

**Riesgo:** Medio | **Líneas eliminadas:** ~800

### GMB Module - Eliminar funcionalidad AI
- [ ] Eliminar `gmb/gemini.service.ts` (~279 líneas)
- [ ] Eliminar métodos de AI de `gmb.service.ts`:
  - `performAudit()` (~20 líneas)
  - `startAgentAnalysis()` (~70 líneas)
  - `searchCompetitorsAI()` (si existe)
- [ ] Eliminar `POST /gmb/audit/ai` de gmb.controller.ts
- [ ] Eliminar `POST /gmb/analysis/start` de gmb.controller.ts
- [ ] Eliminar `GET /gmb/credits` de gmb.controller.ts
- [ ] Eliminar variable de entorno `GEMINI_API_KEY`

### GMB Module - Eliminar batch operations
- [ ] Eliminar `batchUpsertClients()` de gmb.service.ts
- [ ] Eliminar `POST /gmb/clients/batch` de gmb.controller.ts

### Projects - Simplificar (mantener básico)
- [ ] Eliminar `ProjectTemplate` model de Prisma
- [ ] Eliminar `template` endpoints de gmb.controller.ts
- [ ] Eliminar `GET /gmb/templates`
- [ ] Eliminar `POST /gmb/templates`
- [ ] Eliminar `DELETE /gmb/templates/:id`
- [ ] Simplificar `projects/page.tsx` (eliminar gestión de templates)
- [ ] Mantener: crear proyecto, fases básicas, assignación

### Resultado esperado
- `gmb.service.ts`: de ~967 a ~500 líneas
- `gmb.controller.ts`: de ~258 a ~150 líneas
- `projects/page.tsx`: de ~652 a ~350 líneas

---

## Fase 4: Dividir Archivos Grandes

**Riesgo:** Bajo | **Líneas:** 0 (reorganización)

### prospect.service.ts (1,463 → ~4 archivos)
- [ ] Crear `prospect/services/search.service.ts` (~350 líneas)
  - `searchBusinesses()`
  - `importHarvestedLeads()`
  - `getLeads()`
  - `getLeadDetail()`
- [ ] Crear `prospect/services/contact.service.ts` (~350 líneas)
  - `createContactRecord()`
  - `updateContactStatus()`
  - `getContactStats()`
  - `getAvailableChannels()`
- [ ] Crear `prospect/services/template.service.ts` (~200 líneas)
  - `getTemplates()`
  - `createTemplate()`
  - `deleteTemplate()`
  - `suggestScenario()`
- [ ] Crear `prospect/services/config.service.ts` (~150 líneas)
  - `getConfig()`
  - `updateConfig()`
- [ ] Mantener `prospect.service.ts` como orquestador (~100 líneas)
- [ ] Actualizar ProspectModule para importar nuevos servicios

### prospect/page.tsx (1,082 → componentes modulares)
- [ ] Extraer `components/prospect/SearchPanel.tsx` (~200 líneas)
- [ ] Extraer `components/prospect/LeadList.tsx` (~200 líneas)
- [ ] Extraer `components/prospect/ContactForm.tsx` (~150 líneas)
- [ ] Extraer `components/prospect/TemplateManager.tsx` (~150 líneas)
- [ ] Extraer `components/prospect/SnoozeDialog.tsx` (~100 líneas)
- [ ] Mantener `prospect/page.tsx` como orchestrador (~200 líneas)

### SearchTab.tsx (645 → 3 componentes)
- [ ] Extraer `components/gmb/search/SearchForm.tsx` (~150 líneas)
- [ ] Extraer `components/gmb/search/SearchResults.tsx` (~250 líneas)
- [ ] Extraer `components/gmb/search/SearchFilters.tsx` (~150 líneas)

### pipeline.service.ts (611 → verificar si ya está dividido)
- [ ] Verificar que scoring.service.ts ya existe separado
- [ ] Si no, extraer lógica de scoring

---

## Fase 5: Limpiar Prisma Schema

**Riesgo:** Bajo | **Líneas eliminadas:** ~200

### Modelos a eliminar
- [ ] `Post` model
- [ ] `Integration` model
- [ ] `GoogleCredential` model
- [ ] `GbpLocation` model
- [ ] `GscProperty` model
- [ ] `GmbAudit` model
- [ ] `GmbSearch` model
- [ ] `ProjectTemplate` model

### Enums a eliminar
- [ ] `PostState`
- [ ] `ProjectStatus` (si Projects se simplifica)
- [ ] `PhaseStatus` (si Projects se simplifica)
- [ ] `AttachmentType` (si Projects se simplifica)

### Campos a eliminar de Client
- [ ] `revivedAt`
- [ ] `discardReason`
- [ ] `hours`
- [ ] `attributes`
- [ ] `priceLevel`
- [ ] `reviewsUrl`
- [ ] `instagramFollowers`
- [ ] `instagramPosts`
- [ ] `instagramLastPostDate`
- [ ] `instagramBio`
- [ ] `enrichedAt`
- [ ] `snoozeReason`
- [ ] `businessDescription`
- [ ] `summary`

### Crear migración
- [ ] Ejecutar `npx prisma migrate dev --name simplify_remove_unused`
- [ ] Verificar que la app funciona con la nueva migración

### Actualizar queries en código
- [ ] Eliminar `include: { audits }` de gmb.service.ts
- [ ] Eliminar `include: { audits }` de getClient()
- [ ] Verificar que no hay queries que referencien campos eliminados

---

## Validación Final

### Después de cada fase
- [ ] `cd apps/backend && npm run build`
- [ ] `cd apps/backend && npm test -- --runInBand`
- [ ] `cd apps/frontend && npm run build`

### Después de todas las fases
- [ ] Verificar que la app arranca correctamente
- [ ] Probar flujo de login
- [ ] Probar flujo de búsqueda de leads
- [ ] Probar flujo de pipeline
- [ ] Probar flujo de prospect
- [ ] Verificar que no hay errores en consola
- [ ] Actualizar `docs/STATUS.md`
- [ ] Crear commit con cambios
- [ ] Hacer push a la branch

---

## Preguntas Pendientes

1. **¿Mover Instagram enrichment a `legacy/` o crear un servicio standalone?**
2. **¿Mantener `services/harv3st/core/campaign.py` o eliminarlo?**
3. **¿Qué hacer con `services/harv3st/core/scoring.py`?** (se usa por `/api/data/scored`)
4. **¿Consolidar los servicios de prospect en uno solo o mantener separados?**

---

*Plan generado el 2026-06-09. Ejecutar en el orden indicado.*
