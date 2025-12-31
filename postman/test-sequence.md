# Pluto Hub API Test Sequence

This document outlines the standard test journeys and sequences for the Pluto Hub API using the provided Postman collection.

## Prerequisites
1.  **Import Collection**: Import `pluto-hub.postman_collection.json`.
2.  **Import Environment**: Import `Local.postman_environment.json` or `Production.postman_environment.json`.
3.  **Firebase Token**: Obtain a valid Firebase ID Token for a test user and set it in the `firebaseToken` environment variable.

---

## Journey 1: Developer Setup (Admin)
*Goal: Register a new game backend and define its economic rules.*

1.  **Register Game**: `Admin - Dev > Register Game`
    *   **Action**: Send request to create "DiceRoyale".
    *   **Result**: The test script automatically saves `gameId` and `clientSecret`.
2.  **Create Contract**: `Admin - Dev > Create Contract`
    *   **Action**: Define a "Quick Match" with a 100 unit entry fee.
    *   **Result**: Copy the returned `id` for use in lobby testing.

---

## Journey 2: Player Onboarding
*Goal: Set up a player profile.*

1.  **Check Identity**: `Player - Identity > Get Profile`
    *   **Action**: Verify character/user exists.
2.  **Check Balance**: `Player - Identity > Get Balance`
    *   **Action**: Ensure player has enough funds for Journey 3.
3.  **Update Profile**: `Player - Identity > Set Display Name`
    *   **Action**: Choose a unique username.

---

## Journey 3: Matchmaking & Lobby
*Goal: Find and join a game.*

1.  **List Lobbies**: `Player - Lobby > List Lobbies`
    *   **Action**: Browse active waiting rooms.
2.  **Join Lobby**: `Player - Lobby > Join Lobby`
    *   **Action**: Use the `contractId` from Journey 1.
    *   **Result**: Funds are automatically "Locked" (escrowed).
3.  **Wait for Ready**: `Player - Lobby > Get Lobby Status`
    *   **Action**: Poll until `isReady` is true.

---

## Journey 4: Game Execution & Settlement
*Goal: Run the game logic and handle payouts.*

1.  **Execute Contract**: `Game Backend - Contracts > Execute Contract`
    *   **Action**: Game Backend calls this when the match starts.
    *   **Result**: Saves `sessionToken`.
2.  **Play Game (DiceRoyale)**: `DiceRoyale Game > Roll Dice`
    *   **Action**: Player 1 and Player 2 send their rolls.
3.  **Settle Contract**: `Game Backend - Contracts > Settle Contract`
    *   **Action**: Game Backend reports winners.
    *   **Result**: Prize pool is distributed; Platform fee is collected.


---

## Journey 5: Cancellation Flow (Fallback)
*Goal: Handle scenarios where games don't start.*

1.  **Cancel Contract**: `Game Backend - Contracts > Cancel Contract`
    *   **Action**: Call if a player disconnects before the match begins.
    *   **Result**: All locked funds are automatically returned to players.

---

## Running Automation
You can run an automated smoke test of the setup journeys locally:

```bash
npm run test:automation
```

This script uses **Newman** to execute the `Health` and `Admin - Dev` journeys. It verifies that:
1.  The API is reachable and healthy.
2.  A new game can be registered.
3.  Economic contracts can be defined.

*Note: The remaining journeys require a valid `firebaseToken` from a client login.*

