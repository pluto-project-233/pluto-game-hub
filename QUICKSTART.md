# Quick Start Guide

## ✅ Local Development is Running!

Your Pluto Hub server is now running at: **http://localhost:3000**

---

## Test the API

### 1. Health Check
```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-12-30T..."
}
```

### 2. API Info
```bash
curl http://localhost:3000/v1
```

Expected response:
```json
{
  "name": "Pluto Hub API",
  "version": "1.0.0"
}
```

---

## Next Steps

### 1. Import Postman Collection
- Open Postman
- Import: `postman/pluto-hub.postman_collection.json`
- Set variable `baseUrl` to `http://localhost:3000/v1`

### 2. Create a Test Game
```bash
curl -X POST http://localhost:3000/v1/dev/games \
  -H "Content-Type: application/json" \
  -d '{
    "name": "DiceRoyale",
    "description": "Simple dice game - highest roll wins"
  }'
```

**⚠️ IMPORTANT:** Save the `clientSecret` from the response - it's shown only once!

### 3. Create a Contract
```bash
curl -X POST http://localhost:3000/v1/dev/contracts \
  -H "Content-Type: application/json" \
  -d '{
    "gameId": "<game-id-from-step-2>",
    "name": "Quick Match",
    "entryFee": "100",
    "platformFee": 5,
    "minPlayers": 2,
    "maxPlayers": 4
  }'
```

---

## Railway Deployment

### 1. Push to GitHub
```bash
git add .
git commit -m "Initial commit"
git push origin main
```

### 2. Create Railway Project
1. Go to https://railway.app
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your repository

### 3. Add PostgreSQL
1. Click "New" → "Database" → "Add PostgreSQL"
2. Railway will automatically set `DATABASE_URL`

### 4. Set Environment Variables
In Railway dashboard, add:
```
FIREBASE_SERVICE_ACCOUNT=<content-of-your-firebase-json>
NODE_ENV=production
JWT_SECRET=<generate-with-openssl-rand-hex-32>
HMAC_SECRET=<generate-with-openssl-rand-hex-32>
```

### 5. Deploy
Railway will automatically deploy when you push to GitHub.

### 6. Run Database Migration
In Railway dashboard:
- Go to your service
- Click "Settings" → "Deploy"
- Run command: `npm run db:push`

---

## Useful Commands

```bash
# Start development server
npm run dev

# Push database schema
npm run db:push

# Open Prisma Studio (database GUI)
npm run db:studio

# Run tests (when implemented)
npm test

# Build for production
npm run build

# Start production server
npm start
```

---

## Database Access

### Using Prisma Studio
```bash
npm run db:studio
```

Opens at http://localhost:5555

### Using psql
```bash
psql -U postgres -d pluto_dev
```

---

## Troubleshooting

### Server won't start
```bash
# Check if port 3000 is in use
lsof -i :3000

# Kill the process if needed
kill -9 <PID>
```

### Database connection failed
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Restart if needed
sudo systemctl restart postgresql
```

### Prisma errors
```bash
# Regenerate Prisma client
npm run db:generate

# Reset database (⚠️ deletes all data)
npm run db:push -- --force-reset
```
