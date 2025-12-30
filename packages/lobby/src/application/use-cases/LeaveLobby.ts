import type { ILobbyRepository } from '../../domain/repositories/ILobbyRepository.js';
import type { LobbyBroadcaster } from '../../infrastructure/sse/LobbyBroadcaster.js';
import { NotFoundError } from '@pluto/shared';

export interface LeaveLobbyInput {
    userId: string;
}

export interface LeaveLobbyResult {
    success: boolean;
    lobbyId: string;
}

/**
 * Leave the current lobby
 */
export class LeaveLobbyUseCase {
    constructor(
        private lobbyRepository: ILobbyRepository,
        private broadcaster: LobbyBroadcaster
    ) { }

    async execute(input: LeaveLobbyInput): Promise<LeaveLobbyResult> {
        // 1. Find user's current lobby
        const lobby = await this.lobbyRepository.findByUserId(input.userId);
        if (!lobby) {
            throw new NotFoundError('Lobby for user', input.userId);
        }

        // 2. Remove player from lobby
        await this.lobbyRepository.removePlayer(lobby.id, input.userId);

        // 3. Broadcast player left event
        this.broadcaster.broadcast(lobby.id, {
            type: 'player_left',
            playerId: input.userId,
        });

        // 4. If lobby is empty, close it
        const updatedLobby = await this.lobbyRepository.findById(lobby.id);
        if (updatedLobby && updatedLobby.currentPlayers === 0) {
            await this.lobbyRepository.updateStatus(lobby.id, 'CLOSED');
            this.broadcaster.broadcast(lobby.id, {
                type: 'lobby_closed',
                reason: 'All players left',
            });
        }

        return {
            success: true,
            lobbyId: lobby.id,
        };
    }
}
