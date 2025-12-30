import type { LedgerEntryType } from '@prisma/client';

/**
 * LedgerEntry domain entity
 * Represents an immutable transaction record
 */
export class LedgerEntry {
    constructor(
        public readonly id: string,
        public readonly userId: string,
        public readonly type: LedgerEntryType,
        public readonly amount: bigint,
        public readonly balanceAfter: bigint,
        public readonly description: string | null,
        public readonly sessionId: string | null,
        public readonly createdAt: Date
    ) { }

    /**
     * Check if this is a credit (adds to balance)
     */
    isCredit(): boolean {
        return ['DEPOSIT', 'WIN', 'UNLOCK'].includes(this.type);
    }

    /**
     * Check if this is a debit (removes from balance)
     */
    isDebit(): boolean {
        return ['WITHDRAW', 'LOSE', 'LOCK', 'FEE'].includes(this.type);
    }

    toJSON() {
        return {
            id: this.id,
            userId: this.userId,
            type: this.type,
            amount: this.amount.toString(),
            balanceAfter: this.balanceAfter.toString(),
            description: this.description,
            sessionId: this.sessionId,
            createdAt: this.createdAt.toISOString(),
        };
    }
}

/**
 * Factory for creating ledger entries
 */
export class LedgerEntryFactory {
    static createLock(
        userId: string,
        amount: bigint,
        balanceAfter: bigint,
        sessionId: string
    ): Omit<LedgerEntry, 'id' | 'createdAt'> {
        return {
            userId,
            type: 'LOCK' as LedgerEntryType,
            amount,
            balanceAfter,
            description: 'Funds locked for game session',
            sessionId,
            isCredit: () => false,
            isDebit: () => true,
            toJSON: () => ({}) as any,
        };
    }

    static createUnlock(
        userId: string,
        amount: bigint,
        balanceAfter: bigint,
        sessionId: string
    ): Omit<LedgerEntry, 'id' | 'createdAt'> {
        return {
            userId,
            type: 'UNLOCK' as LedgerEntryType,
            amount,
            balanceAfter,
            description: 'Funds unlocked - game cancelled',
            sessionId,
            isCredit: () => true,
            isDebit: () => false,
            toJSON: () => ({}) as any,
        };
    }

    static createWin(
        userId: string,
        amount: bigint,
        balanceAfter: bigint,
        sessionId: string
    ): Omit<LedgerEntry, 'id' | 'createdAt'> {
        return {
            userId,
            type: 'WIN' as LedgerEntryType,
            amount,
            balanceAfter,
            description: 'Game winnings',
            sessionId,
            isCredit: () => true,
            isDebit: () => false,
            toJSON: () => ({}) as any,
        };
    }

    static createLose(
        userId: string,
        amount: bigint,
        balanceAfter: bigint,
        sessionId: string
    ): Omit<LedgerEntry, 'id' | 'createdAt'> {
        return {
            userId,
            type: 'LOSE' as LedgerEntryType,
            amount,
            balanceAfter,
            description: 'Game entry fee',
            sessionId,
            isCredit: () => false,
            isDebit: () => true,
            toJSON: () => ({}) as any,
        };
    }

    static createFee(
        userId: string,
        amount: bigint,
        balanceAfter: bigint,
        sessionId: string
    ): Omit<LedgerEntry, 'id' | 'createdAt'> {
        return {
            userId,
            type: 'FEE' as LedgerEntryType,
            amount,
            balanceAfter,
            description: 'Platform fee',
            sessionId,
            isCredit: () => false,
            isDebit: () => true,
            toJSON: () => ({}) as any,
        };
    }
}
