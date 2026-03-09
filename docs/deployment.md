# DCA LMS — Production Deployment Guide

> **Stack:** Next.js 14 + FastAPI + PostgreSQL + Redis + Celery  
> **Method:** Docker Compose on a single VPS  
> **Multi-tenancy:** Wildcard subdomains (`*.yourdomain.com`)

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Server Setup](#2-server-setup)
3. [DNS Configuration](#3-dns-configuration)
4. [Project Setup](#4-project-setup)
5. [SSL Certificates](#5-ssl-certificates)
6. [Environment Configuration](#6-environment-configuration)
7. [Deploy](#7-deploy)
8. [Database Migrations](#8-database-migrations)
9. [CI/CD with GitHub Actions](#9-cicd-with-github-actions)
10. [Monitoring & Maintenance](#10-monitoring--maintenance)
11. [Scaling Up](#11-scaling-up)

---

## 1. Prerequisites

| Requirement | Minimum |
|------------|---------|
| **VPS** | 4 vCPU, 8GB RAM (e.g., DigitalOcean Droplet `s-4vcpu-8gb`) |
| **OS** | Ubuntu 22.04 LTS |
| **Domain** | `yourdomain.com` with DNS access |
| **Git repo** | Project pushed to GitHub/GitLab |

### Recommended VPS Providers

| Provider | Plan | Cost |
|----------|------|------|
| DigitalOcean | Premium Intel 4vCPU/8GB | ~$48/mo |
| Hetzner | CPX31 (4vCPU/8GB) | ~$15/mo |
| Linode | Dedicated 4GB | ~$36/mo |

---

## 2. Server Setup

### 2.1 Initial Server Security

```bash
# Connect to your server
ssh root@your-server-ip

# Update system
apt update && apt upgrade -y

# Create a deploy user
adduser deploy
usermod -aG sudo deploy

# Setup SSH key authentication for deploy user
mkdir -p /home/deploy/.ssh
cp ~/.ssh/authorized_keys /home/deploy/.ssh/
chown -R deploy:deploy /home/deploy/.ssh

# Disable root SSH login (edit /etc/ssh/sshd_config)
sed -i 's/PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
systemctl restart sshd
```

### 2.2 Firewall

```bash
# Setup UFW firewall
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

### 2.3 Install Docker

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh

# Add deploy user to docker group
usermod -aG docker deploy

# Install Docker Compose plugin
apt install docker-compose-plugin -y

# Verify installation
docker --version
docker compose version
```

> **Note:** Log out and back in as `deploy` for the group changes to take effect.

---

## 3. DNS Configuration

Set up the following DNS records at your domain registrar:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| **A** | `@` | `your-server-ip` | 300 |
| **A** | `*` | `your-server-ip` | 300 |
| **A** | `www` | `your-server-ip` | 300 |

The wildcard `*` record is **essential** for multi-tenant subdomains (e.g., `tenant1.yourdomain.com`).

---

## 4. Project Setup

```bash
# Switch to deploy user
su - deploy

# Clone the repository
git clone https://github.com/your-org/lms-v3.git /home/deploy/lms-v3
cd /home/deploy/lms-v3

# Create SSL directory
mkdir -p nginx/ssl

# Create certbot webroot directory
mkdir -p nginx/certbot/www
```

---

## 5. SSL Certificates

### 5.1 Option A: Wildcard SSL with Certbot (Recommended)

Wildcard certificates require DNS verification. This example uses DigitalOcean DNS, but any DNS provider plugin works.

```bash
# Install certbot
apt install certbot -y

# For DigitalOcean DNS plugin:
apt install python3-certbot-dns-digitalocean -y

# Create credentials file
mkdir -p /root/.secrets
echo "dns_digitalocean_token = YOUR_DO_API_TOKEN" > /root/.secrets/digitalocean.ini
chmod 600 /root/.secrets/digitalocean.ini

# Request wildcard certificate
certbot certonly \
  --dns-digitalocean \
  --dns-digitalocean-credentials /root/.secrets/digitalocean.ini \
  -d "yourdomain.com" \
  -d "*.yourdomain.com" \
  --agree-tos \
  --email admin@yourdomain.com

# Copy certs to project
cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem /home/deploy/lms-v3/nginx/ssl/
cp /etc/letsencrypt/live/yourdomain.com/privkey.pem /home/deploy/lms-v3/nginx/ssl/
```

### 5.2 Option B: Cloudflare (Alternative)

If using Cloudflare as your DNS provider:
1. Set SSL mode to **Full (Strict)** in Cloudflare dashboard
2. Generate an Origin Certificate in Cloudflare (valid 15 years)
3. Save as `nginx/ssl/fullchain.pem` and `nginx/ssl/privkey.pem`

### 5.3 Auto-Renewal

```bash
# Test renewal
certbot renew --dry-run

# Add cron job for auto-renewal (runs twice daily)
echo "0 0,12 * * * root certbot renew --quiet && cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem /home/deploy/lms-v3/nginx/ssl/ && cp /etc/letsencrypt/live/yourdomain.com/privkey.pem /home/deploy/lms-v3/nginx/ssl/ && docker compose -f /home/deploy/lms-v3/docker-compose.yml exec nginx nginx -s reload" >> /etc/crontab
```

---

## 6. Environment Configuration

### 6.1 Backend Environment

```bash
cd /home/deploy/lms-v3/backend

# Copy the production template
cp .env.production.example .env.production

# Edit with your production values
nano .env.production
```

**Critical values to update:**

| Variable | What to set |
|----------|-------------|
| `DATABASE_URL` | `postgresql+asyncpg://lms_user:YOUR_STRONG_PASSWORD@postgres:5432/lms_database` |
| `SECRET_KEY` | Generate: `openssl rand -hex 32` |
| `ENCRYPTION_KEY` | Generate: `python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"` |
| `BASE_DOMAIN` | `yourdomain.com` |
| `REDIS_URL` | `redis://redis:6379/0` (Docker service name) |
| `FILE_UPLOAD_PROVIDER` | `digitalocean` or `aws_s3` (recommended for production) |

### 6.2 Frontend Environment (Build Args)

Create a `.env` file in the project root for Docker Compose:

```bash
cd /home/deploy/lms-v3

cat > .env << 'EOF'
# Frontend (build-time variables)
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NEXT_PUBLIC_BASE_DOMAIN=yourdomain.com
NEXT_PUBLIC_APP_NAME="DCA LMS"
NEXT_PUBLIC_API_URL=https://yourdomain.com
NEXT_PUBLIC_API_VERSION=v1

# PostgreSQL
POSTGRES_DB=lms_database
POSTGRES_USER=lms_user
POSTGRES_PASSWORD=YOUR_STRONG_PASSWORD

# Workers (adjust based on your VPS CPU cores)
UVICORN_WORKERS=4
CELERY_CONCURRENCY=4
EOF
```

> **Important:** The `POSTGRES_PASSWORD` here must match the password in `backend/.env.production`'s `DATABASE_URL`.

---

## 7. Deploy

### 7.1 Build and Start

```bash
cd /home/deploy/lms-v3

# Build all images
docker compose build

# Start all services in detached mode
docker compose up -d

# Verify all containers are running
docker compose ps
```

### 7.2 Verify Deployment

```bash
# Check container health
docker compose ps

# Expected output:
# lms-nginx          running   0.0.0.0:80->80/tcp, 0.0.0.0:443->443/tcp
# lms-frontend       running (healthy)   3000/tcp
# lms-backend        running (healthy)   8000/tcp
# lms-celery-worker  running             
# lms-celery-beat    running             
# lms-postgres       running (healthy)   5432/tcp
# lms-redis          running (healthy)   6379/tcp

# Test health endpoint
curl https://yourdomain.com/health

# View logs if something is wrong
docker compose logs backend
docker compose logs frontend
```

---

## 8. Database Migrations

### 8.1 Run Alembic Migrations

```bash
# Run migrations inside the backend container
docker compose exec backend alembic upgrade head
```

### 8.2 First-Time Setup (Create Tables)

If this is a fresh deployment without existing migrations:

```bash
# Force table creation via init_db
docker compose exec backend env INIT_DB=1 python -c "
import asyncio
from database.session import init_db
asyncio.run(init_db())
"
```

---

## 9. CI/CD with GitHub Actions

### 9.1 Setup SSH Deploy Key

```bash
# On your LOCAL machine, generate a deploy key
ssh-keygen -t ed25519 -f ~/.ssh/lms_deploy_key -C "lms-deploy"

# Copy the public key to the server
ssh-copy-id -i ~/.ssh/lms_deploy_key.pub deploy@your-server-ip
```

Add the private key as a GitHub secret named `SSH_PRIVATE_KEY` in your repository settings.

### 9.2 GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: deploy
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /home/deploy/lms-v3
            git pull origin main
            docker compose build
            docker compose up -d
            docker compose exec -T backend alembic upgrade head
            docker image prune -f
```

### 9.3 Required GitHub Secrets

| Secret | Value |
|--------|-------|
| `SERVER_HOST` | Your VPS IP address |
| `SSH_PRIVATE_KEY` | Contents of `~/.ssh/lms_deploy_key` |

---

## 10. Monitoring & Maintenance

### 10.1 View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f celery-worker

# Last 100 lines
docker compose logs --tail=100 backend
```

### 10.2 Database Backups

```bash
# Manual backup
docker compose exec postgres pg_dump -U lms_user lms_database > backup_$(date +%Y%m%d_%H%M%S).sql

# Automated daily backups via cron
echo "0 3 * * * deploy docker compose -f /home/deploy/lms-v3/docker-compose.yml exec -T postgres pg_dump -U lms_user lms_database | gzip > /home/deploy/backups/lms_\$(date +\%Y\%m\%d).sql.gz" >> /etc/crontab

# Create backups directory
mkdir -p /home/deploy/backups
```

### 10.3 Restore Database

```bash
# Restore from backup
cat backup_20260306.sql | docker compose exec -T postgres psql -U lms_user lms_database
```

### 10.4 Useful Commands

| Action | Command |
|--------|---------|
| Restart all services | `docker compose restart` |
| Restart single service | `docker compose restart backend` |
| Rebuild and restart | `docker compose up -d --build` |
| Stop all services | `docker compose down` |
| Stop and remove volumes | `docker compose down -v` ⚠️ **Deletes data!** |
| View resource usage | `docker stats` |
| Shell into container | `docker compose exec backend bash` |
| Run one-off command | `docker compose exec backend python -c "print('hello')"` |

### 10.5 Monitoring (Optional)

For production monitoring, consider:

- **[Uptime Kuma](https://github.com/louislam/uptime-kuma):** Self-hosted uptime monitoring (deploy alongside your stack)
- **[Sentry](https://sentry.io):** Error tracking (free tier: 5k events/mo) — set `SENTRY_DSN` in env
- **`docker stats`:** Built-in resource monitoring

---

## 11. Scaling Up

When your single VPS reaches its limits, here's how to scale progressively:

### Stage 1: Vertical Scaling (Quick Fix)

Resize your VPS to a larger plan:

```bash
# Typically done via your cloud provider's dashboard
# e.g., DigitalOcean: Droplets → Resize → choose bigger plan
# No code changes needed — just restart docker compose after resize
```

| CPU/RAM | Approximate Capacity |
|---------|---------------------|
| 4 vCPU / 8GB | ~3,000 concurrent users |
| 8 vCPU / 16GB | ~6,000 concurrent users |
| 16 vCPU / 32GB | ~10,000+ concurrent users |

### Stage 2: Managed Database (Recommended Next Step)

Move PostgreSQL out of Docker to a managed service for automatic backups, failover, and connection pooling:

```bash
# 1. Create a managed PostgreSQL instance (e.g., DigitalOcean Managed Database)
# 2. Migrate your data
docker compose exec postgres pg_dump -U lms_user lms_database > full_backup.sql
psql -h your-managed-db-host -U lms_user -d lms_database < full_backup.sql

# 3. Update backend/.env.production
# DATABASE_URL=postgresql+asyncpg://lms_user:password@your-managed-db-host:25060/lms_database?sslmode=require

# 4. Remove the postgres service from docker-compose.yml
# 5. Redeploy
docker compose up -d
```

### Stage 3: Horizontal Scaling (Multiple VPS)

Deploy 2+ app servers behind a load balancer:

```
Load Balancer (DigitalOcean LB — $12/mo)
├── VPS 1: Next.js + FastAPI + Celery Worker
├── VPS 2: Next.js + FastAPI + Celery Worker
├── Managed PostgreSQL (with HA standby)
└── Managed Redis
```

**Steps:**
1. **Create a DigitalOcean Load Balancer** pointing to both VPS instances (ports 80 & 443)
2. **Move SSL termination** to the load balancer (it handles wildcard certs)
3. **Simplify Nginx** — remove SSL config, keep only the reverse proxy directives
4. **Clone your VPS** or run `docker compose up -d` on the second server with the same config
5. **Use managed Redis** — both servers need to share the same Redis and PostgreSQL

Key changes for multi-server:
- Session/cache data must be in Redis (already the case)
- File uploads must use S3/Spaces (not local storage)
- Database must be external (managed PostgreSQL)

### Stage 4: Kubernetes (10k+ Concurrent Users)

When you need auto-scaling, self-healing, and zero-downtime deployments:

1. **Use DigitalOcean Kubernetes (DOKS)** or **AWS EKS**
2. **Your existing Docker images work as-is** — just add Kubernetes manifests
3. **Use Helm charts** for standardized deployments
4. **Add Horizontal Pod Autoscaler (HPA)** to scale based on CPU/memory

```
This is the natural migration path:
  Docker Compose (single VPS)
    → Docker Compose (multi-VPS + LB)
      → Kubernetes (full orchestration)
```

> **Tip:** You likely won't need Kubernetes until you're consistently above 10,000 concurrent users or require strict SLA guarantees. The multi-VPS setup in Stage 3 handles most growth scenarios.

---

## Quick Reference

| Task | Command |
|------|---------|
| **Start** | `docker compose up -d` |
| **Stop** | `docker compose down` |
| **Rebuild** | `docker compose up -d --build` |
| **Logs** | `docker compose logs -f` |
| **Status** | `docker compose ps` |
| **Migrate DB** | `docker compose exec backend alembic upgrade head` |
| **Backup DB** | `docker compose exec postgres pg_dump -U lms_user lms_database > backup.sql` |
| **Shell** | `docker compose exec backend bash` |
