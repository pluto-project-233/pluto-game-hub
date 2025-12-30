import type { ILedgerRepository } from '../domain/repositories/ILedgerRepository.js';
import type { PaginatedResult, LedgerHistoryItem } from '@pluto/shared';

export interface GetHistoryInput {
    userId: string;
    limit?: number;
    offset?: number;
}

export interface GetHistoryOutput {
    data: LedgerHistoryItem[];
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
}

/**
 * Get user's transaction history
 */
export class GetHistoryUseCase {
    constructor(private ledgerRepository: ILedgerRepository) { }

    async execute(input: GetHistoryInput): Promise<GetHistoryOutput> {
        const limit = Math.min(input.limit ?? 20, 100);
        const offset = input.offset ?? 0;

        const result = await this.ledgerRepository.getHistory(
            input.userId,
            limit,
            offset
        );

        return {
            data: result.data.map(entry => ({
                id: entry.id,
                type: entry.type,
                amount: entry.amount,
                balanceAfter: entry.balanceAfter,
                description: entry.description,
                createdAt: entry.createdAt,
            })),
            total: result.total,
            limit: result.limit,
            offset: result.offset,
            hasMore: result.hasMore,
        };
    }
}
