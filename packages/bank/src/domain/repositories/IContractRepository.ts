import type { Contract, Game } from '../entities/Contract.js';

/**
 * Repository interface for Contract and Game operations
 */
export interface IContractRepository {
    /**
     * Find contract by ID
     */
    findContractById(id: string): Promise<Contract | null>;

    /**
     * Find active contracts for a game
     */
    findContractsByGameId(gameId: string): Promise<Contract[]>;

    /**
     * Create a new contract
     */
    createContract(data: {
        gameId: string;
        name: string;
        entryFee: bigint;
        platformFee: number;
        minPlayers: number;
        maxPlayers: number;
        ttlSeconds?: number;
    }): Promise<Contract>;

    /**
     * Find game by ID
     */
    findGameById(id: string): Promise<Game | null>;

    /**
     * Find game by name
     */
    findGameByName(name: string): Promise<Game | null>;

    /**
     * Create a new game
     */
    createGame(data: {
        name: string;
        description?: string;
        clientSecretHash: string;
        callbackUrl?: string;
    }): Promise<Game>;

    /**
     * Verify game client secret
     */
    verifyGameSecret(gameId: string, secretHash: string): Promise<boolean>;
}
