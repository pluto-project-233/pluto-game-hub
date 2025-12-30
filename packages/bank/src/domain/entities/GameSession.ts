import type { GameSessionStatus } from '@prisma/client';

/**
 * GameSession domain entity
 * Represents an active game with locked funds
 */
export class GameSession {
    constructor(
        public readonly id: string,
        public readonly contractId: string,
        private _status: GameSessionStatus,
        public readonly totalPot: bigint,
        public readonly expiresAt: Date,
        public readonly createdAt: Date,
        private _settledAt: Date | null,
        public readonly players: GameSessionPlayer[]
    ) { }

    get status(): GameSessionStatus {
        return this._status;
    }

    get settledAt(): Date | null {
        return this._settledAt;
    }

    /**
     * Check if session is expired
     */
    isExpired(): boolean {
        return new Date() > this.expiresAt;
    }

    /**
     * Check if session can be settled
     */
    canSettle(): boolean {
        return this._status === 'PENDING' || this._status === 'ACTIVE';
    }

    /**
     * Check if session can be cancelled
     */
    canCancel(): boolean {
        return this._status === 'PENDING' || this._status === 'ACTIVE';
    }

    /**
     * Mark session as active (game started)
     */
    activate(): void {
        if (this._status !== 'PENDING') {
            throw new Error(`Cannot activate session in ${this._status} status`);
        }
        this._status = 'ACTIVE';
    }

    /**
     * Mark session as settled
     */
    settle(): void {
        if (!this.canSettle()) {
            throw new Error(`Cannot settle session in ${this._status} status`);
        }
        this._status = 'SETTLED';
        this._settledAt = new Date();
    }

    /**
     * Mark session as cancelled
     */
    cancel(): void {
        if (!this.canCancel()) {
            throw new Error(`Cannot cancel session in ${this._status} status`);
        }
        this._status = 'CANCELLED';
    }

    /**
     * Mark session as expired
     */
    expire(): void {
        if (this._status === 'SETTLED' || this._status === 'CANCELLED') {
            throw new Error(`Cannot expire session in ${this._status} status`);
        }
        this._status = 'EXPIRED';
    }

    /**
     * Get player by user ID
     */
    getPlayer(userId: string): GameSessionPlayer | undefined {
        return this.players.find(p => p.userId === userId);
    }

    toJSON() {
        return {
            id: this.id,
            contractId: this.contractId,
            status: this._status,
            totalPot: this.totalPot.toString(),
            expiresAt: this.expiresAt.toISOString(),
            createdAt: this.createdAt.toISOString(),
            settledAt: this._settledAt?.toISOString() ?? null,
            players: this.players.map(p => p.toJSON()),
        };
    }
}

/**
 * Player within a game session
 */
export class GameSessionPlayer {
    constructor(
        public readonly id: string,
        public readonly sessionId: string,
        public readonly userId: string,
        public readonly displayName: string,
        public readonly amountLocked: bigint,
        private _isWinner: boolean,
        private _winAmount: bigint
    ) { }

    get isWinner(): boolean {
        return this._isWinner;
    }

    get winAmount(): bigint {
        return this._winAmount;
    }

    /**
     * Mark player as winner with amount
     */
    setWinner(amount: bigint): void {
        this._isWinner = true;
        this._winAmount = amount;
    }

    toJSON() {
        return {
            id: this.id,
            userId: this.userId,
            displayName: this.displayName,
            amountLocked: this.amountLocked.toString(),
            isWinner: this._isWinner,
            winAmount: this._winAmount.toString(),
        };
    }
}
