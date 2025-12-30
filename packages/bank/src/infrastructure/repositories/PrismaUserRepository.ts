import type { PrismaClient } from '@prisma/client';
import type { IUserRepository } from '../../domain/repositories/IUserRepository.js';
import { User } from '../../domain/entities/User.js';

export class PrismaUserRepository implements IUserRepository {
    constructor(private prisma: PrismaClient) { }

    private toEntity(data: {
        id: string;
        firebaseUid: string;
        uniqueDisplayName: string;
        balance: bigint;
        lockedBalance: bigint;
        createdAt: Date;
    }): User {
        return new User(
            data.id,
            data.firebaseUid,
            data.uniqueDisplayName,
            data.balance,
            data.lockedBalance,
            data.createdAt
        );
    }

    async findById(id: string): Promise<User | null> {
        const data = await this.prisma.user.findUnique({ where: { id } });
        return data ? this.toEntity(data) : null;
    }

    async findByFirebaseUid(uid: string): Promise<User | null> {
        const data = await this.prisma.user.findUnique({
            where: { firebaseUid: uid }
        });
        return data ? this.toEntity(data) : null;
    }

    async findByIds(ids: string[]): Promise<User[]> {
        const data = await this.prisma.user.findMany({
            where: { id: { in: ids } },
        });
        return data.map(d => this.toEntity(d));
    }

    async findByFirebaseUids(uids: string[]): Promise<User[]> {
        const data = await this.prisma.user.findMany({
            where: { firebaseUid: { in: uids } },
        });
        return data.map(d => this.toEntity(d));
    }

    async create(data: {
        firebaseUid: string;
        displayName: string;
        balance?: bigint;
    }): Promise<User> {
        const created = await this.prisma.user.create({
            data: {
                firebaseUid: data.firebaseUid,
                uniqueDisplayName: data.displayName,
                balance: data.balance ?? 0n,
                lockedBalance: 0n,
            },
        });
        return this.toEntity(created);
    }

    async updateBalance(
        id: string,
        balance: bigint,
        lockedBalance: bigint
    ): Promise<User> {
        const updated = await this.prisma.user.update({
            where: { id },
            data: { balance, lockedBalance },
        });
        return this.toEntity(updated);
    }

    async isDisplayNameAvailable(displayName: string): Promise<boolean> {
        const normalized = displayName.toLowerCase();
        const existing = await this.prisma.user.findFirst({
            where: {
                uniqueDisplayName: {
                    equals: normalized,
                    mode: 'insensitive',
                },
            },
        });
        return !existing;
    }

    async updateDisplayName(id: string, displayName: string): Promise<User> {
        const updated = await this.prisma.user.update({
            where: { id },
            data: { uniqueDisplayName: displayName },
        });
        return this.toEntity(updated);
    }
}
