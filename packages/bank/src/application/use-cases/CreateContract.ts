import type { IContractRepository } from '../../domain/repositories/IContractRepository.js';
import { NotFoundError, ValidationError } from '@pluto/shared';

export interface CreateContractInput {
    gameId: string;
    name: string;
    entryFee: bigint;
    platformFee: number; // Percentage 0-100
    minPlayers: number;
    maxPlayers: number;
    ttlSeconds?: number;
}

export interface CreateContractResult {
    id: string;
    gameId: string;
    name: string;
    entryFee: string;
    platformFee: number;
    minPlayers: number;
    maxPlayers: number;
    ttlSeconds: number;
}

/**
 * Create a new contract (economic rules for a game)
 */
export class CreateContractUseCase {
    constructor(private contractRepository: IContractRepository) { }

    async execute(input: CreateContractInput): Promise<CreateContractResult> {
        // Validate game exists
        const game = await this.contractRepository.findGameById(input.gameId);
        if (!game) {
            throw new NotFoundError('Game', input.gameId);
        }

        // Validate platform fee
        if (input.platformFee < 0 || input.platformFee > 100) {
            throw new ValidationError('Platform fee must be between 0 and 100');
        }

        // Validate player counts
        if (input.minPlayers < 1) {
            throw new ValidationError('Minimum players must be at least 1');
        }
        if (input.maxPlayers < input.minPlayers) {
            throw new ValidationError('Maximum players must be >= minimum players');
        }

        // Validate entry fee
        if (input.entryFee < 0n) {
            throw new ValidationError('Entry fee cannot be negative');
        }

        const contract = await this.contractRepository.createContract({
            gameId: input.gameId,
            name: input.name,
            entryFee: input.entryFee,
            platformFee: input.platformFee,
            minPlayers: input.minPlayers,
            maxPlayers: input.maxPlayers,
            ttlSeconds: input.ttlSeconds,
        });

        return {
            id: contract.id,
            gameId: contract.gameId,
            name: contract.name,
            entryFee: contract.entryFee.toString(),
            platformFee: contract.platformFee,
            minPlayers: contract.minPlayers,
            maxPlayers: contract.maxPlayers,
            ttlSeconds: contract.ttlSeconds,
        };
    }
}
