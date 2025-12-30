import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import type { LRUCache } from '@pluto/gateway';
import { z } from 'zod';
import { GetBalanceUseCase } from '../application/use-cases/GetBalance.js';
import { GetHistoryUseCase } from '../application/use-cases/GetHistory.js';
import { ExecuteContractUseCase } from '../application/use-cases/ExecuteContract.js';
import { SettleContractUseCase } from '../application/use-cases/SettleContract.js';
import { CancelContractUseCase } from '../application/use-cases/CancelContract.js';
import { RegisterGameUseCase } from '../application/use-cases/RegisterGame.js';
import { CreateContractUseCase } from '../application/use-cases/CreateContract.js';
import { PrismaUserRepository } from '../infrastructure/repositories/PrismaUserRepository.js';
import { PrismaLedgerRepository } from '../infrastructure/repositories/PrismaLedgerRepository.js';
import { PrismaContractRepository } from '../infrastructure/repositories/PrismaContractRepository.js';
import { PrismaSessionRepository } from '../infrastructure/repositories/PrismaSessionRepository.js';

// Validation schemas
const ExecuteContractSchema = z.object({
    contractId: z.string().uuid(),
    playerIds: z.array(z.string()).min(1),
});

const SettleContractSchema = z.object({
    sessionToken: z.string(),
    results: z.array(z.object({
        playerId: z.string(),
        isWinner: z.boolean(),
        winAmount: z.string().optional(),
    })),
});

const CancelContractSchema = z.object({
    sessionToken: z.string(),
    reason: z.string().optional(),
});

const RegisterGameSchema = z.object({
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    callbackUrl: z.string().url().optional(),
});

const CreateContractSchema = z.object({
    gameId: z.string().uuid(),
    name: z.string().min(1).max(100),
    entryFee: z.string(), // BigInt as string
    platformFee: z.number().min(0).max(100),
    minPlayers: z.number().int().min(1),
    maxPlayers: z.number().int().min(1),
    ttlSeconds: z.number().int().min(60).optional(),
});

export interface BankRoutesConfig {
    prisma: PrismaClient;
    generateSessionToken: (payload: any) => string;
    verifySessionToken: (token: string) => any;
    verifyFirebaseToken: (token: string) => Promise<{ uid: string } | null>;
    verifyHmacSignature: (body: string, signature: string, gameId: string) => Promise<boolean>;
}

export function registerBankRoutes(
    app: FastifyInstance,
    cache: LRUCache<string, unknown>,
    config: BankRoutesConfig
) {
    const { prisma, generateSessionToken, verifySessionToken, verifyFirebaseToken, verifyHmacSignature } = config;

    // Initialize repositories
    const userRepo = new PrismaUserRepository(prisma);
    const ledgerRepo = new PrismaLedgerRepository(prisma);
    const contractRepo = new PrismaContractRepository(prisma);
    const sessionRepo = new PrismaSessionRepository(prisma);

    // Initialize use cases
    const getBalance = new GetBalanceUseCase(userRepo);
    const getHistory = new GetHistoryUseCase(ledgerRepo);
    const executeContract = new ExecuteContractUseCase(
        userRepo, contractRepo, sessionRepo, ledgerRepo, generateSessionToken
    );
    const settleContract = new SettleContractUseCase(
        userRepo, contractRepo, sessionRepo, ledgerRepo, verifySessionToken
    );
    const cancelContract = new CancelContractUseCase(
        userRepo, sessionRepo, ledgerRepo, verifySessionToken
    );
    const registerGame = new RegisterGameUseCase(contractRepo);
    const createContract = new CreateContractUseCase(contractRepo);

    // ============================================
    // Player Routes (Firebase Auth)
    // ============================================

    app.get('/me/balance', async (request, reply) => {
        const auth = request.headers.authorization;
        if (!auth?.startsWith('Bearer ')) {
            return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'Missing token' } });
        }

        const decoded = await verifyFirebaseToken(auth.slice(7));
        if (!decoded) {
            return reply.status(401).send({ error: { code: 'INVALID_TOKEN', message: 'Invalid token' } });
        }

        // Find user by Firebase UID
        const user = await userRepo.findByFirebaseUid(decoded.uid);
        if (!user) {
            return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'User not found' } });
        }

        const result = await getBalance.execute({ userId: user.id });
        return result;
    });

    app.get('/me/history', async (request, reply) => {
        const auth = request.headers.authorization;
        if (!auth?.startsWith('Bearer ')) {
            return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'Missing token' } });
        }

        const decoded = await verifyFirebaseToken(auth.slice(7));
        if (!decoded) {
            return reply.status(401).send({ error: { code: 'INVALID_TOKEN', message: 'Invalid token' } });
        }

        const user = await userRepo.findByFirebaseUid(decoded.uid);
        if (!user) {
            return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'User not found' } });
        }

        const query = request.query as { limit?: string; offset?: string };
        const result = await getHistory.execute({
            userId: user.id,
            limit: query.limit ? parseInt(query.limit, 10) : undefined,
            offset: query.offset ? parseInt(query.offset, 10) : undefined,
        });

        return result;
    });

    // ============================================
    // Contract Routes (HMAC Auth)
    // ============================================

    app.post('/contracts/execute', async (request, reply) => {
        const signature = request.headers['x-pluto-signature'] as string;
        const gameId = request.headers['x-game-id'] as string;

        if (!signature || !gameId) {
            return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'Missing signature or game ID' } });
        }

        const body = JSON.stringify(request.body);
        const isValid = await verifyHmacSignature(body, signature, gameId);
        if (!isValid) {
            return reply.status(401).send({ error: { code: 'INVALID_SIGNATURE', message: 'Invalid HMAC signature' } });
        }

        const parsed = ExecuteContractSchema.safeParse(request.body);
        if (!parsed.success) {
            return reply.status(400).send({
                error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', details: parsed.error.flatten() }
            });
        }

        const result = await executeContract.execute({
            contractId: parsed.data.contractId,
            playerFirebaseUids: parsed.data.playerIds,
        });

        // Invalidate balance cache for all players
        for (const player of result.players) {
            cache.delete(`balance:${player.id}`);
        }

        return result;
    });

    app.post('/contracts/settle', async (request, reply) => {
        const signature = request.headers['x-pluto-signature'] as string;
        const gameId = request.headers['x-game-id'] as string;

        if (!signature || !gameId) {
            return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'Missing signature or game ID' } });
        }

        const body = JSON.stringify(request.body);
        const isValid = await verifyHmacSignature(body, signature, gameId);
        if (!isValid) {
            return reply.status(401).send({ error: { code: 'INVALID_SIGNATURE', message: 'Invalid HMAC signature' } });
        }

        const parsed = SettleContractSchema.safeParse(request.body);
        if (!parsed.success) {
            return reply.status(400).send({
                error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', details: parsed.error.flatten() }
            });
        }

        const result = await settleContract.execute({
            sessionToken: parsed.data.sessionToken,
            results: parsed.data.results.map(r => ({
                playerId: r.playerId,
                isWinner: r.isWinner,
                winAmount: r.winAmount ? BigInt(r.winAmount) : undefined,
            })),
        });

        return result;
    });

    app.post('/contracts/cancel', async (request, reply) => {
        const signature = request.headers['x-pluto-signature'] as string;
        const gameId = request.headers['x-game-id'] as string;

        if (!signature || !gameId) {
            return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'Missing signature or game ID' } });
        }

        const body = JSON.stringify(request.body);
        const isValid = await verifyHmacSignature(body, signature, gameId);
        if (!isValid) {
            return reply.status(401).send({ error: { code: 'INVALID_SIGNATURE', message: 'Invalid HMAC signature' } });
        }

        const parsed = CancelContractSchema.safeParse(request.body);
        if (!parsed.success) {
            return reply.status(400).send({
                error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', details: parsed.error.flatten() }
            });
        }

        const result = await cancelContract.execute(parsed.data);
        return result;
    });

    // ============================================
    // Admin Routes
    // ============================================

    app.post('/dev/games', async (request, reply) => {
        // TODO: Add admin authentication
        const parsed = RegisterGameSchema.safeParse(request.body);
        if (!parsed.success) {
            return reply.status(400).send({
                error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', details: parsed.error.flatten() }
            });
        }

        const result = await registerGame.execute(parsed.data);
        return result;
    });

    app.post('/dev/contracts', async (request, reply) => {
        // TODO: Add admin authentication
        const parsed = CreateContractSchema.safeParse(request.body);
        if (!parsed.success) {
            return reply.status(400).send({
                error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', details: parsed.error.flatten() }
            });
        }

        const result = await createContract.execute({
            ...parsed.data,
            entryFee: BigInt(parsed.data.entryFee),
        });
        return result;
    });
}
