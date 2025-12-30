import type { PrismaClient, LedgerEntryType } from '@prisma/client';
import type { ILedgerRepository } from '../../domain/repositories/ILedgerRepository.js';
import type { PaginatedResult } from '@pluto/shared';
import { LedgerEntry } from '../../domain/entities/LedgerEntry.js';

export class PrismaLedgerRepository implements ILedgerRepository {
    constructor(private prisma: PrismaClient) { }

    private toEntity(data: {
        id: string;
        userId: string;
        type: LedgerEntryType;
        amount: bigint;
        balanceAfter: bigint;
        description: string | null;
        sessionId: string | null;
        createdAt: Date;
    }): LedgerEntry {
        return new LedgerEntry(
            data.id,
            data.userId,
            data.type,
            data.amount,
            data.balanceAfter,
            data.description,
            data.sessionId,
            data.createdAt
        );
    }

    async append(data: {
        userId: string;
        type: LedgerEntryType;
        amount: bigint;
        balanceAfter: bigint;
        description?: string;
        sessionId?: string;
    }): Promise<LedgerEntry> {
        const created = await this.prisma.ledgerEntry.create({
            data: {
                userId: data.userId,
                type: data.type,
                amount: data.amount,
                balanceAfter: data.balanceAfter,
                description: data.description ?? null,
                sessionId: data.sessionId ?? null,
            },
        });
        return this.toEntity(created);
    }

    async appendMany(entries: Array<{
        userId: string;
        type: LedgerEntryType;
        amount: bigint;
        balanceAfter: bigint;
        description?: string;
        sessionId?: string;
    }>): Promise<LedgerEntry[]> {
        // Use transaction to ensure atomicity
        const created = await this.prisma.$transaction(
            entries.map(entry =>
                this.prisma.ledgerEntry.create({
                    data: {
                        userId: entry.userId,
                        type: entry.type,
                        amount: entry.amount,
                        balanceAfter: entry.balanceAfter,
                        description: entry.description ?? null,
                        sessionId: entry.sessionId ?? null,
                    },
                })
            )
        );
        return created.map(c => this.toEntity(c));
    }

    async getHistory(
        userId: string,
        limit: number,
        offset: number
    ): Promise<PaginatedResult<LedgerEntry>> {
        const [data, total] = await Promise.all([
            this.prisma.ledgerEntry.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip: offset,
            }),
            this.prisma.ledgerEntry.count({ where: { userId } }),
        ]);

        return {
            data: data.map(d => this.toEntity(d)),
            total,
            limit,
            offset,
            hasMore: offset + data.length < total,
        };
    }

    async getBySessionId(sessionId: string): Promise<LedgerEntry[]> {
        const data = await this.prisma.ledgerEntry.findMany({
            where: { sessionId },
            orderBy: { createdAt: 'asc' },
        });
        return data.map(d => this.toEntity(d));
    }
}
