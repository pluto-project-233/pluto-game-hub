# Local Development Guide

## Prerequisites

1. **PostgreSQL** installed locally
2. **Node.js 20+**
3. **Firebase project** with service account JSON

---

## Local Setup

### 1. Install PostgreSQL

**On Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

**On macOS:**
```bash
brew install postgresql@16
brew services start postgresql@16
```

### 2. Create Local Database

```bash
# Connect to PostgreSQL
sudo -u postgres psql

# Create database and user
CREATE DATABASE pluto_dev;
CREATE USER postgres WITH PASSWORD 'postgres';
GRANT ALL PRIVILEGES ON DATABASE pluto_dev TO postgres;
\q
```

### 3. Configure Environment

```bash
# Copy local environment file
cp .env.example .env

# Edit .env with these values:
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/pluto_dev"
FIREBASE_SERVICE_ACCOUNT='{"type": "service_account", ...}'
JWT_SECRET="3e608adbbb03867e71c64f3da2fd04ba4a5d591787679759d1f3625850b9e03b"
HMAC_SECRET="7a230607a59155c1a90da1669c716527a8ad02d94f67d92565f7d47a1ed53dc4"
```

### 4. Push Database Schema

```bash
npm run db:push
```

### 5. Start Development Server

```bash
npm run dev
```

Server will be running at `http://localhost:3000`

---

## Railway Deployment

### 1. Create Railway Project

1. Go to [railway.app](https://railway.app)
2. Create new project
3. Add **PostgreSQL** plugin

### 2. Connect GitHub Repository

1. Connect your GitHub account
2. Select the `pluto-project` repository
3. Railway will auto-detect Node.js

### 3. Configure Environment Variables

In Railway dashboard, add these variables:

```bash
# Database (automatically set by PostgreSQL plugin)
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Firebase
FIREBASE_SERVICE_ACCOUNT='{"type": "service_account", ...}'

# Server
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# Secrets (generate with: openssl rand -hex 32)
JWT_SECRET=<your-production-secret>
HMAC_SECRET=<your-production-secret>
```

### 4. Configure Build Settings

Railway should auto-detect, but verify:

**Build Command:**
```bash
npm install && npm run db:generate
```

**Start Command:**
```bash
npm start
```

### 5. Deploy

```bash
# Push to GitHub
git add .
git commit -m "Deploy to Railway"
git push origin main
```

Railway will automatically deploy on push.

### 6. Run Database Migrations

In Railway dashboard:
1. Open your service
2. Go to "Settings" → "Deploy"
3. Add one-time command: `npm run db:push`

---

## Testing the API

### Local Testing

1. **Import Postman Collection:**
   - File: `postman/pluto-hub.postman_collection.json`
   - Set `baseUrl` to `http://localhost:3000/v1`

2. **Get Firebase Token:**
   - Use Firebase Auth in your client app
   - Copy the ID token

3. **Test Endpoints:**
   - Start with `/health` to verify server is running
   - Test `/v1/me/profile` with Firebase token

### Production Testing

Same as local, but set `baseUrl` to your Railway domain:
```
https://your-app.railway.app/v1
```

---

## Common Issues

### PostgreSQL Connection Failed

```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Restart if needed
sudo systemctl restart postgresql
```

### Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>
```

### Prisma Client Not Generated

```bash
npm run db:generate
```
