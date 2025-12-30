import type { PrismaClient, DiceRoyaleStatus } from '@prisma/client';
import type { IDiceGameRepository } from '../../domain/repositories/IDiceGameRepository.js';
import { DiceGame, DicePlayer } from '../../domain/entities/DiceGame.js';

export class PrismaDiceGameRepository implements IDiceGameRepository {
    constructor(private prisma: PrismaClient) { }

    private toEntity(data: {
        id: string;
        sessionId: string;
        status: DiceRoyaleStatus;
        createdAt: Date;
        rolls: Array<{
            userId: string;
            rollValue: number;
        }>;
    }, playerInfo: Array<{ userId: string; displayName: string }>): DiceGame {
        const players = playerInfo.map(p => {
            const roll = data.rolls.find(r => r.userId === p.userId);
            return new DicePlayer(p.userId, p.displayName, roll?.rollValue ?? null);
        });

        return new DiceGame(
            data.id,
            data.sessionId,
            data.status,
            data.createdAt,
            players
        );
    }

    async findById(id: string): Promise<DiceGame | null> {
        const data = await this.prisma.diceRoyaleGame.findUnique({
            where: { id },
            include: { rolls: true },
        });

        if (!data) return null;

        // Get player info from game session
        const session = await this.prisma.gameSession.findUnique({
            where: { id: data.sessionId },
            include: {
                players: {
                    include: {
                        user: { select: { uniqueDisplayName: true } },
                    },
                },
            },
        });

        if (!session) return null;

        const playerInfo = session.players.map(p => ({
            userId: p.userId,
            displayName: p.user.uniqueDisplayName,
        }));

        return this.toEntity(data, playerInfo);
    }

    async findBySessionId(sessionId: string): Promise<DiceGame | null> {
        const data = await this.prisma.diceRoyaleGame.findUnique({
            where: { sessionId },
            include: { rolls: true },
        });

        if (!data) return null;

        // Get player info from game session
        const session = await this.prisma.gameSession.findUnique({
            where: { id: sessionId },
            include: {
                players: {
                    include: {
                        user: { select: { uniqueDisplayName: true } },
                    },
                },
            },
        });

        if (!session) return null;

        const playerInfo = session.players.map(p => ({
            userId: p.userId,
            displayName: p.user.uniqueDisplayName,
        }));

        return this.toEntity(data, playerInfo);
    }

    async create(data: {
        sessionId: string;
        players: Array<{ userId: string; displayName: string }>;
    }): Promise<DiceGame> {
        const created = await this.prisma.diceRoyaleGame.create({
            data: {
                sessionId: data.sessionId,
                status: 'ROLLING',
            },
            include: { rolls: true },
        });

        return this.toEntity(created, data.players);
    }

    async recordRoll(gameId: string, userId: string, rollValue: number): Promise<void> {
        await this.prisma.diceRoyaleRoll.create({
            data: {
                gameId,
                userId,
                rollValue,
            },
        });
    }

    async updateStatus(id: string, status: 'ROLLING' | 'COMPLETE'): Promise<DiceGame> {
        const updated = await this.prisma.diceRoyaleGame.update({
            where: { id },
            data: { status },
            include: { rolls: true },
        });

        // Get player info
        const session = await this.prisma.gameSession.findUnique({
            where: { id: updated.sessionId },
            include: {
                players: {
                    include: {
                        user: { select: { uniqueDisplayName: true } },
                    },
                },
            },
        });

        const playerInfo = session?.players.map(p => ({
            userId: p.userId,
            displayName: p.user.uniqueDisplayName,
        })) ?? [];

        return this.toEntity(updated, playerInfo);
    }
}
