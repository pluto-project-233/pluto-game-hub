import type { IDiceGameRepository } from '../../domain/repositories/IDiceGameRepository.js';
import { NotFoundError, ValidationError } from '@pluto/shared';

export interface RollDiceInput {
    gameId: string;
    userId: string;
}

export interface RollDiceResult {
    rollValue: number;
    allPlayersRolled: boolean;
    winners?: string[];
}

/**
 * Handle a player's dice roll
 */
export class RollDiceUseCase {
    constructor(
        private diceGameRepository: IDiceGameRepository,
        private onGameComplete?: (gameId: string, winners: string[]) => Promise<void>
    ) { }

    async execute(input: RollDiceInput): Promise<RollDiceResult> {
        // Find game
        const game = await this.diceGameRepository.findById(input.gameId);
        if (!game) {
            throw new NotFoundError('DiceRoyale game', input.gameId);
        }

        // Check game status
        if (game.status !== 'ROLLING') {
            throw new ValidationError('Game is not in rolling phase');
        }

        // Check player is in game
        const player = game.getPlayer(input.userId);
        if (!player) {
            throw new ValidationError('Player is not in this game');
        }

        // Check player hasn't already rolled
        if (player.hasRolled) {
            throw new ValidationError('Player has already rolled');
        }

        // Record the roll
        const rollValue = game.recordRoll(input.userId);
        await this.diceGameRepository.recordRoll(game.id, input.userId, rollValue);

        // Check if game is complete
        const result: RollDiceResult = {
            rollValue,
            allPlayersRolled: game.allPlayersRolled,
        };

        if (game.allPlayersRolled) {
            // Update status and determine winners
            await this.diceGameRepository.updateStatus(game.id, 'COMPLETE');
            result.winners = game.getWinners();

            // Trigger callback if provided (to settle the contract)
            if (this.onGameComplete) {
                await this.onGameComplete(game.id, result.winners!);
            }
        }

        return result;
    }
}
