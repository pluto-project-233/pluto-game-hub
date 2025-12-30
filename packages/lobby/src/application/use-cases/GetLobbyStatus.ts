import type { ILobbyRepository } from '../../domain/repositories/ILobbyRepository.js';
import type { LobbyDetails } from '@pluto/shared';
import { LobbyNotFoundError } from '@pluto/shared';

export interface GetLobbyStatusInput {
    lobbyId: string;
}

/**
 * Get detailed status of a specific lobby
 */
export class GetLobbyStatusUseCase {
    constructor(private lobbyRepository: ILobbyRepository) { }

    async execute(input: GetLobbyStatusInput): Promise<LobbyDetails> {
        const lobby = await this.lobbyRepository.findById(input.lobbyId);
        if (!lobby) {
            throw new LobbyNotFoundError(input.lobbyId);
        }

        return {
            id: lobby.id,
            contractId: lobby.contractId,
            contractName: lobby.contractName,
            gameName: lobby.gameName,
            entryFee: lobby.entryFee,
            status: lobby.status,
            currentPlayers: lobby.currentPlayers,
            minPlayers: lobby.minPlayers,
            maxPlayers: lobby.maxPlayers,
            createdAt: lobby.createdAt,
            players: lobby.players.map((p: any) => ({
                id: p.userId,
                displayName: p.displayName,
                joinedAt: p.joinedAt,
            })),
        };
    }
}
