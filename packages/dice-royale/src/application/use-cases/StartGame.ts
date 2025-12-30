import type { IDiceGameRepository } from '../../domain/repositories/IDiceGameRepository.js';
import type { DiceGame } from '../../domain/entities/DiceGame.js';

export interface StartGameInput {
    sessionId: string;
    players: Array<{
        userId: string;
        displayName: string;
    }>;
}

/**
 * Start a new DiceRoyale game
 */
export class StartGameUseCase {
    constructor(private diceGameRepository: IDiceGameRepository) { }

    async execute(input: StartGameInput): Promise<DiceGame> {
        // Check if game already exists for this session
        const existing = await this.diceGameRepository.findBySessionId(input.sessionId);
        if (existing) {
            return existing;
        }

        // Create new game
        const game = await this.diceGameRepository.create({
            sessionId: input.sessionId,
            players: input.players,
        });

        return game;
    }
}
