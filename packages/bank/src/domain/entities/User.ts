import type { LedgerEntryType } from '@prisma/client';

/**
 * User domain entity
 * Represents a user's financial state
 */
export class User {
    constructor(
        public readonly id: string,
        public readonly firebaseUid: string,
        public readonly displayName: string,
        private _balance: bigint,
        private _lockedBalance: bigint,
        public readonly createdAt: Date
    ) { }

    get balance(): bigint {
        return this._balance;
    }

    get lockedBalance(): bigint {
        return this._lockedBalance;
    }

    get availableBalance(): bigint {
        return this._balance - this._lockedBalance;
    }

    /**
     * Check if user has enough available balance
     */
    canAfford(amount: bigint): boolean {
        return this.availableBalance >= amount;
    }

    /**
     * Lock funds for a game session
     * @throws Error if insufficient funds
     */
    lockFunds(amount: bigint): void {
        if (!this.canAfford(amount)) {
            throw new Error(`Insufficient funds: need ${amount}, have ${this.availableBalance}`);
        }
        this._lockedBalance += amount;
    }

    /**
     * Unlock funds (cancel or return)
     */
    unlockFunds(amount: bigint): void {
        if (amount > this._lockedBalance) {
            throw new Error(`Cannot unlock ${amount}, only ${this._lockedBalance} locked`);
        }
        this._lockedBalance -= amount;
    }

    /**
     * Deduct locked funds (game loss)
     */
    deductLockedFunds(amount: bigint): void {
        if (amount > this._lockedBalance) {
            throw new Error(`Cannot deduct ${amount}, only ${this._lockedBalance} locked`);
        }
        this._lockedBalance -= amount;
        this._balance -= amount;
    }

    /**
     * Add winnings
     */
    addWinnings(amount: bigint): void {
        this._balance += amount;
    }

    /**
     * Add deposit
     */
    deposit(amount: bigint): void {
        if (amount <= 0n) {
            throw new Error('Deposit amount must be positive');
        }
        this._balance += amount;
    }

    /**
     * Withdraw funds
     */
    withdraw(amount: bigint): void {
        if (!this.canAfford(amount)) {
            throw new Error(`Insufficient funds for withdrawal`);
        }
        this._balance -= amount;
    }

    toJSON() {
        return {
            id: this.id,
            firebaseUid: this.firebaseUid,
            displayName: this.displayName,
            balance: this._balance.toString(),
            lockedBalance: this._lockedBalance.toString(),
            availableBalance: this.availableBalance.toString(),
            createdAt: this.createdAt.toISOString(),
        };
    }
}
