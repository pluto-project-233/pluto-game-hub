import type { GameSession, GameSessionPlayer } from '../entities/GameSession.js';
import type { GameSessionStatus } from '@prisma/client';

/**
 * Repository interface for GameSession operations
 */
export interface ISessionRepository {
    /**
     * Find session by ID
     */
    findById(id: string): Promise<GameSession | null>;

    /**
     * Create a new game session with players
     */
    create(data: {
        contractId: string;
        totalPot: bigint;
        expiresAt: Date;
        players: Array<{
            userId: string;
            displayName: string;
            amountLocked: bigint;
        }>;
    }): Promise<GameSession>;

    /**
     * Update session status
     */
    updateStatus(id: string, status: GameSessionStatus): Promise<GameSession>;

    /**
     * Settle session with results
     */
    settle(
        id: string,
        results: Array<{
            playerId: string;
            isWinner: boolean;
            winAmount: bigint;
        }>
    ): Promise<GameSession>;

    /**
     * Find expired sessions that need auto-cancellation
     */
    findExpiredSessions(): Promise<GameSession[]>;

    /**
     * Find sessions by status
     */
    findByStatus(status: GameSessionStatus): Promise<GameSession[]>;
}
