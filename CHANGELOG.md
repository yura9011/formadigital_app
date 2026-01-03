# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - 2026-01-03
### Added
- **Agent V2 - Sistema de Prospección Automatizado**: Pipeline completo de prospección con validación, scoring y outreach.
  - **PhoneValidatorSkill**: Validación de teléfonos argentinos con generación de links WhatsApp.
  - **ContactabilityScorer**: Sistema de scoring 0-100 para priorizar leads contactables.
  - **OutreachQueueManager**: Cola diaria de leads con priorización por score.
  - **TemplateManager**: Templates de mensajes con variables `{{business_name}}`, `{{location}}`.
  - **SequenceManager**: Secuencias de follow-up multi-canal (WhatsApp → Instagram → Email).
  - **CampaignManager**: Gestión de campañas con criterios de segmentación.
  - **ContactHistoryTracker**: Historial completo de contactos por lead.
  - **FAQManager**: Respuestas predefinidas para preguntas comunes (pricing, objeciones, etc).
- **CLI de Outreach**: Interfaz de línea de comandos para gestionar todo el flujo.
  - `cli_outreach.py queue/next/send/templates/sequences/campaigns/metrics`
- **Property-Based Testing**: 158 tests con Hypothesis para validar correctness.
- **Pipeline Integration**: Nuevo módulo de pipeline en backend con stages configurables.

### Technical
- **New Skills**: `validation.py`, `scoring.py`, `merger.py`, `approval.py`
- **Outreach Module**: `queue.py`, `templates.py`, `sequences.py`, `senders.py`, `history.py`, `campaigns.py`, `faq_responses.py`
- **Steering Files**: `lead-validation-workflow.md`, `outreach-workflow.md`
- **Test Coverage**: 158 tests passing (unit + property-based)

### Database
- **Nueva migración**: `add_pipeline_fields` - Campos para tracking de pipeline de ventas.

## [0.9.2] - 2025-12-15
### Added
- **Geolocation Free (OSM)**: Migración completa a OpenStreetMap.
  - **Nominatim**: Geocodificación de direcciones sin costos.
  - **Overpass API**: Búsqueda de competidores sin Google Places API.
  - **Backend Refactor**: Eliminación de dependencias de Gemini para geolocalización.
- **Improved Error Handling**: Manejo de errores 500 en Google Auth (Token Refresh) para mostrar mensajes claros al usuario.

### Fixed
- **Critical Crash**: Solucionado error que causaba crash del servidor (stack trace D:/...) cuando un usuario externo intentaba agendar con token expirado.
- **UX**: Mensajes de error amigables en CRM scheduling.

## [0.9.1] - 2025-12-15
### Added
- **Integración Google Calendar**: Sistema completo de gestión de eventos.
  - **Sincronización OAuth 2.0**: Conexión segura con cuentas de Google (personales o agencia).
  - **Calendario Compartido**: Fallback automático a la cuenta de la agencia si el usuario no tiene cuenta conectada.
  - **Gestión de Eventos**: Crear, Editar y Eliminar eventos directamente desde la app.
  - **UI Neo-Brutalista**: Modal de eventos personalizado y vista de calendario (`@fullcalendar`).
  - **Endpoints**: `GET/POST/PATCH/DELETE` en `/calendar/events`.

### Roadmap Estratégico (Visualizado)
- **Infraestructura**:
  - **Colas y Rate Limiting**: Reforzar uso de BullMQ para escalar (match con Arquitectura Central).
  - **Data Warehouse**: Futura integración con BigQuery para analíticas masivas.
- **Nuevos Módulos (Blue Ocean)**:
  - **Opportunity Detector**: Nuevo agente `@strategy-agent` para algoritmos de detección de nichos.
  - **GMC Integration**: Sincronización de inventario en tiempo real (Google Merchant Center).

## [0.9.0] - 2025-12-15
### Added
- **CRM Unificado**: Consolidación de "Negocios" y "Clientes" en `/crm` con vista única.
  - Filtros por tipo: Semillas (Leads) vs Clientes Activos
  - Búsqueda por nombre, dirección, categoría
  - ABM completo (Alta, Baja, Modificación)
  - Sistema de notas por cliente
  - Conversión de Lead a Cliente Activo
- **Sistema de Alertas y Recordatorios**: Nuevo sistema de tracking de contactos.
  - Modelo `Reminder` con estados: PENDING → ACTIVE → COMPLETED/DISMISSED
  - Dashboard con sidebar "📢 Alertas" (vencidos en rojo, próximos en amarillo)
  - Creación de recordatorios con fecha y usuario asignado
  - Auto-actualización de estado cuando llega la fecha
- **Asignación de Proyectos**: Los proyectos ahora pueden asignarse a usuarios específicos.
  - Dropdown de asignación en vista expandida del proyecto
  - Relación `Project.assignedTo` → `User`
- **Nuevos Usuarios**: Lucas y Nahuel agregados al sistema.

### Changed
- **Dashboard Home**: Rediseño con layout de 2 columnas (Alertas + Menú principal).
- **Projects Page**: Nueva fila de acciones con asignación y creación de recordatorios.

### Database
- **Nueva migración**: `add_reminders_and_project_assignment`
- **Nuevos modelos**: `Reminder`, `ReminderStatus` enum
- **Campos nuevos**: `Project.assignedToId`, `Client.reminders`

### API Endpoints
- `GET /gmb/reminders` - Listar recordatorios (con auto-update de estado)
- `POST /gmb/reminders` - Crear recordatorio
- `PATCH /gmb/reminders/:id` - Actualizar estado
- `DELETE /gmb/reminders/:id` - Eliminar recordatorio
- `PATCH /gmb/projects/:id/assign` - Asignar proyecto a usuario
- `GET /gmb/users` - Listar usuarios del sistema
- `DELETE /gmb/clients/:id` - Eliminar cliente

### Fixed
- **Delete Client**: Agregado endpoint faltante para eliminar clientes.
- **PATCH Route**: Corregido `/client/` → `/clients/` (plural) para consistencia.

## [0.8.1] - 2025-12-12
### Performance
- **Blocking Script Removal**: Moved `html2pdf.js` from global layout to on-demand loading in ReportTab (-500ms initial load).
- **Code Splitting**: Implemented dynamic imports for `AnalysisTab`, `AuditTab`, `MapTab`, and `ReportTab` (-300ms per navigation).
- **Memoization**: Added `useMemo` and `useCallback` hooks to GMB page for optimized tab state management.
- **External Resource Cleanup**: Removed default Unsplash placeholder image from PostComposer (-200ms on calendar page).

### Added
- **Agent Definitions**: Created `.github/agents/` directory with specialized agent files:
  - `docs-agent.md`: Technical Writer with documentation boundaries.
  - `test-agent.md`: QA Engineer with Jest patterns and AAA structure.
  - `api-agent.md`: Backend Specialist with NestJS conventions.
- **Loading Skeleton**: New `TabLoadingSkeleton` component in Neo-Brutalist style for dynamic imports.
- **Type Declarations**: Added `html2pdf.d.ts` for TypeScript support.

### Fixed
- **TypeScript Error**: Removed unused `DEFAULT_CONFIG` import from `gmb/utils.ts`.
- **Type Inference**: Fixed `posts` state typing in `calendar/page.tsx` (was `never[]`, now `any[]`).
- **Middleware Compatibility**: Updated `middleware.ts` for Next.js 16 compatibility using `getToken` from `next-auth/jwt`.

### Technical
- **Dependencies**: Added `html2pdf.js` as npm dependency (previously loaded via CDN).
- **Build**: Frontend now builds successfully with Turbopack.

## [0.8.0] - 2025-12-11
### Added
- **GBP/GSC Agency Platform**: Complete multi-client management system for Google Business Profile and Search Console.
- **Google OAuth Integration**: Secure OAuth 2.0 flow for connecting client Google accounts with mock mode for development.
- **GBP Review Management**: Full review dashboard with location selector, rating filters, stats, and AI-powered reply suggestions.
- **GSC Analytics**: Search performance dashboard with clicks, impressions, CTR, position tracking, and index coverage.
- **Agency Dashboard**: Multi-client overview with client management, invite links, and cross-client review alerts.
- **Mock Data System**: Comprehensive mock data service for development (3 locations, 7 reviews, 3 GSC properties).
- **Database Models**: New Prisma models (`GoogleCredential`, `GbpLocation`, `GscProperty`) with cascade delete.

### Technical
- **New Backend Modules**: `GoogleAuthModule`, `GbpReviewsModule`, `GscModule`, `AgencyModule`.
- **New Frontend Components**: `GoogleConnectButton`, `ReviewsTab`, `GscTab`, `AgencyDashboard`.
- **API Endpoints**: 15+ new REST endpoints for auth, reviews, analytics, and agency management.

## [0.7.0] - 2025-12-10
### Added
- **GMB Audit v0.3.1**: Enhanced audit capabilities with Gemini 2.5 Flash.
- **Deep Analysis**: Added SWOT Analysis, SEO Keyword Intent (Transactional/Informational), Gap Analysis, and Phased Action Plans.
- **Context Awareness**: New inputs for "Zone Context" and "Target Products" to tailor AI advice.
- **PDF Reporting**: Client-side PDF generation for professional audit reports.
- **Map Enhancements**: Visual support for "Synthetic Locations" (competitors without precise coordinates).

## [0.6.0] - 2025-12-09
### Changed
- **Neo-Brutalist Theme**: Complete style normalization across Projects and GMB sections.
- **UI Components**: Standardized "Neo" components (Buttons, Cards, Inputs).
- **Navigation**: Consistent "Back" buttons and header layouts.

## [0.5.0] - 2025-12-08
### Added
- **Client CRM**: New database system to persist "Client" business details (Name, Phone, Address, Rating).
- **Smart Caching**: Implemented PostgreSQL caching layer for GMB Search and Audits (7-day validity) to drastically reduce API usage.
- **AI Upgrade**: Upgraded to `gemini-2.5-flash` model for faster and more accurate extraction.
- **Audit Linking**: Generated audits are now automatically linked to the permanent Client record.

## [0.4.0] - 2025-12-08
### Added
- **GMB Integration**: Full migration of Google My Business Competitor Intel features.
- **Competitor Search**: AI-powered search for local competitors with "Client" detection logic.
- **Audit System**: Deep analysis of business performance, SWOT, and SEO keywords.
- **Unified Backend**: GMB logic migrated to NestJS (`GmbModule`, `GmbService`).
- **Interactive Map**: Leaflet-based map component with radius and keyword search.
- **PDF Reports**: Automated report generation for competitive analysis.

## [0.3.0] - 2025-12-03
### Added
- **Neo-Brutalist UI**: Complete redesign of the Analytics page and core components.
- **Analytics Dashboard**: Real-time fetching of Instagram Reach and Profile Views.
- **Design System**: `NeoButton`, `NeoCard`, `NeoInput` components with Tailwind v4 configuration.
- **Changelog Page**: New UI section to track version history.

### Fixed
- **API Permissions**: Resolved `(#10) Application does not have permission` by updating Access Token.
- **Data Normalization**: Fixed issue where Instagram API returned `total_value` instead of `values` array.
- **Crash**: Fixed `TypeError` in Analytics page when data was missing.

## [0.2.0] - 2025-12-02
### Added
- **Media System**: Backend support for image uploads via Multer.
- **Post Composer**: Basic UI for creating and scheduling posts.
- **Instagram Integration**: Initial connection and data seeding.

## [0.1.0] - 2025-12-01
### Added
- **Project Setup**: Initial Monorepo structure (NestJS + Next.js).
- **Database**: PostgreSQL + Prisma configuration.
- **Authentication**: Basic NextAuth setup.
