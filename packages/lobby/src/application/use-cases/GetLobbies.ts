import type { ILobbyRepository } from '../domain/repositories/ILobbyRepository.js';
import type { LobbyInfo } from '@pluto/shared';

export interface GetLobbiesInput {
    contractId?: string;
}

/**
 * Get list of active lobbies
 */
export class GetLobbiesUseCase {
    constructor(private lobbyRepository: ILobbyRepository) { }

    async execute(input: GetLobbiesInput): Promise<LobbyInfo[]> {
        const lobbies = input.contractId
            ? await this.lobbyRepository.findByContractId(input.contractId, 'WAITING')
            : await this.lobbyRepository.findWaitingLobbies();

        return lobbies.map(lobby => ({
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
        }));
    }
}
