import type { LedgerEntry } from '../entities/LedgerEntry.js';
import type { LedgerEntryType } from '@prisma/client';
import type { PaginatedResult } from '@pluto/shared';

/**
 * Repository interface for Ledger operations
 */
export interface ILedgerRepository {
    /**
     * Append a new ledger entry (immutable)
     */
    append(data: {
        userId: string;
        type: LedgerEntryType;
        amount: bigint;
        balanceAfter: bigint;
        description?: string;
        sessionId?: string;
    }): Promise<LedgerEntry>;

    /**
     * Append multiple ledger entries in a transaction
     */
    appendMany(entries: Array<{
        userId: string;
        type: LedgerEntryType;
        amount: bigint;
        balanceAfter: bigint;
        description?: string;
        sessionId?: string;
    }>): Promise<LedgerEntry[]>;

    /**
     * Get paginated history for a user
     */
    getHistory(
        userId: string,
        limit: number,
        offset: number
    ): Promise<PaginatedResult<LedgerEntry>>;

    /**
     * Get entries for a specific session
     */
    getBySessionId(sessionId: string): Promise<LedgerEntry[]>;
}
