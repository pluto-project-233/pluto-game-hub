# Supabase Setup Guide

## Overview

This guide explains how to set up Supabase as the database for Pluto Hub.

## What is Supabase?

Supabase is an open-source Firebase alternative that provides:
- Managed PostgreSQL database
- Built-in connection pooling (PgBouncer)
- Database dashboard with Table Editor and SQL Editor  
- Automatic backups (paid plans)
- Real-time capabilities (optional)
- Free tier: 500MB database, unlimited API requests

## Step-by-Step Setup

### 1. Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in
3. Click **"New Project"**
4. Fill in project details:
   - **Name**: `pluto-hub` (or your preferred name)
   - **Database Password**: Generate a strong password
     - **⚠️ IMPORTANT**: Save this password - you'll need it for the connection string
   - **Region**: Choose closest to your users (e.g., `us-west-1`)
   - **Pricing Plan**: Free (sufficient for development)
5. Click **"Create new project"**
6. Wait for project to be provisioned (~2 minutes)

### 2. Get Database Connection Strings

Once the project is created:

1. Go to **Project Settings** (gear icon in sidebar)
2. Click **"Database"** in the left menu
3. Scroll to **"Connection string"** section
4. You'll see different connection modes:

**Session Mode** (for development and migrations):
```
postgres://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

**Transaction Mode** (for production with connection pooling):
```
postgres://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres
```

**Notes**:
- `[PROJECT-REF]` will be your actual project reference (shown in the connection string)
- Replace `[YOUR-PASSWORD]` with the password you created in Step 1
- Copy both connection strings for later use

### 3. Configure Local Environment

Update your `.env` file:

```bash
# Copy from .env.example if you haven't already
cp .env.example .env

# Edit .env and update DATABASE_URL
nano .env  # or use your preferred editor
```

Replace the DATABASE_URL with your Supabase Session Mode connection string:

```bash
DATABASE_URL="postgres://postgres.abcdefghijklmn:your-password@db.abcdefghijklmn.supabase.co:5432/postgres"
```

**Full `.env` example**:
```bash
# Database (Supabase)
DATABASE_URL="postgres://postgres.abcdefghijklmn:your-password@db.abcdefghijklmn.supabase.co:5432/postgres"

# Firebase
FIREBASE_SERVICE_ACCOUNT='{"type":"service_account",...}'

# Server
PORT=3000
NODE_ENV=development

# Secrets
JWT_SECRET="your-jwt-secret-here"
HMAC_SECRET="your-hmac-secret-here"
```

### 4. Run Database Migrations

Initialize the database with all tables:

```bash
# This will create all tables, enums, and indexes
npx prisma migrate dev --name initial_setup
```

**Expected output**:
```
Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "postgres" at "db.abcdefghijklmn.supabase.co:5432"

Applying migration `20241231_initial_setup`

The following migration(s) have been created and applied:

migrations/
  └─ 20241231_initial_setup/
    └─ migration.sql

Your database is now in sync with your schema.

✔ Generated Prisma Client (v5.22.0)
```

### 5. Verify Database Setup

**Option 1: Supabase Dashboard**

1. Go to Supabase Dashboard
2. Click **"Table Editor"** in sidebar
3. You should see all tables:
   - `User`
   - `Game`
   - `Contract`
   - `LedgerEntry`
   - `GameSession`
   - `GameSessionPlayer`
   - `Lobby`
   - `LobbyPlayer`
   - `DiceRoyaleGame`
   - `DiceRoyaleRoll`
   - `DeveloperApplication`

**Option 2: SQL Editor**

1. Go to **"SQL Editor"** in Supabase Dashboard
2. Run this query:

```sql
-- List all tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

**Option 3: Prisma Studio**

```bash
npx prisma studio
```

Opens at http://localhost:5555 - browse your database visually.

### 6. Create Admin User

After setting up the database, you need at least one admin user:

**Step 1**: Authenticate via your app to create the user in the database:
- Start your server: `npm run dev`
- Sign in via Firebase on the frontend
- This will auto-create a user in the database

**Step 2**: Update the user's role to ADMIN in Supabase:

1. Go to Supabase Dashboard → **SQL Editor**
2. Run this query (replace with your Firebase UID):

```sql
UPDATE "User" 
SET role = 'ADMIN' 
WHERE "firebaseUid" = 'your-firebase-uid-here';
```

3. Verify:

```sql
SELECT id, "firebaseUid", "uniqueDisplayName", role 
FROM "User" 
WHERE role = 'ADMIN';
```

### 7. Test the Setup

Start your development server:

```bash
npm run dev
```

Test endpoints:

```bash
# Test authentication
curl http://localhost:3000/v1/me/profile \
  -H "Authorization: Bearer <firebase-token>"

# Should return user data with role field
```

---

## Production Deployment

### For Railway Deployment

1. **Update Railway Environment Variables**:
   - Go to Railway Dashboard → Your Service → Variables
   - Update `DATABASE_URL` to Supabase **Transaction Mode**:
     ```
     postgres://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true
     ```

2. **Optional: Add Direct URL for Migrations**:
   - Add new variable `DIRECT_URL`:
     ```
     postgres://postgres.[PROJECT-REF]:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
     ```
   - Update `prisma/schema.prisma`:
     ```prisma
     datasource db {
       provider  = "postgresql"
       url       = env("DATABASE_URL")
       directUrl = env("DIRECT_URL")
     }
     ```

3. **Deploy**:
   ```bash
   git add .
   git commit -m "Switch to Supabase database"
   git push origin main
   ```

4. **Railway will automatically**:
   - Run migrations
   - Restart the server

5. **Create Production Admin User**:
   - Same as development (Step 6 above)
   - Use Supabase SQL Editor with production data

---

## Connection Pooling (Advanced)

For production with high traffic, use connection pooling:

### Update Prisma Schema

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")      // Pooled connection
  directUrl = env("DIRECT_URL")        // Direct connection
}
```

### Update Environment Variables

```bash
# Production .env or Railway variables

# Pooled connection (for app queries)
DATABASE_URL="postgres://postgres.[REF]:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Direct connection (for migrations)
DIRECT_URL="postgres://postgres.[REF]:[PASSWORD]@db.[REF].supabase.co:5432/postgres"
```

**Benefits**:
- Better performance under load
- Prevents connection limit errors
- Required for serverless deployments

---

## Troubleshooting

### Can't Connect to Database

**Check**:
1. DATABASE_URL is correct (check for typos)
2. Password is correct
3. Supabase project is not paused (check dashboard)

**Test connection**:
```bash
# Install PostgreSQL client
# Ubuntu/Debian: sudo apt install postgresql-client
# macOS: brew install postgresql

# Test connection
psql "$DATABASE_URL"
```

### SSL Connection Required

Add `?sslmode=require` to connection string:
```bash
DATABASE_URL="postgres://...?sslmode=require"
```

### Migration Already Exists

```bash
# Reset and start fresh (development only!)
npx prisma migrate reset

# Then run migration again
npx prisma migrate dev --name initial_setup
```

### Prepared Statement Errors (Production)

Use connection pooling with `?pgbouncer=true`:
```bash
DATABASE_URL="postgres://...?pgbouncer=true"
```

---

## Supabase Dashboard Features

### Table Editor
- Visual interface to browse and edit data
- Add/edit/delete rows
- View relationships

### SQL Editor
- Run custom SQL queries
- Save frequently used queries
- View query history

### Database Backups (Paid Plans)
- Point-in-time recovery
- Automatic daily backups
- Manual backup creation

### Monitoring
- Connection usage
- Query performance
- Database size

---

## Comparison with Local PostgreSQL

| Feature | Local PostgreSQL | Supabase |
|---------|------------------|----------|
| **Setup** | Manual installation | Instant (cloud-based) |
| **Backups** | Manual | Automatic (paid) |
| **Dashboard** | pgAdmin (separate) | Built-in |
| **Connection Pooling** | Manual setup | Built-in |
| **Cost** | Free | Free tier (500MB) |
| **Collaboration** | Difficult | Easy (shared dashboard) |

---

## Next Steps

After setup:

1. ✅ Supabase project created
2. ✅ Database migrated
3. ✅ Admin user created
4. ✅ Local development tested
5. ☐ Deploy to production
6. ☐ Create production admin user
7. ☐ Test production endpoints

---

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase + Prisma Guide](https://supabase.com/docs/guides/integrations/prisma)
- [Connection Pooling](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pool)
- [Prisma Documentation](https://www.prisma.io/docs)
