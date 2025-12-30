import type { Lobby, LobbyPlayer } from '../entities/Lobby.js';
import type { LobbyStatus } from '@prisma/client';

/**
 * Repository interface for Lobby operations
 */
export interface ILobbyRepository {
    /**
     * Find lobby by ID
     */
    findById(id: string): Promise<Lobby | null>;

    /**
     * Find active lobbies for a contract
     */
    findByContractId(contractId: string, status?: LobbyStatus): Promise<Lobby[]>;

    /**
     * Find all waiting lobbies
     */
    findWaitingLobbies(): Promise<Lobby[]>;

    /**
     * Find lobby that a user is currently in
     */
    findByUserId(userId: string): Promise<Lobby | null>;

    /**
     * Create a new lobby
     */
    create(data: {
        contractId: string;
    }): Promise<Lobby>;

    /**
     * Add player to lobby
     */
    addPlayer(lobbyId: string, userId: string): Promise<LobbyPlayer>;

    /**
     * Remove player from lobby
     */
    removePlayer(lobbyId: string, userId: string): Promise<void>;

    /**
     * Update lobby status
     */
    updateStatus(id: string, status: LobbyStatus): Promise<Lobby>;

    /**
     * Get or create a waiting lobby for a contract
     */
    getOrCreateWaitingLobby(contractId: string): Promise<Lobby>;
}
