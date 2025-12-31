# Database Migration Guide

## Overview

This guide explains how to apply the database migrations for the developer registration feature.

## Prerequisites

- PostgreSQL database running locally or accessible remotely
- Prisma CLI installed (`npx prisma` should work)
- DATABASE_URL environment variable configured

## Migration Steps

### Step 1: Verify DATABASE_URL

Make sure your `.env` file has the correct database connection string:

```bash
# For local development
DATABASE_URL="postgresql://postgres:password@localhost:5432/pluto"

# For Railway (production)
DATABASE_URL="postgresql://postgres:password@postgres.railway.internal:5432/railway"
```

### Step 2: Run Migration

```bash
# Create and apply migration
npx prisma migrate dev --name add_developer_fields_and_role
```

This will:
1. Create a new migration file in `prisma/migrations/`
2. Apply the migration to your database
3. Regenerate Prisma Client with updated types

**Expected Output**:
```
Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "pluto", schema "public" at "localhost:5432"

Applying migration `20241231_add_developer_fields_and_role`

The following migration(s) have been created and applied from new schema changes:

migrations/
  └─ 20241231_add_developer_fields_and_role/
    └─ migration.sql

Your database is now in sync with your schema.

✔ Generated Prisma Client
```

### Step 3: Verify Migration

Check that the tables and columns were created:

```sql
-- Check User table structure
\d "User"

-- Check DeveloperApplication table exists
\d "DeveloperApplication"

-- Verify enums were created
SELECT enumlabel FROM pg_enum WHERE enumtypid = 'UserRole'::regtype;
SELECT enumlabel FROM pg_enum WHERE enumtypid = 'DeveloperStatus'::regtype;
SELECT enumlabel FROM pg_enum WHERE enumtypid = 'ApplicationStatus'::regtype;
```

**Expected User table columns**:
- `id` (UUID)
- `firebaseUid` (TEXT)
- `uniqueDisplayName` (TEXT)
- `balance` (BIGINT)
- `lockedBalance` (BIGINT)
- `role` (UserRole) **← NEW**
- `developerId` (TEXT, nullable) **← NEW**
- `developerBalance` (BIGINT) **← NEW**
- `developerStatus` (DeveloperStatus, nullable) **← NEW**
- `createdAt` (TIMESTAMP)
- `updatedAt` (TIMESTAMP)

**Expected DeveloperApplication table** - completely new table

### Step 4: Create First Admin User

After migration, create at least one admin user:

```sql
-- Update existing user to admin
UPDATE "User" 
SET role = 'ADMIN' 
WHERE "firebaseUid" = '<your-firebase-uid>';

-- Or create a new admin user (if you have the Firebase UID)
-- First authenticate via Firebase to create the user, then:
UPDATE "User" 
SET role = 'ADMIN' 
WHERE "firebaseUid" = '<firebase-uid>';
```

### Step 5: Verify Prisma Client

The Prisma Client should now include the new fields:

```typescript
// This should work without TypeScript errors
const user = await prisma.user.findUnique({
  where: { id: 'some-id' },
  select: {
    role: true,              // ✓ New field
    developerId: true,       // ✓ New field
    developerBalance: true,  // ✓ New field
    developerStatus: true,   // ✓ New field
  }
});

// New model should be available
const apps = await prisma.developerApplication.findMany();
```

---

## Production Deployment

### Railway Deployment

1. **Push Code to Repository**:
   ```bash
   git add .
   git commit -m "Add developer registration feature"
   git push origin main
   ```

2. **Migration will auto-run** on Railway if you have set up automatic deployments

3. **Or manually run migration**:
   - Go to Railway dashboard
   - Open your service
   - Go to "Deployments" tab
   - Click "Deploy" to trigger a new deployment
   - Migration will run automatically during deployment

4. **Verify in Railway Console**:
   ```bash
   # In Railway database console
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name = 'DeveloperApplication';
   ```

5. **Create Admin User in Production**:
   ```sql
   -- Connect to Railway PostgreSQL
   UPDATE "User" 
   SET role = 'ADMIN' 
   WHERE "firebaseUid" = '<production-admin-firebase-uid>';
   ```

---

## Troubleshooting

### Error: "Can't reach database server"

**Cause**: DATABASE_URL is incorrect or database is not running

**Solution**:
1. Check `.env` file for correct DATABASE_URL
2. Verify PostgreSQL is running: `pg_isready`
3. Test connection: `psql $DATABASE_URL`

### Error: "Migration already applied"

**Cause**: Migration has already been run

**Solution**:
```bash
# Check migration status
npx prisma migrate status

# If needed, reset and reapply (CAUTION: this deletes data)
npx prisma migrate reset

# Or just regenerate Prisma Client
npx prisma generate
```

### TypeScript Errors: "Property 'role' does not exist"

**Cause**: Prisma Client not regenerated after migration

**Solution**:
```bash
# Regenerate Prisma Client
npx prisma generate

# If that doesn't work, rebuild your project
npm run build
```

### Migration Fails Mid-Flight

**Cause**: Database error during migration

**Solution**:
```bash
# Mark migration as rolled back
npx prisma migrate resolve --rolled-back <migration-name>

# Then try again
npx prisma migrate deploy
```

---

## Rollback (Emergency)

If you need to rollback the migration:

### Option 1: Manual Rollback (Recommended)

```sql
-- Drop new table
DROP TABLE IF EXISTS "DeveloperApplication" CASCADE;

-- Drop new enums
DROP TYPE IF EXISTS "UserRole" CASCADE;
DROP TYPE IF EXISTS "DeveloperStatus" CASCADE;
DROP TYPE IF EXISTS "ApplicationStatus" CASCADE;

-- Remove new columns from User table
ALTER TABLE "User" DROP COLUMN IF EXISTS role;
ALTER TABLE "User" DROP COLUMN IF EXISTS "developerId";
ALTER TABLE "User" DROP COLUMN IF EXISTS "developerBalance";
ALTER TABLE "User" DROP COLUMN IF EXISTS "developerStatus";

-- Update Prisma migration table
DELETE FROM "_prisma_migrations" 
WHERE migration_name LIKE '%add_developer_fields_and_role%';
```

### Option 2: Prisma Migrate Reset (DESTRUCTIVE)

```bash
# ⚠️  WARNING: This will delete ALL data ⚠️
npx prisma migrate reset
```

---

## Migration SQL Reference

The migration creates the following SQL:

```sql
-- Create enums
CREATE TYPE "UserRole" AS ENUM ('PLAYER', 'ADMIN');
CREATE TYPE "DeveloperStatus" AS ENUM ('ACTIVE', 'BLOCKED');
CREATE TYPE "ApplicationStatus" AS ENUM ('SUBMITTED', 'REVIEWED', 'APPROVED', 'REJECTED');

-- Add columns to User table
ALTER TABLE "User" 
  ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'PLAYER',
  ADD COLUMN "developerId" TEXT,
  ADD COLUMN "developerBalance" BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN "developerStatus" "DeveloperStatus";

-- Add unique constraint
ALTER TABLE "User" 
  ADD CONSTRAINT "User_developerId_key" UNIQUE ("developerId");

-- Create DeveloperApplication table
CREATE TABLE "DeveloperApplication" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL UNIQUE,
  "email" TEXT NOT NULL,
  "companyName" TEXT NOT NULL,
  "website" TEXT,
  "description" TEXT NOT NULL,
  "gamesPlanned" TEXT NOT NULL,
  "status" "ApplicationStatus" NOT NULL DEFAULT 'SUBMITTED',
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt" TIMESTAMP(3),
  "reviewedBy" TEXT,
  "reviewNotes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

-- Create index
CREATE INDEX "DeveloperApplication_status_idx" 
  ON "DeveloperApplication"("status");

-- Add foreign key
ALTER TABLE "User" 
  ADD CONSTRAINT "User_developerId_fkey" 
  FOREIGN KEY ("developerId") 
  REFERENCES "DeveloperApplication"("id") 
  ON DELETE SET NULL 
  ON UPDATE CASCADE;
```

---

## Next Steps

After successful migration:

1. **Start the server**: `npm run dev`
2. **Test developer registration** endpoint
3. **Create admin user** in database
4. **Test admin review** endpoints
5. **Update frontend** to use new fields

See [../api/user.md](../api/user.md) for API documentation.
