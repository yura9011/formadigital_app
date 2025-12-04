# Forma Digital App

A social media scheduling application built with **NestJS** (Backend) and **Next.js** (Frontend), designed for *Forma Digital*.

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Docker Desktop (for PostgreSQL & Redis)

### Installation

1.  **Clone the repository**
2.  **Install dependencies** (Root)
    ```bash
    npm install
    ```
3.  **Start Infrastructure**
    ```bash
    docker compose up -d
    ```
4.  **Setup Database**
    ```bash
    cd apps/backend
    npx prisma db push
    npx prisma db seed
    ```

### Running the App

**Backend (Port 3000)**
```bash
cd apps/backend
npm run start:dev
```

**Frontend (Port 3001)**
```bash
cd apps/frontend
npm run dev -- -p 3001
```

# Forma Digital App

A social media scheduling application built with **NestJS** (Backend) and **Next.js** (Frontend), designed for *Forma Digital*.

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Docker Desktop (for PostgreSQL & Redis)

### Installation

1.  **Clone the repository**
2.  **Install dependencies** (Root)
    ```bash
    npm install
    ```
3.  **Start Infrastructure**
    ```bash
    docker compose up -d
    ```
4.  **Setup Database**
    ```bash
    cd apps/backend
    npx prisma db push
    npx prisma db seed
    ```

### Running the App

**Backend (Port 3000)**
```bash
cd apps/backend
npm run start:dev
```

**Frontend (Port 3001)**
```bash
cd apps/frontend
npm run dev -- -p 3001
```

## 🏗 Architecture

-   **Monorepo**: Managed with npm workspaces.
-   **Backend**: NestJS, Prisma (Postgres), BullMQ (Redis).
-   **Frontend**: Next.js 14 (App Router), TailwindCSS, NextAuth.js.
-   **Authentication**: Credentials (Email/Password).
-   **Integrations**: Modular provider system (supports **Instagram Graph API** and **Facebook Graph API**).
    -   **Facebook App Permissions Required**:
        -   `pages_manage_posts` (Create posts)
        -   `pages_read_engagement` (Read profile/posts)
        -   `pages_show_list` (List pages)
        -   `read_insights` (Analytics)
        -   `instagram_basic` (Instagram Profile)
        -   `instagram_content_publish` (Instagram Posting)
        -   `instagram_manage_insights` (Instagram Analytics)

## 🔑 Default Credentials

-   **Admin User**: `admin@formadigital.com`
-   **Password**: `admin123`
