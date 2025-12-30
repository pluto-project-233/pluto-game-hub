import type { ILobbyRepository } from '../domain/repositories/ILobbyRepository.js';
import type { LobbyBroadcaster } from '../infrastructure/sse/LobbyBroadcaster.js';
import {
    AlreadyInLobbyError,
    LobbyFullError,
    InsufficientFundsError,
    ContractNotFoundError,
} from '@pluto/shared';

export interface JoinLobbyInput {
    userId: string;
    displayName: string;
    contractId: string;
    userBalance: bigint;
}

export interface JoinLobbyResult {
    lobbyId: string;
    position: number;
    currentPlayers: number;
    minPlayers: number;
    maxPlayers: number;
    isReady: boolean;
}

/**
 * Join a lobby for a specific contract
 */
export class JoinLobbyUseCase {
    constructor(
        private lobbyRepository: ILobbyRepository,
        private broadcaster: LobbyBroadcaster,
        private getContractInfo: (contractId: string) => Promise<{
            entryFee: bigint;
            minPlayers: number;
            maxPlayers: number;
        } | null>
    ) { }

    async execute(input: JoinLobbyInput): Promise<JoinLobbyResult> {
        // 1. Check if user is already in a lobby
        const existingLobby = await this.lobbyRepository.findByUserId(input.userId);
        if (existingLobby) {
            throw new AlreadyInLobbyError();
        }

        // 2. Get contract info
        const contract = await this.getContractInfo(input.contractId);
        if (!contract) {
            throw new ContractNotFoundError(input.contractId);
        }

        // 3. Check user has sufficient balance
        if (input.userBalance < contract.entryFee) {
            throw new InsufficientFundsError(contract.entryFee, input.userBalance);
        }

        // 4. Get or create a waiting lobby
        const lobby = await this.lobbyRepository.getOrCreateWaitingLobby(input.contractId);

        // 5. Check if lobby is full
        if (lobby.isFull) {
            throw new LobbyFullError();
        }

        // 6. Add player to lobby
        const player = await this.lobbyRepository.addPlayer(lobby.id, input.userId);

        // 7. Broadcast player joined event
        this.broadcaster.broadcast(lobby.id, {
            type: 'player_joined',
            player: {
                id: player.id,
                displayName: input.displayName,
                joinedAt: player.joinedAt,
            },
        });

        // 8. Check if lobby is now ready to start
        const updatedLobby = await this.lobbyRepository.findById(lobby.id);
        const isReady = updatedLobby?.isReady ?? false;

        if (isReady && updatedLobby?.currentPlayers === updatedLobby?.maxPlayers) {
            // Lobby is full, broadcast starting
            this.broadcaster.broadcast(lobby.id, {
                type: 'lobby_starting',
                countdown: 5,
            });
        }

        return {
            lobbyId: lobby.id,
            position: (updatedLobby?.currentPlayers ?? 1),
            currentPlayers: updatedLobby?.currentPlayers ?? 1,
            minPlayers: contract.minPlayers,
            maxPlayers: contract.maxPlayers,
            isReady,
        };
    }
}
