import type { PrismaClient, LobbyStatus } from '@prisma/client';
import type { ILobbyRepository } from '../../domain/repositories/ILobbyRepository.js';
import { Lobby, LobbyPlayer } from '../../domain/entities/Lobby.js';

export class PrismaLobbyRepository implements ILobbyRepository {
    constructor(private prisma: PrismaClient) { }

    private toEntity(data: {
        id: string;
        contractId: string;
        status: LobbyStatus;
        createdAt: Date;
        contract: {
            name: string;
            entryFee: bigint;
            minPlayers: number;
            maxPlayers: number;
            game: { name: string };
        };
        players: Array<{
            id: string;
            lobbyId: string;
            userId: string;
            joinedAt: Date;
            user: { uniqueDisplayName: string };
        }>;
    }): Lobby {
        const players = data.players.map(p => new LobbyPlayer(
            p.id,
            p.lobbyId,
            p.userId,
            p.user.uniqueDisplayName,
            p.joinedAt
        ));

        return new Lobby(
            data.id,
            data.contractId,
            data.contract.name,
            data.contract.game.name,
            data.contract.entryFee,
            data.contract.minPlayers,
            data.contract.maxPlayers,
            data.status,
            data.createdAt,
            players
        );
    }

    private includeClause = {
        contract: {
            select: {
                name: true,
                entryFee: true,
                minPlayers: true,
                maxPlayers: true,
                game: { select: { name: true } },
            },
        },
        players: {
            include: {
                user: { select: { uniqueDisplayName: true } },
            },
        },
    };

    async findById(id: string): Promise<Lobby | null> {
        const data = await this.prisma.lobby.findUnique({
            where: { id },
            include: this.includeClause,
        });
        return data ? this.toEntity(data) : null;
    }

    async findByContractId(contractId: string, status?: LobbyStatus): Promise<Lobby[]> {
        const data = await this.prisma.lobby.findMany({
            where: {
                contractId,
                ...(status ? { status } : {}),
            },
            include: this.includeClause,
            orderBy: { createdAt: 'desc' },
        });
        return data.map(d => this.toEntity(d));
    }

    async findWaitingLobbies(): Promise<Lobby[]> {
        const data = await this.prisma.lobby.findMany({
            where: { status: 'WAITING' },
            include: this.includeClause,
            orderBy: { createdAt: 'desc' },
        });
        return data.map(d => this.toEntity(d));
    }

    async findByUserId(userId: string): Promise<Lobby | null> {
        const lobbyPlayer = await this.prisma.lobbyPlayer.findFirst({
            where: { userId },
            include: {
                lobby: {
                    include: this.includeClause,
                },
            },
        });

        if (!lobbyPlayer || lobbyPlayer.lobby.status === 'CLOSED' || lobbyPlayer.lobby.status === 'IN_GAME') {
            return null;
        }

        return this.toEntity(lobbyPlayer.lobby);
    }

    async create(data: { contractId: string }): Promise<Lobby> {
        const created = await this.prisma.lobby.create({
            data: {
                contractId: data.contractId,
                status: 'WAITING',
            },
            include: this.includeClause,
        });
        return this.toEntity(created);
    }

    async addPlayer(lobbyId: string, userId: string): Promise<LobbyPlayer> {
        const created = await this.prisma.lobbyPlayer.create({
            data: {
                lobbyId,
                userId,
            },
            include: {
                user: { select: { uniqueDisplayName: true } },
            },
        });

        return new LobbyPlayer(
            created.id,
            created.lobbyId,
            created.userId,
            created.user.uniqueDisplayName,
            created.joinedAt
        );
    }

    async removePlayer(lobbyId: string, userId: string): Promise<void> {
        await this.prisma.lobbyPlayer.deleteMany({
            where: { lobbyId, userId },
        });
    }

    async updateStatus(id: string, status: LobbyStatus): Promise<Lobby> {
        const updated = await this.prisma.lobby.update({
            where: { id },
            data: { status },
            include: this.includeClause,
        });
        return this.toEntity(updated);
    }

    async getOrCreateWaitingLobby(contractId: string): Promise<Lobby> {
        // Find existing waiting lobby that isn't full
        const existing = await this.prisma.lobby.findFirst({
            where: {
                contractId,
                status: 'WAITING',
            },
            include: {
                ...this.includeClause,
                _count: { select: { players: true } },
            },
        });

        if (existing && existing._count.players < existing.contract.maxPlayers) {
            return this.toEntity(existing);
        }

        // Create new lobby
        return this.create({ contractId });
    }
}
