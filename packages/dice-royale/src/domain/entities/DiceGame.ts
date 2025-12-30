import type { DiceRoyaleStatus } from '@prisma/client';
import { randomInt } from '@pluto/shared';

/**
 * DiceRoyale game domain entity
 * Simple game: highest dice roll wins
 */
export class DiceGame {
    constructor(
        public readonly id: string,
        public readonly sessionId: string,
        private _status: DiceRoyaleStatus,
        public readonly createdAt: Date,
        private _players: DicePlayer[]
    ) { }

    get status(): DiceRoyaleStatus {
        return this._status;
    }

    get players(): DicePlayer[] {
        return [...this._players];
    }

    get allPlayersRolled(): boolean {
        return this._players.every(p => p.hasRolled);
    }

    /**
     * Get a player by user ID
     */
    getPlayer(userId: string): DicePlayer | undefined {
        return this._players.find(p => p.userId === userId);
    }

    /**
     * Record a player's dice roll
     */
    recordRoll(userId: string, value?: number): number {
        const player = this.getPlayer(userId);
        if (!player) {
            throw new Error(`Player ${userId} not in game`);
        }
        if (player.hasRolled) {
            throw new Error(`Player ${userId} already rolled`);
        }
        if (this._status !== 'ROLLING') {
            throw new Error('Game is not in rolling phase');
        }

        // Generate random roll if not provided
        const rollValue = value ?? randomInt(1, 6);
        player.roll(rollValue);

        // Check if all players have rolled
        if (this.allPlayersRolled) {
            this._status = 'COMPLETE';
        }

        return rollValue;
    }

    /**
     * Determine the winner(s)
     * Returns user IDs of winner(s) - can be multiple in case of tie
     */
    getWinners(): string[] {
        if (!this.allPlayersRolled) {
            throw new Error('Not all players have rolled');
        }

        const maxRoll = Math.max(...this._players.map(p => p.rollValue!));
        return this._players
            .filter(p => p.rollValue === maxRoll)
            .map(p => p.userId);
    }

    toJSON() {
        return {
            id: this.id,
            sessionId: this.sessionId,
            status: this._status,
            players: this._players.map(p => p.toJSON()),
            winners: this._status === 'COMPLETE' ? this.getWinners() : undefined,
            createdAt: this.createdAt.toISOString(),
        };
    }
}

/**
 * Player in a dice game
 */
export class DicePlayer {
    private _rollValue: number | null;

    constructor(
        public readonly userId: string,
        public readonly displayName: string,
        rollValue: number | null = null
    ) {
        this._rollValue = rollValue;
    }

    get hasRolled(): boolean {
        return this._rollValue !== null;
    }

    get rollValue(): number | null {
        return this._rollValue;
    }

    roll(value: number): void {
        if (value < 1 || value > 6) {
            throw new Error('Roll value must be between 1 and 6');
        }
        this._rollValue = value;
    }

    toJSON() {
        return {
            userId: this.userId,
            displayName: this.displayName,
            hasRolled: this.hasRolled,
            rollValue: this._rollValue,
        };
    }
}
