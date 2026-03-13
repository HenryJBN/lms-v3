# DigitalOcean Deployment Guide (Staging)

This guide provides a step-by-step walkthrough for deploying your LMS to a DigitalOcean Droplet using Docker Compose and DO Spaces for file storage.

## 1. Recommended Droplet Configuration
For a staging environment, use the following:
- **Type:** Basic Droplet (Shared CPU)
- **CPU/RAM:** 2 GB RAM / 1 CPU (Regular Intel or Premium Intel)
- **OS:** Ubuntu 22.04 LTS
- **Data Center:** Same region as your intended DO Space (e.g., nyc3)

## 2. DigitalOcean Spaces Setup
1. Create a **Space** (e.g., `lms-staging-assets`) in your preferred region.
2. Go to **Settings** -> **CORS Configurations** and add your Droplet's IP to allowed origins.
3. Go to **API** -> **Spaces Access Keys** and generate a new key.
   - Save the **Access Key** and **Secret Key**.

## 3. Server Preparation (SSH into your Droplet)
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt install docker-compose-plugin -y
```

## 4. Deploying the Application
1. **Clone the repository** (if you haven't yet) or copy your files.
2. **Configure Environment Variables:**
   Create `/backend/.env.production` on the server:
   ```env
   # Database (Local Postgres in Docker)
   DATABASE_URL=postgresql+asyncpg://lms_user:YOUR_STRONG_PASSWORD@postgres:5432/lms_database

   # DigitalOcean Spaces
   FILE_UPLOAD_PROVIDER=digitalocean
   DO_ACCESS_KEY_ID=your_access_key
   DO_SECRET_ACCESS_KEY=your_secret_key
   DO_SPACE_NAME=lms-staging-assets
   DO_REGION=nyc3
   # Use sslip.io for backend if you don't have a domain yet
   BACKEND_URL=http://YOUR_DROPLET_IP.sslip.io

   # App Settings
   APP_ENV=production
   SECRET_KEY=generate_a_random_string
   ```

3. **Update Docker Compose:**
   Ensure `docker-compose.yml` uses the `postgres-data` volume (already set up in your project).

4. **Launch:**
   ```bash
   docker compose up -d --build
   ```

## 5. Initial Setup
Once the containers are running, initialize your platform:

1. **Create Super Admin:**
   ```bash
   docker exec -it lms-backend python scripts/create_super_admin.py --email admin@example.com --password YourPassword
   ```

2. **Access the Platform:**
   - Open: `http://YOUR_DROPLET_IP.sslip.io`
   - Login with your super admin credentials.
   - Create your first tenant (e.g., `idice`).

## 6. Accessing Tenants
Access your new tenant at:
`http://idice.YOUR_DROPLET_IP.sslip.io`

---
> [!TIP]
> **SSlip.io Tip:** If your IP is `137.32.43.5`, use `137.32.43.5.sslip.io` as your base domain.
