# Pluto Hub

A centralized "Bank and Identity" layer for game backends with secure ledger, lock-and-settle contracts, and lobby matchmaking.

## Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL
- Firebase Project (for authentication)

### Setup

1. **Install dependencies**
```bash
npm install
```

2. **Configure environment**
```bash
cp .env.example .env
# Edit .env with your credentials
```

3. **Setup database**
```bash
npm run db:generate
npm run db:push
```

4. **Start development server**
```bash
npm run dev
```

## Architecture

This is a **monorepo** with the following packages:

| Package | Description |
|---------|-------------|
| `@pluto/gateway` | Orchestration layer, routing, caching |
| `@pluto/bank` | Ledger, contracts, balance management |
| `@pluto/lobby` | Matchmaking with SSE broadcasting |
| `@pluto/identity` | Firebase auth, display names |
| `@pluto/dice-royale` | Sample game for testing |
| `@pluto/shared` | Common types, errors, utilities |

All packages are deployed as a **single Node.js instance** on Railway.

## API Documentation

See [docs/api.md](./docs/api.md) for complete API documentation.

## Postman Collection

Import [postman/pluto-hub.postman_collection.json](./postman/pluto-hub.postman_collection.json) into Postman for testing.

## Project Structure

```
pluto-project/
├── packages/
│   ├── shared/          # Common utilities
│   ├── gateway/         # API gateway
│   ├── bank/            # Financial operations
│   ├── lobby/           # Matchmaking
│   ├── identity/        # Authentication
│   └── dice-royale/     # Sample game
├── prisma/
│   └── schema.prisma    # Database schema
├── src/
│   └── main.ts          # Entry point
├── docs/
│   └── api.md           # API documentation
├── postman/
│   └── pluto-hub.postman_collection.json
└── devops/              # Configuration files
    ├── firebase.json
    └── postgress.json
```

## Development

```bash
# Run development server
npm run dev

# Run tests
npm test

# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Open Prisma Studio
npm run db:studio
```

## Deployment (Railway)

1. Create a new Railway project
2. Add PostgreSQL plugin
3. Connect your GitHub repository
4. Set environment variables:
   - `DATABASE_URL` (from PostgreSQL plugin)
   - `FIREBASE_SERVICE_ACCOUNT=<content-of-your-firebase-json>`
   - `JWT_SECRET=<your-secret>`
   - `HMAC_SECRET=<your-secret>`

## License

MIT
