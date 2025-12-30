# Pluto Hub API Documentation

## Overview

Pluto Hub is a centralized "Bank and Identity" layer for game backends. It provides:
- **Secure Ledger**: Append-only transaction log with ACID compliance
- **Lock-and-Settle Contracts**: Fair economic game rules
- **Lobby Matchmaking**: Real-time player matching with SSE
- **Identity Management**: Firebase authentication with unique display names

**Base URL**: `https://your-railway-domain.railway.app/v1`

---

## Authentication

### Player Authentication (Firebase JWT)
For player endpoints (`/me/*`, `/lobby/*`):
```http
Authorization: Bearer <firebase-id-token>
```

### Game Backend Authentication (HMAC)
For contract endpoints (`/contracts/*`):
```http
X-Game-Id: <your-game-id>
X-Pluto-Signature: <hmac-sha256-signature>
```

**Signature Generation:**
```javascript
const signature = crypto
  .createHmac('sha256', CLIENT_SECRET)
  .update(JSON.stringify(requestBody))
  .digest('hex');
```

---

## Player APIs

### Get Balance
```http
GET /v1/me/balance
Authorization: Bearer <token>
```

**Response:**
```json
{
  "balance": "10000",
  "lockedBalance": "500",
  "availableBalance": "9500"
}
```

### Get Transaction History
```http
GET /v1/me/history?limit=20&offset=0
Authorization: Bearer <token>
```

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "type": "WIN",
      "amount": "500",
      "balanceAfter": "10500",
      "description": "Game winnings",
      "createdAt": "2024-01-01T12:00:00Z"
    }
  ],
  "total": 50,
  "limit": 20,
  "offset": 0,
  "hasMore": true
}
```

### Get Profile
```http
GET /v1/me/profile
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": "uuid",
  "displayName": "CoolPlayer123",
  "balance": "10000",
  "lockedBalance": "0",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

### Set Display Name
```http
PUT /v1/me/display-name
Authorization: Bearer <token>
Content-Type: application/json

{
  "displayName": "NewCoolName"
}
```

---

## Lobby APIs

### List Lobbies
```http
GET /v1/lobbies?contractId=<optional>
```

**Response:**
```json
[
  {
    "id": "uuid",
    "contractId": "uuid",
    "contractName": "Quick Match",
    "gameName": "DiceRoyale",
    "entryFee": "100",
    "status": "WAITING",
    "currentPlayers": 2,
    "minPlayers": 2,
    "maxPlayers": 4,
    "createdAt": "2024-01-01T12:00:00Z"
  }
]
```

### Get Lobby Status
```http
GET /v1/lobbies/:id/status
```

**Response:**
```json
{
  "id": "uuid",
  "contractId": "uuid",
  "contractName": "Quick Match",
  "gameName": "DiceRoyale",
  "entryFee": "100",
  "status": "WAITING",
  "currentPlayers": 2,
  "minPlayers": 2,
  "maxPlayers": 4,
  "createdAt": "2024-01-01T12:00:00Z",
  "players": [
    { "id": "uuid", "displayName": "Player1", "joinedAt": "..." },
    { "id": "uuid", "displayName": "Player2", "joinedAt": "..." }
  ]
}
```

### SSE: Lobby Events
```http
GET /v1/lobbies/:id/events
Accept: text/event-stream
```

**Event Types:**
```javascript
// Player joined
{ "type": "player_joined", "player": { "id": "...", "displayName": "..." } }

// Player left
{ "type": "player_left", "playerId": "uuid" }

// Lobby starting (countdown)
{ "type": "lobby_starting", "countdown": 5 }

// Game started
{ "type": "game_started", "sessionId": "uuid" }

// Lobby closed
{ "type": "lobby_closed", "reason": "All players left" }
```

### Join Lobby
```http
POST /v1/lobby/join
Authorization: Bearer <token>
Content-Type: application/json

{
  "contractId": "uuid"
}
```

### Leave Lobby
```http
POST /v1/lobby/leave
Authorization: Bearer <token>
```

---

## Contract APIs (Game Backend)

### Execute Contract
Lock entry fees and start a game session.

```http
POST /v1/contracts/execute
X-Game-Id: <game-id>
X-Pluto-Signature: <signature>
Content-Type: application/json

{
  "contractId": "uuid",
  "playerIds": ["firebase-uid-1", "firebase-uid-2"]
}
```

**Response:**
```json
{
  "sessionId": "uuid",
  "sessionToken": "jwt-token",
  "players": [
    { "id": "uuid", "displayName": "Player1", "amountLocked": "100" }
  ],
  "totalPot": "200",
  "expiresAt": "2024-01-01T13:00:00Z"
}
```

### Settle Contract
Distribute rewards to winners.

```http
POST /v1/contracts/settle
X-Game-Id: <game-id>
X-Pluto-Signature: <signature>
Content-Type: application/json

{
  "sessionToken": "jwt-from-execute",
  "results": [
    { "playerId": "uuid", "isWinner": true },
    { "playerId": "uuid", "isWinner": false }
  ]
}
```

**Response:**
```json
{
  "sessionId": "uuid",
  "winners": [
    { "id": "uuid", "displayName": "Player1", "amountWon": "190" }
  ],
  "platformFeeCollected": "10"
}
```

### Cancel Contract
Refund all locked funds.

```http
POST /v1/contracts/cancel
X-Game-Id: <game-id>
X-Pluto-Signature: <signature>
Content-Type: application/json

{
  "sessionToken": "jwt-from-execute",
  "reason": "Game failed to start"
}
```

---

## Admin APIs

### Register Game
```http
POST /v1/dev/games
Content-Type: application/json

{
  "name": "DiceRoyale",
  "description": "Simple dice game",
  "callbackUrl": "https://game.example.com/webhook"
}
```

**Response:**
```json
{
  "id": "uuid",
  "name": "DiceRoyale",
  "clientSecret": "secret-shown-only-once"
}
```

### Create Contract
```http
POST /v1/dev/contracts
Content-Type: application/json

{
  "gameId": "uuid",
  "name": "Quick Match",
  "entryFee": "100",
  "platformFee": 5,
  "minPlayers": 2,
  "maxPlayers": 4,
  "ttlSeconds": 3600
}
```

---

## Error Responses

All errors follow this format:
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": {} // Optional validation details
  }
}
```

| Code | Status | Description |
|------|--------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `INVALID_TOKEN` | 401 | Firebase token expired or invalid |
| `INVALID_SIGNATURE` | 401 | HMAC signature verification failed |
| `FORBIDDEN` | 403 | Access denied |
| `NOT_FOUND` | 404 | Resource not found |
| `INSUFFICIENT_FUNDS` | 402 | Not enough balance |
| `CONFLICT` | 409 | Duplicate action (e.g., already settled) |
| `VALIDATION_ERROR` | 400 | Invalid request body |
| `LOBBY_FULL` | 422 | Lobby has reached max players |

---

## DiceRoyale Game API

### Get Game State
```http
GET /v1/dice-royale/:sessionId/state
```

### Roll Dice
```http
POST /v1/dice-royale/:gameId/roll
Authorization: Bearer <token>
```

**Response:**
```json
{
  "rollValue": 5,
  "allPlayersRolled": true,
  "winners": ["uuid"]
}
```
