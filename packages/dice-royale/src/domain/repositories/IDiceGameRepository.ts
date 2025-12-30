import type { DiceGame } from '../entities/DiceGame.js';

/**
 * Repository interface for DiceRoyale game operations
 */
export interface IDiceGameRepository {
    /**
     * Find game by ID
     */
    findById(id: string): Promise<DiceGame | null>;

    /**
     * Find game by session ID
     */
    findBySessionId(sessionId: string): Promise<DiceGame | null>;

    /**
     * Create a new game
     */
    create(data: {
        sessionId: string;
        players: Array<{
            userId: string;
            displayName: string;
        }>;
    }): Promise<DiceGame>;

    /**
     * Record a dice roll
     */
    recordRoll(gameId: string, userId: string, rollValue: number): Promise<void>;

    /**
     * Update game status
     */
    updateStatus(id: string, status: 'ROLLING' | 'COMPLETE'): Promise<DiceGame>;
}
