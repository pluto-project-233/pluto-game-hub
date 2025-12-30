import type { PrismaClient } from '@prisma/client';
import type { IContractRepository } from '../../domain/repositories/IContractRepository.js';
import { Contract, Game } from '../../domain/entities/Contract.js';

export class PrismaContractRepository implements IContractRepository {
    constructor(private prisma: PrismaClient) { }

    private toContractEntity(data: {
        id: string;
        gameId: string;
        name: string;
        entryFee: bigint;
        platformFee: number;
        minPlayers: number;
        maxPlayers: number;
        ttlSeconds: number;
        isActive: boolean;
        createdAt: Date;
        game: { name: string };
    }): Contract {
        return new Contract(
            data.id,
            data.gameId,
            data.game.name,
            data.name,
            data.entryFee,
            data.platformFee,
            data.minPlayers,
            data.maxPlayers,
            data.ttlSeconds,
            data.isActive,
            data.createdAt
        );
    }

    private toGameEntity(data: {
        id: string;
        name: string;
        description: string | null;
        clientSecret: string;
        callbackUrl: string | null;
        isActive: boolean;
        createdAt: Date;
    }): Game {
        return new Game(
            data.id,
            data.name,
            data.description,
            data.clientSecret,
            data.callbackUrl,
            data.isActive,
            data.createdAt
        );
    }

    async findContractById(id: string): Promise<Contract | null> {
        const data = await this.prisma.contract.findUnique({
            where: { id },
            include: { game: { select: { name: true } } },
        });
        return data ? this.toContractEntity(data) : null;
    }

    async findContractsByGameId(gameId: string): Promise<Contract[]> {
        const data = await this.prisma.contract.findMany({
            where: { gameId, isActive: true },
            include: { game: { select: { name: true } } },
        });
        return data.map(d => this.toContractEntity(d));
    }

    async createContract(data: {
        gameId: string;
        name: string;
        entryFee: bigint;
        platformFee: number;
        minPlayers: number;
        maxPlayers: number;
        ttlSeconds?: number;
    }): Promise<Contract> {
        const created = await this.prisma.contract.create({
            data: {
                gameId: data.gameId,
                name: data.name,
                entryFee: data.entryFee,
                platformFee: data.platformFee,
                minPlayers: data.minPlayers,
                maxPlayers: data.maxPlayers,
                ttlSeconds: data.ttlSeconds ?? 3600,
            },
            include: { game: { select: { name: true } } },
        });
        return this.toContractEntity(created);
    }

    async findGameById(id: string): Promise<Game | null> {
        const data = await this.prisma.game.findUnique({ where: { id } });
        return data ? this.toGameEntity(data) : null;
    }

    async findGameByName(name: string): Promise<Game | null> {
        const data = await this.prisma.game.findUnique({ where: { name } });
        return data ? this.toGameEntity(data) : null;
    }

    async createGame(data: {
        name: string;
        description?: string;
        clientSecretHash: string;
        callbackUrl?: string;
    }): Promise<Game> {
        const created = await this.prisma.game.create({
            data: {
                name: data.name,
                description: data.description ?? null,
                clientSecret: data.clientSecretHash,
                callbackUrl: data.callbackUrl ?? null,
            },
        });
        return this.toGameEntity(created);
    }

    async verifyGameSecret(gameId: string, secretHash: string): Promise<boolean> {
        const game = await this.prisma.game.findUnique({
            where: { id: gameId },
            select: { clientSecret: true },
        });
        return game?.clientSecret === secretHash;
    }
}
