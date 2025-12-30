import type { LedgerEntryType, LobbyStatus, GameSessionStatus } from '@prisma/client';

// ============================================
// Common Types
// ============================================

export interface PaginationParams {
    limit: number;
    offset: number;
}

export interface PaginatedResult<T> {
    data: T[];
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
}

// ============================================
// User Types
// ============================================

export interface UserBalance {
    balance: bigint;
    lockedBalance: bigint;
    availableBalance: bigint; // balance - lockedBalance
}

export interface UserProfile {
    id: string;
    firebaseUid: string;
    uniqueDisplayName: string;
    balance: bigint;
    lockedBalance: bigint;
    createdAt: Date;
}

// ============================================
// Ledger Types
// ============================================

export interface LedgerEntryData {
    userId: string;
    type: LedgerEntryType;
    amount: bigint;
    description?: string;
    sessionId?: string;
}

export interface LedgerHistoryItem {
    id: string;
    type: LedgerEntryType;
    amount: bigint;
    balanceAfter: bigint;
    description: string | null;
    createdAt: Date;
}

// ============================================
// Contract Types
// ============================================

export interface ContractConfig {
    gameId: string;
    name: string;
    entryFee: bigint;
    platformFee: number; // Percentage (0-100)
    minPlayers: number;
    maxPlayers: number;
    ttlSeconds?: number;
}

export interface ContractInfo {
    id: string;
    gameId: string;
    gameName: string;
    name: string;
    entryFee: bigint;
    platformFee: number;
    minPlayers: number;
    maxPlayers: number;
}

// ============================================
// Game Session Types
// ============================================

export interface ExecuteContractRequest {
    contractId: string;
    playerIds: string[]; // Firebase UIDs
    metadata?: Record<string, unknown>;
}

export interface ExecuteContractResult {
    sessionId: string;
    sessionToken: string; // JWT for settle/cancel
    players: {
        id: string;
        displayName: string;
        amountLocked: bigint;
    }[];
    totalPot: bigint;
    expiresAt: Date;
}

export interface SettleContractRequest {
    sessionToken: string;
    results: PlayerResult[];
}

export interface PlayerResult {
    playerId: string; // Firebase UID
    isWinner: boolean;
    winAmount?: bigint; // Optional: custom amount, otherwise calculated
}

export interface SettleContractResult {
    sessionId: string;
    winners: {
        id: string;
        displayName: string;
        amountWon: bigint;
    }[];
    platformFeeCollected: bigint;
}

// ============================================
// Lobby Types
// ============================================

export interface LobbyInfo {
    id: string;
    contractId: string;
    contractName: string;
    gameName: string;
    entryFee: bigint;
    status: LobbyStatus;
    currentPlayers: number;
    minPlayers: number;
    maxPlayers: number;
    createdAt: Date;
}

export interface LobbyDetails extends LobbyInfo {
    players: LobbyPlayerInfo[];
}

export interface LobbyPlayerInfo {
    id: string;
    displayName: string;
    joinedAt: Date;
}

// SSE Event Types
export type LobbyEvent =
    | { type: 'player_joined'; player: LobbyPlayerInfo }
    | { type: 'player_left'; playerId: string }
    | { type: 'lobby_starting'; countdown: number }
    | { type: 'game_started'; sessionId: string }
    | { type: 'lobby_closed'; reason: string };

// ============================================
// Authentication Types
// ============================================

export interface AuthenticatedUser {
    id: string; // Pluto user ID
    firebaseUid: string;
    displayName: string;
}

export interface GameBackendAuth {
    gameId: string;
    gameName: string;
}

// ============================================
// Session Token Payload
// ============================================

export interface SessionTokenPayload {
    sessionId: string;
    contractId: string;
    playerIds: string[];
    totalPot: string; // BigInt as string
    expiresAt: string; // ISO date
}

// ============================================
// DiceRoyale Types
// ============================================

export interface DiceRoyaleState {
    gameId: string;
    sessionId: string;
    status: 'ROLLING' | 'COMPLETE';
    players: DiceRoyalePlayer[];
    winnerId?: string;
}

export interface DiceRoyalePlayer {
    userId: string;
    displayName: string;
    hasRolled: boolean;
    rollValue?: number;
}
