import type { IDiceGameRepository } from '../domain/repositories/IDiceGameRepository.js';
import type { DiceRoyaleState } from '@pluto/shared';
import { NotFoundError } from '@pluto/shared';

export interface GetGameStateInput {
    gameId?: string;
    sessionId?: string;
}

/**
 * Get current state of a DiceRoyale game
 */
export class GetGameStateUseCase {
    constructor(private diceGameRepository: IDiceGameRepository) { }

    async execute(input: GetGameStateInput): Promise<DiceRoyaleState> {
        let game;

        if (input.gameId) {
            game = await this.diceGameRepository.findById(input.gameId);
        } else if (input.sessionId) {
            game = await this.diceGameRepository.findBySessionId(input.sessionId);
        } else {
            throw new Error('Either gameId or sessionId must be provided');
        }

        if (!game) {
            throw new NotFoundError('DiceRoyale game');
        }

        const winners = game.status === 'COMPLETE' ? game.getWinners() : undefined;

        return {
            gameId: game.id,
            sessionId: game.sessionId,
            status: game.status,
            players: game.players.map(p => ({
                userId: p.userId,
                displayName: p.displayName,
                hasRolled: p.hasRolled,
                rollValue: p.rollValue ?? undefined,
            })),
            winnerId: winners?.[0],
        };
    }
}
