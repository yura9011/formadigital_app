# AGENT.MD - Project Knowledge Base

> [!IMPORTANT]
> This file contains critical information for any agent working on **Forma Digital App**. Read this before starting any task.

## 1. Project Overview
**Forma Digital App** is a comprehensive Social Media Management and GMB (Google My Business) Optimization platform. It follows a Monorepo structure containing a **Next.js Frontend** and a **NestJS Backend**.

-   **Core Goal**: Automate social media scheduling, analyze competitors via GMB, and manage client projects.
-   **Visual Identity**: **Neo-Brutalism (Bauhaus Style)**. High contrast, thick borders, bold typography, hard shadows (Black/White/Red/Blue/Yellow).

## 2. Tech Stack

### Frontend (`apps/frontend`)
-   **Framework**: Next.js 16 (App Router)
-   **Language**: TypeScript
-   **Styling**: TailwindCSS v4, Custom Neo-Brutalist Design System.
-   **Key Libraries**:
    -   `recharts`: Analytics visualization.
    -   `@fullcalendar/*`: Social media content calendar.
    -   `react-hot-toast`: Toast notifications.
    -   `leaflet`: Map visualization for GMB.
    -   `html2pdf.js`: Client-side PDF generation (on-demand loaded).

### Backend (`apps/backend`)
-   **Framework**: NestJS 11
-   **Language**: TypeScript
-   **Database**: PostgreSQL (via Prisma ORM).
-   **Queue/Cache**: Redis (BullMQ, CacheManager).
-   **AI**: Google Generative AI (Gemini Flash).
-   **File Storage**: Local uploads (Multer).

## 3. Agent Entry Points

> [!TIP]
> **¿Sos un agente de IA nuevo?** Lee en este orden:
> 1. [`.agent/context.md`](./.agent/context.md) → Estado actual del proyecto
> 2. [`.agent/sessions/`](./.agent/sessions/) → Última sesión de trabajo
> 3. [`SALES_PLAYBOOK.md`](./SALES_PLAYBOOK.md) → Para tareas de ventas
> 4. [`.github/agents/`](./.github/agents/) → Para tareas técnicas

### Workflows Disponibles
- `/run-prospecting` → Ejecutar sesión de prospección
- `/contact-lead` → Preparar mensaje para lead

### Directory Structure

```
forma-digital-app/
├── .agent/             # 🤖 Agent Configuration
│   ├── context.md      # Estado actual del proyecto
│   ├── mcp-setup.md    # Cómo conectar MCP Server
│   ├── sessions/       # Logs de sesiones
│   ├── workflows/      # Workflows ejecutables
│   └── specs/          # Especificaciones técnicas
├── .github/agents/     # Definiciones de agentes especializados (6)
├── apps/
│   ├── frontend/       # Next.js 16 (App Router)
│   └── backend/        # NestJS 11 + Prisma
├── scripts/agent_v2/   # Python Agent (Scraper, Outreach)
├── AGENT.MD            # Este archivo
└── SALES_PLAYBOOK.md   # Manual de ventas
```

## 4. Key Functional Areas

### 4.1. GMB Intelligence (`/gmb`)
-   **Features**: Competitor search, Audit generation, Client management.
-   **Tech**: Leaflet Maps, Geolocation scoring, Weighted ranking.
-   **Key Files**: `gmb.service.ts`, `MapTab.tsx`, `AnalysisTab.tsx`.

### 4.2. Project Management (`/projects`)
-   **Features**: Kanban-like tracking of client projects (Planning -> In Progress -> Completed).
-   **Templates**: Auto-seeding of standard workflows (GMB Optimization, RRSS Mgmt).

### 4.3. Analytics & Reporting (`/analytics`)
-   **Features**: Visualizing Instagram/Facebook insights.
-   **Tech**: Recharts.

## 5. Environment & Configuration

### Backend `.env`
-   `DATABASE_URL`: PostgreSQL connection string.
-   `REDIS_HOST` / `REDIS_PORT`: Redis connection.
-   `GEMINI_API_KEY`: Google AI API Key.

### Frontend `.env`
-   `NEXT_PUBLIC_API_URL`: Backend URL (usually `http://localhost:3000` or host IP).

## 6. Development Workflow
1.  **Start Dev**: Run `dev.bat` in the root directory.
2.  **Database**: Managed via Prisma. Run `npx prisma web` in `apps/backend` to view data.
3.  **Code Style**: Strict adherence to **Neo-Brutalism** for UI.
    -   **DO NOT** use rounded, soft shadows or gradients.
    -   **DO** use `border-2`, `border-black`, `shadow-neo`, `font-black`, `uppercase`.

## 7. Specialized Agents

This project includes specialized AI agent definitions in `.github/agents/`:

| Agent | Role | Boundaries |
|-------|------|------------|
| `@docs-agent` | Technical Writer | Never modifies `src/` code |
| `@test-agent` | QA Engineer | Never deletes failing tests |
| `@api-agent` | Backend Specialist | Ask first for schema changes |
| `@frontend-agent` | Frontend Specialist | Never uses rounded corners or gradients |

See individual agent files for detailed instructions and code patterns.

## 8. Known Issues / Notes
-   **Redis Dependency**: The backend *requires* Redis. Ensure it's running (usually via Docker or local service).
-   **History Navigation**: We explicitly use `window.location.href = '/'` for "Back to Main Menu" buttons to ensure a full reset, rather than `history.back()`.
-   **Middleware Deprecation**: Next.js 16 deprecated the middleware file convention. Current implementation uses `getToken` from `next-auth/jwt`.
-   **Dynamic Imports**: Heavy components (`AnalysisTab`, `AuditTab`, `ReportTab`) use `dynamic()` for code splitting.
