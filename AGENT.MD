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

### Backend (`apps/backend`)
-   **Framework**: NestJS 11
-   **Language**: TypeScript
-   **Database**: PostgreSQL (via Prisma ORM).
-   **Queue/Cache**: Redis (BullMQ, CacheManager).
-   **AI**: Google Generative AI (Gemini Flash).
-   **File Storage**: Local uploads (Multer).

## 3. Directory Structure

```
d:/tareas/exp003 - postix/forma-digital-app/
├── apps/
│   ├── frontend/       # Next.js Application
│   │   ├── src/app/    # App Router Pages (Projects, GMB, Settings, etc.)
│   │   └── src/components/ # Neo-UI Components
│   └── backend/        # NestJS Application
│       ├── src/gmb/    # GMB Logic (Service/Controller)
│       └── prisma/     # Database Schema
├── tools/              # Utility scripts
├── dev.bat             # Start Development Environment (Frontend + Backend)
└── host_mode.bat       # Start in Host Mode (Public Access)
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

## 7. Known Issues / Notes
-   **Redis Dependency**: The backend *requires* Redis. Ensure it's running (usually via Docker or local service).
-   **History Navigation**: We explicitly use `window.location.href = '/'` for "Back to Main Menu" buttons to ensure a full reset, rather than `history.back()`.
