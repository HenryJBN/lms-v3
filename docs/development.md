# DCA LMS — Local Development Setup

> This guide walks you through setting up the project for local development on macOS or Linux.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Clone & Configure](#2-clone--configure)
3. [Hosts File Setup](#3-hosts-file-setup)
4. [Backend Setup](#4-backend-setup)
5. [Frontend Setup](#5-frontend-setup)
6. [Start Development](#6-start-development)
7. [Project Structure](#7-project-structure)
8. [Common Commands](#8-common-commands)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Prerequisites

Install the following tools:

| Tool | Version | Install |
|------|---------|---------|
| **Node.js** | v18+ | `brew install node` or [nvm](https://github.com/nvm-sh/nvm) |
| **pnpm** | v9+ | `corepack enable && corepack prepare pnpm@9.12.0 --activate` |
| **Python** | 3.11+ | `brew install python@3.11` |
| **PostgreSQL** | 14+ | `brew install postgresql@16 && brew services start postgresql@16` |
| **Redis** | 7+ | `brew install redis && brew services start redis` |

### Verify installations

```bash
node --version      # v18+
pnpm --version      # 9+
python3 --version   # 3.11+
psql --version      # 14+
redis-cli ping      # PONG
```

---

## 2. Clone & Configure

```bash
# Clone the repository
git clone https://github.com/your-org/lms-v3.git
cd lms-v3
```

---

## 3. Hosts File Setup

The app uses `dcalms.test` as the local domain for multi-tenant subdomain routing.

```bash
# Edit hosts file (requires sudo)
sudo nano /etc/hosts

# Add these lines:
127.0.0.1   dcalms.test
127.0.0.1   tenant1.dcalms.test
127.0.0.1   tenant2.dcalms.test
127.0.0.1   demo.dcalms.test
```

> **Tip:** Add additional `*.dcalms.test` entries for any tenants you want to test. Each subdomain needs its own line since `/etc/hosts` doesn't support wildcards.

---

## 4. Backend Setup

### 4.1 Create Virtual Environment

```bash
cd backend

# Create and activate venv
python3 -m venv .venv
source .venv/bin/activate
```

### 4.2 Install Dependencies

```bash
pip install -r requirements.txt
```

### 4.3 Create Database

```bash
# Create the database
createdb lms_database

# Or with psql
psql -c "CREATE DATABASE lms_database;"
```

### 4.4 Configure Environment

```bash
# Copy the example env file
cp .env.example .env

# Edit .env and update:
# - DATABASE_URL with your local PostgreSQL credentials
# - REDIS_URL (default redis://127.0.0.1:6379/0 should work)
nano .env
```

Key values for your `.env`:

```env
APP_ENV=development
DATABASE_URL=postgresql+asyncpg://YOUR_USERNAME:YOUR_PASSWORD@localhost:5432/lms_database
REDIS_URL=redis://127.0.0.1:6379/0
```

### 4.5 Run Database Migrations

```bash
# Apply all migrations
alembic upgrade head

# Or, for first-time setup without migrations, set INIT_DB=1 in .env
# and start the server — tables will be created automatically
```

### 4.6 Start Backend Server

```bash
# With auto-reload for development
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The API will be available at: `http://dcalms.test:8000`  
API docs (Swagger): `http://dcalms.test:8000/docs`

---

## 5. Frontend Setup

Open a **new terminal** in the project root:

### 5.1 Install Dependencies

```bash
# From the project root (not /backend)
cd /path/to/lms-v3
pnpm install
```

### 5.2 Configure Environment

```bash
# Copy the example env file
cp .env.local.example .env.local

# Default values should work for local development
# Edit if needed:
nano .env.local
```

### 5.3 Start Frontend Server

```bash
pnpm dev
```

The frontend will be available at: `http://dcalms.test:3000`

---

## 6. Start Development

You need **4 terminal windows** for full local development:

| Terminal | Directory | Command | Purpose |
|----------|-----------|---------|---------|
| 1 | `backend/` | `source .venv/bin/activate && uvicorn main:app --host 0.0.0.0 --port 8000 --reload` | FastAPI server |
| 2 | `backend/` | `source .venv/bin/activate && ./start_celery.sh` | Celery worker |
| 3 | Root | `pnpm dev` | Next.js frontend |
| 4 | — | General use | Run commands, git, etc. |

### Quick Start (copy-paste)

```bash
# Terminal 1 — Backend
cd backend && source .venv/bin/activate && uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2 — Celery (optional, only if you need background tasks)
cd backend && source .venv/bin/activate && ./start_celery.sh

# Terminal 3 — Frontend
pnpm dev
```

### Access URLs

| Service | URL |
|---------|-----|
| **Frontend** | http://dcalms.test:3000 |
| **Backend API** | http://dcalms.test:8000 |
| **Swagger Docs** | http://dcalms.test:8000/docs |
| **Health Check** | http://dcalms.test:8000/health |
| **Flower** (Celery monitor) | http://localhost:5555 |
| **Tenant Example** | http://tenant1.dcalms.test:3000 |

---

## 7. Project Structure

```
lms-v3/
├── app/                    # Next.js pages (App Router)
├── components/             # React components (shadcn/ui based)
├── hooks/                  # Custom React hooks
├── lib/                    # Utilities, API client, services
├── types/                  # TypeScript type definitions
├── styles/                 # Global CSS
├── public/                 # Static assets
├── middleware.ts           # Next.js middleware (tenant routing)
│
├── backend/
│   ├── main.py             # FastAPI app entry point
│   ├── celery_app.py       # Celery configuration
│   ├── database/           # DB session, engine setup
│   ├── models/             # SQLModel / SQLAlchemy models
│   ├── schemas/            # Pydantic request/response schemas
│   ├── routers/            # API route handlers
│   ├── middleware/          # Auth middleware, logging
│   ├── migrations/         # Alembic database migrations
│   ├── tasks/              # Celery background tasks
│   ├── utils/              # Utility functions
│   └── templates/          # Email templates (Jinja2)
│
├── docs/                   # Documentation
│   ├── deployment.md       # Production deployment guide
│   └── development.md      # This file
│
├── nginx/                  # Nginx config (production only)
├── docker-compose.yml      # Production Docker setup
├── Dockerfile              # Frontend Docker image
└── scripts/                # Utility scripts
```

---

## 8. Common Commands

### Backend

| Action | Command |
|--------|---------|
| Start server | `uvicorn main:app --host 0.0.0.0 --port 8000 --reload` |
| Run tests | `pytest` |
| Create migration | `alembic revision --autogenerate -m "description"` |
| Apply migrations | `alembic upgrade head` |
| Rollback migration | `alembic downgrade -1` |
| Start Celery worker | `./start_celery.sh` |
| Start Flower | `./start_flower.sh` |

### Frontend

| Action | Command |
|--------|---------|
| Start dev server | `pnpm dev` |
| Build production | `pnpm build` |
| Start production | `pnpm start` |
| Lint | `pnpm lint` |
| Format code | `pnpm format` |
| Check formatting | `pnpm format:check` |

### Database

| Action | Command |
|--------|---------|
| Create database | `createdb lms_database` |
| Drop database | `dropdb lms_database` |
| Open psql shell | `psql lms_database` |
| Reset DB (nuclear) | `dropdb lms_database && createdb lms_database && cd backend && alembic upgrade head` |

---

## 9. Troubleshooting

### Port already in use

```bash
# Find what's using port 8000 or 3000
lsof -i :8000
lsof -i :3000

# Kill the process
kill -9 <PID>
```

### Database connection refused

```bash
# Check if PostgreSQL is running
brew services list

# Start PostgreSQL
brew services start postgresql@16
```

### Redis connection refused

```bash
# Check if Redis is running
redis-cli ping

# Start Redis
brew services start redis
```

### Permission denied on `start_celery.sh`

```bash
chmod +x backend/start_celery.sh
chmod +x backend/start_flower.sh
```

### Frontend can't reach backend

- Ensure both are running and using `dcalms.test` (not `localhost`)
- Check that `/etc/hosts` has the `dcalms.test` entry
- Verify `NEXT_PUBLIC_API_URL=http://dcalms.test:8000` in `.env.local`
