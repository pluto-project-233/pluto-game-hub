import type { PrismaClient, GameSessionStatus } from '@prisma/client';
import type { ISessionRepository } from '../../domain/repositories/ISessionRepository.js';
import { GameSession, GameSessionPlayer } from '../../domain/entities/GameSession.js';

export class PrismaSessionRepository implements ISessionRepository {
    constructor(private prisma: PrismaClient) { }

    private toEntity(data: {
        id: string;
        contractId: string;
        status: GameSessionStatus;
        totalPot: bigint;
        expiresAt: Date;
        createdAt: Date;
        settledAt: Date | null;
        players: Array<{
            id: string;
            sessionId: string;
            userId: string;
            amountLocked: bigint;
            isWinner: boolean;
            winAmount: bigint;
            user: { uniqueDisplayName: string };
        }>;
    }): GameSession {
        const players = data.players.map(p => new GameSessionPlayer(
            p.id,
            p.sessionId,
            p.userId,
            p.user.uniqueDisplayName,
            p.amountLocked,
            p.isWinner,
            p.winAmount
        ));

        return new GameSession(
            data.id,
            data.contractId,
            data.status,
            data.totalPot,
            data.expiresAt,
            data.createdAt,
            data.settledAt,
            players
        );
    }

    async findById(id: string): Promise<GameSession | null> {
        const data = await this.prisma.gameSession.findUnique({
            where: { id },
            include: {
                players: {
                    include: {
                        user: { select: { uniqueDisplayName: true } },
                    },
                },
            },
        });
        return data ? this.toEntity(data) : null;
    }

    async create(data: {
        contractId: string;
        totalPot: bigint;
        expiresAt: Date;
        players: Array<{
            userId: string;
            displayName: string;
            amountLocked: bigint;
        }>;
    }): Promise<GameSession> {
        const created = await this.prisma.gameSession.create({
            data: {
                contractId: data.contractId,
                totalPot: data.totalPot,
                expiresAt: data.expiresAt,
                status: 'PENDING',
                players: {
                    create: data.players.map(p => ({
                        userId: p.userId,
                        amountLocked: p.amountLocked,
                    })),
                },
            },
            include: {
                players: {
                    include: {
                        user: { select: { uniqueDisplayName: true } },
                    },
                },
            },
        });
        return this.toEntity(created);
    }

    async updateStatus(id: string, status: GameSessionStatus): Promise<GameSession> {
        const updated = await this.prisma.gameSession.update({
            where: { id },
            data: {
                status,
                settledAt: status === 'SETTLED' ? new Date() : undefined,
            },
            include: {
                players: {
                    include: {
                        user: { select: { uniqueDisplayName: true } },
                    },
                },
            },
        });
        return this.toEntity(updated);
    }

    async settle(
        id: string,
        results: Array<{
            playerId: string;
            isWinner: boolean;
            winAmount: bigint;
        }>
    ): Promise<GameSession> {
        // Update session and player results in transaction
        await this.prisma.$transaction([
            ...results.map(r =>
                this.prisma.gameSessionPlayer.updateMany({
                    where: { sessionId: id, userId: r.playerId },
                    data: { isWinner: r.isWinner, winAmount: r.winAmount },
                })
            ),
            this.prisma.gameSession.update({
                where: { id },
                data: { status: 'SETTLED', settledAt: new Date() },
            }),
        ]);

        return (await this.findById(id))!;
    }

    async findExpiredSessions(): Promise<GameSession[]> {
        const data = await this.prisma.gameSession.findMany({
            where: {
                status: { in: ['PENDING', 'ACTIVE'] },
                expiresAt: { lt: new Date() },
            },
            include: {
                players: {
                    include: {
                        user: { select: { uniqueDisplayName: true } },
                    },
                },
            },
        });
        return data.map(d => this.toEntity(d));
    }

    async findByStatus(status: GameSessionStatus): Promise<GameSession[]> {
        const data = await this.prisma.gameSession.findMany({
            where: { status },
            include: {
                players: {
                    include: {
                        user: { select: { uniqueDisplayName: true } },
                    },
                },
            },
        });
        return data.map(d => this.toEntity(d));
    }
}
