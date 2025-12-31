# Please update your .env file with Supabase credentials

Replace the DATABASE_URL line in your .env file with:

```bash
DATABASE_URL="postgresql://postgres.ygmeectixgbbisbbpolv:Ace2012seta#@aws-1-ap-south-1.pooler.supabase.com:6543/postgres"
```

Full .env should look like:

```bash
# Database (Supabase PostgreSQL - Production)
DATABASE_URL="postgresql://postgres.ygmeectixgbbisbbpolv:Ace2012seta#@aws-1-ap-south-1.pooler.supabase.com:6543/postgres"

# Firebase (Service Account JSON)
FIREBASE_SERVICE_ACCOUNT='{"type": "service_account", "project_id": "bigtwo-fe", ...}'

# Server
PORT=3000
HOST=0.0.0.0
NODE_ENV=development

# JWT Secret (for execution tokens)
JWT_SECRET="3e608adbbb03867e71c64f3da2fd04ba4a5d591787679759d1f3625850b9e03b"

# HMAC Secret (for game backend signatures)
HMAC_SECRET="7a230607a59155c1a90da1669c716527a8ad02d94f67d92565f7d47a1ed53dc4"
```

After updating, run:
```bash
npx prisma migrate dev --name initial_setup
```
