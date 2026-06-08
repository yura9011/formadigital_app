# Plan de Refactorización — Forma Digital

Última actualización: 2026-06-08

## Contexto

La app tiene 19 páginas, 40+ componentes y ~23,000 líneas de código. Hay 3 sistemas paralelos de gestión de leads, archivos de 1,000+ líneas y código duplicado en múltiples archivos. Este plan unifica, simplifica y limpia el codebase.

---

## Fase 1: Fundamentos (sin romper nada)

### 1.1 Tipos compartidos
- [ ] Crear `apps/frontend/src/types/lead.ts` con interfaz unificada `Lead` (merge de las 4 definiciones actuales)
- [ ] Crear `apps/frontend/src/types/client.ts` con interfaz unificada `Client`
- [ ] Reemplazar definiciones locales en `prospect/page.tsx`, `pipeline/page.tsx`, `crm/page.tsx`, `gmb/today/page.tsx`, `gmb/leads/page.tsx` por imports del tipo compartido
- [ ] Actualizar `components/gmb/types.ts` para re-exportar los tipos compartidos

### 1.2 API_URL estandarizada
- [ ] Auditar los 15 archivos que hacen fetch y verificar que usen `import { API_URL } from '@/config/api'`
- [ ] Eliminar todos los `const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'` inline
- [ ] Corregir los que usan fallback `3001` (CRM, calendar, home) — el backend corre en `3000`
- [ ] Unificar los que usan `127.0.0.1` vs `localhost`

### 1.3 PageLayout compartido
- [ ] Crear `apps/frontend/src/components/layout/PageLayout.tsx` con header, botón "Volver", título
- [ ] Reemplazar el patrón duplicado en 8+ páginas: `pipeline`, `crm`, `prospect`, `calendar`, `analytics`, `projects`, `resenas`, `search-console`
- [ ] Crear `apps/frontend/src/components/layout/BackButton.tsx` que use `useRouter()` en vez de `window.location.href`

### 1.4 Navegación con Next.js Router
- [ ] Reemplazar los 25 usos de `window.location.href = '...'` por `router.push()` o `<Link>`
- [ ] Eliminar redirects `clientes/page.tsx` y `negocios/page.tsx` — usar Next.js middleware o `redirect()` en layout

---

## Fase 2: Refactor de archivos grandes (dividir)

### 2.1 Frontend — `prospect/page.tsx` (1,140 → ~400)
- [ ] Extraer `components/prospect/LeadListTab.tsx` — tabla de leads con filtros y búsqueda
- [ ] Extraer `components/prospect/ContactListTab.tsx` — lista de contactos/outreach
- [ ] Extraer `components/prospect/TemplatesTab.tsx` — gestión de templates
- [ ] Extraer `components/prospect/StatsTab.tsx` — estadísticas de contacto
- [ ] Extraer `components/prospect/LeadDetailModal.tsx` — modal de detalle del lead
- [ ] Extraer `components/prospect/ContactModal.tsx` — modal de envío de mensaje
- [ ] Extraer `components/prospect/useProspectState.ts` — custom hook para estado compartido

### 2.2 Frontend — `projects/page.tsx` (652 → ~300)
- [ ] Extraer `components/projects/ProjectList.tsx`
- [ ] Extraer `components/projects/ClientManager.tsx`
- [ ] Extraer `components/projects/PhaseManager.tsx`
- [ ] Extraer `components/projects/ProjectStats.tsx`

### 2.3 Frontend — `pipeline/page.tsx` (620 → ~300)
- [ ] Extraer `components/pipeline/StageBoard.tsx` — visualización de etapas
- [ ] Extraer `components/pipeline/LeadDetailModal.tsx` — modal con detalle y score
- [ ] Extraer `components/pipeline/MetricsHeader.tsx` — dashboard de métricas
- [ ] Extraer `components/pipeline/ConvertModal.tsx` — modal de conversión a cliente

### 2.4 Frontend — `crm/page.tsx` (561 → ELIMINAR al fusionar)
- [ ] Fusionar funcionalidad única (agendar reunión, notas) en la nueva página unificada de contacts
- [ ] Eliminar `crm/page.tsx`

### 2.5 Frontend — `gmb/SearchTab.tsx` (645 → ~350)
- [ ] Extraer `components/gmb/search/SearchForm.tsx`
- [ ] Extraer `components/gmb/search/BusinessCard.tsx`
- [ ] Extraer `components/gmb/search/ResultsList.tsx`

### 2.6 Backend — `prospect.service.ts` (1,463 → ~400)
- [ ] Extraer `prospect/lead.service.ts` — CRUD de leads, listing, detail
- [ ] Extraer `prospect/contact.service.ts` — contact records, history, stats
- [ ] Extraer `prospect/template.service.ts` — gestión de templates
- [ ] Extraer `prospect/opportunity.service.ts` — detección de oportunidades por servicio
- [ ] Extraer `prospect/scenario.service.ts` — sugerencia de escenarios
- [ ] Mantener `prospect.service.ts` como orquestador que delega

### 2.7 Backend — `gmb.service.ts` (967 → ~300)
- [ ] Extraer `gmb/search.service.ts` — búsqueda de competidores (Radar, Overpass, SerpAPI)
- [ ] Extraer `gmb/audit.service.ts` — orquestación de auditoría
- [ ] Extraer `gmb/project.service.ts` — CRUD de proyectos, fases, templates
- [ ] Extraer `gmb/lead-crud.service.ts` — CRUD de leads/clients, notas
- [ ] Mantener `gmb.service.ts` como orquestador

---

## Fase 3: Eliminar código duplicado

### 3.1 EnrichmentService renaming
- [ ] Renombrar `pipeline/enrichment.service.ts` → `pipeline/instagram-enrichment.service.ts`
- [ ] Renombrar `prospect/services/enrichment.service.ts` → `prospect/website-scraping.service.ts`
- [ ] Actualizar imports en `prospect.service.ts`

### 3.2 Scoring unificado
- [ ] Eliminar `calculateWeightedScore()` de `gmb.service.ts` (legacy)
- [ ] Asegurar que `pipeline/scoring.service.ts` sea el único sistema de scoring
- [ ] Verificar que el scoring de `prospect.service.ts` use el mismo motor

### 3.3 Lead CRUD unificado
- [ ] Definir que `prospect/lead.service.ts` sea el único módulo que escribe en `prisma.client`
- [ ] Eliminar `getAllLeads()`, `getClient()`, `updateClient()` de `gmb.service.ts`
- [ ] Actualizar `gmb.controller.ts` para delegar a `prospect/lead.service.ts`
- [ ] Eliminar duplicados de `pipeline.service.ts` que escriben en `prisma.client`

---

## Fase 4: Fusionar páginas

### 4.1 Eliminar `/gmb/metrics`
- [ ] Verificar que `/pipeline` muestre las mismas métricas
- [ ] Eliminar `app/gmb/metrics/page.tsx`
- [ ] Actualizar navegación en `gmb/today/page.tsx`

### 4.2 Fusionar `/crm` + `/gmb/leads` → `/contacts`
- [ ] Crear `app/contacts/page.tsx` con tabs: "Todos", "Leads", "Clientes"
- [ ] Migrar funcionalidad única de CRM: agendar reunión, notas, convertir lead
- [ ] Migrar funcionalidad única de GMB Leads: registrar contacto manual, ver último audit
- [ ] Eliminar `app/crm/page.tsx` y `app/gmb/leads/page.tsx`
- [ ] Actualizar links en home, pipeline, projects

### 4.3 Fusionar `/prospect` tabs en `/pipeline`
- [ ] Mover tabs de "Contacts" y "Templates" de Prospect como tabs en Pipeline
- [ ] Pipeline queda: Leads | Outreach | Templates | Métricas
- [ ] Eliminar `app/prospect/page.tsx`
- [ ] Actualizar links en home

### 4.4 Absorber `/gmb/today` en Pipeline
- [ ] Agregar tab "Outreach de Hoy" en Pipeline que muestre leads listos para contactar
- [ ] Migrar lógica de auto-generación de mensajes
- [ ] Eliminar `app/gmb/today/page.tsx`
- [ ] Actualizar links en home y GMB

---

## Fase 5: Limpieza final

### 5.1 Eliminar redirects obsoletos
- [ ] Eliminar `app/negocios/page.tsx`
- [ ] Eliminar `app/clientes/page.tsx`
- [ ] Eliminar `app/gmb/page.tsx` (redirect a gmb/today)

### 5.2 Navegación simplificada
- [ ] Actualizar `app/page.tsx` (home) con las nuevas rutas
- [ ] Actualizar sidebar/menu con estructura simplificada
- [ ] Verificar que no hay links rotos

### 5.3 Verificación
- [ ] `cd apps/frontend && npm run build` — build sin errores
- [ ] `cd apps/backend && npm run build` — build sin errores
- [ ] `cd apps/backend && npm test -- --runInBand` — tests pasan
- [ ] Test manual: login → pipeline → contacts → projects → gmb/search

---

## Archivos a crear

| Archivo | Descripción |
|---------|-------------|
| `apps/frontend/src/types/lead.ts` | Tipos compartidos Lead/Client |
| `apps/frontend/src/components/layout/PageLayout.tsx` | Shell de página compartido |
| `apps/frontend/src/components/layout/BackButton.tsx` | Botón volver con router |
| `apps/frontend/src/components/prospect/LeadListTab.tsx` | Tab de leads |
| `apps/frontend/src/components/prospect/ContactListTab.tsx` | Tab de contactos |
| `apps/frontend/src/components/prospect/TemplatesTab.tsx` | Tab de templates |
| `apps/frontend/src/components/prospect/StatsTab.tsx` | Tab de estadísticas |
| `apps/frontend/src/components/prospect/LeadDetailModal.tsx` | Modal detalle lead |
| `apps/frontend/src/components/prospect/ContactModal.tsx` | Modal envío mensaje |
| `apps/frontend/src/components/pipeline/StageBoard.tsx` | Tablero de etapas |
| `apps/frontend/src/components/pipeline/MetricsHeader.tsx` | Métricas del pipeline |
| `apps/frontend/src/components/projects/ProjectList.tsx` | Lista de proyectos |
| `apps/frontend/src/components/projects/ClientManager.tsx` | Gestión de clientes |
| `apps/frontend/src/components/projects/PhaseManager.tsx` | Gestión de fases |
| `apps/backend/src/prospect/lead.service.ts` | CRUD de leads |
| `apps/backend/src/prospect/contact.service.ts` | Contactos y outreach |
| `apps/backend/src/prospect/template.service.ts` | Templates de mensajes |
| `apps/backend/src/prospect/opportunity.service.ts` | Detección de oportunidades |
| `apps/backend/src/gmb/search.service.ts` | Búsqueda de competidores |
| `apps/backend/src/gmb/audit.service.ts` | Orquestación de auditoría |
| `apps/backend/src/gmb/project.service.ts` | CRUD de proyectos |
| `apps/backend/src/gmb/lead-crud.service.ts` | CRUD de leads |

## Archivos a eliminar

| Archivo | Razón |
|---------|-------|
| `app/crm/page.tsx` | Fusionado en /contacts |
| `app/gmb/leads/page.tsx` | Fusionado en /contacts |
| `app/gmb/today/page.tsx` | Absorbido en pipeline |
| `app/gmb/metrics/page.tsx` | Duplicado de pipeline metrics |
| `app/prospect/page.tsx` | Fusionado en pipeline |
| `app/negocios/page.tsx` | Redirect obsoleto |
| `app/clientes/page.tsx` | Redirect obsoleto |
| `app/gmb/page.tsx` | Redirect obsoleto |

---

## Resultado esperado

| Métrica | Antes | Después |
|---------|-------|---------|
| Páginas | 19 | 12 |
| Archivos >500 líneas | 6 | 0 |
| Sistemas de leads | 3 | 1 |
| Definiciones de tipo Lead | 4 | 1 |
| Configuraciones API_URL | 5 | 1 |

---

## Progreso

### Fase 1: Fundamentos
- [ ] 1.1 Tipos compartidos
- [ ] 1.2 API_URL estandarizada
- [ ] 1.3 PageLayout compartido
- [ ] 1.4 Navegación con Next.js Router

### Fase 2: Refactor de archivos grandes
- [ ] 2.1 prospect/page.tsx
- [ ] 2.2 projects/page.tsx
- [ ] 2.3 pipeline/page.tsx
- [ ] 2.4 crm/page.tsx
- [ ] 2.5 gmb/SearchTab.tsx
- [ ] 2.6 prospect.service.ts
- [ ] 2.7 gmb.service.ts

### Fase 3: Eliminar código duplicado
- [ ] 3.1 EnrichmentService renaming
- [ ] 3.2 Scoring unificado
- [ ] 3.3 Lead CRUD unificado

### Fase 4: Fusionar páginas
- [ ] 4.1 Eliminar /gmb/metrics
- [ ] 4.2 Fusionar /crm + /gmb/leads → /contacts
- [ ] 4.3 Fusionar /prospect tabs en /pipeline
- [ ] 4.4 Absorber /gmb/today en Pipeline

### Fase 5: Limpieza final
- [ ] 5.1 Eliminar redirects obsoletos
- [ ] 5.2 Navegación simplificada
- [ ] 5.3 Verificación
