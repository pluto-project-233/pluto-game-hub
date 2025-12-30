import type { IContractRepository } from '../../domain/repositories/IContractRepository.js';
import { generateSecureToken } from '@pluto/shared';
import crypto from 'node:crypto';

export interface RegisterGameInput {
    name: string;
    description?: string;
    callbackUrl?: string;
}

export interface RegisterGameResult {
    id: string;
    name: string;
    clientSecret: string; // Plain text, shown only once
}

/**
 * Register a new game
 */
export class RegisterGameUseCase {
    constructor(private contractRepository: IContractRepository) { }

    async execute(input: RegisterGameInput): Promise<RegisterGameResult> {
        // Generate client secret
        const clientSecret = generateSecureToken(32);

        // Hash the secret for storage
        const clientSecretHash = crypto
            .createHash('sha256')
            .update(clientSecret)
            .digest('hex');

        const game = await this.contractRepository.createGame({
            name: input.name,
            description: input.description,
            clientSecretHash,
            callbackUrl: input.callbackUrl,
        });

        return {
            id: game.id,
            name: game.name,
            clientSecret, // Only returned once!
        };
    }
}
