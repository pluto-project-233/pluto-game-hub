import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import type { LRUCache } from '@pluto/gateway';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { JoinLobbyUseCase } from '../application/use-cases/JoinLobby.js';
import { LeaveLobbyUseCase } from '../application/use-cases/LeaveLobby.js';
import { GetLobbiesUseCase } from '../application/use-cases/GetLobbies.js';
import { GetLobbyStatusUseCase } from '../application/use-cases/GetLobbyStatus.js';
import { PrismaLobbyRepository } from '../infrastructure/repositories/PrismaLobbyRepository.js';
import { LobbyBroadcaster } from '../infrastructure/sse/LobbyBroadcaster.js';

// Validation schemas
const JoinLobbySchema = z.object({
    contractId: z.string().uuid(),
});

export interface LobbyRoutesConfig {
    prisma: PrismaClient;
    verifyFirebaseToken: (token: string) => Promise<{ uid: string } | null>;
    getUserByFirebaseUid: (uid: string) => Promise<{
        id: string;
        displayName: string;
        balance: bigint;
    } | null>;
    getContractInfo: (contractId: string) => Promise<{
        entryFee: bigint;
        minPlayers: number;
        maxPlayers: number;
    } | null>;
}

export function registerLobbyRoutes(
    app: FastifyInstance,
    cache: LRUCache<string, unknown>,
    config: LobbyRoutesConfig
) {
    const { prisma, verifyFirebaseToken, getUserByFirebaseUid, getContractInfo } = config;

    // Initialize
    const lobbyRepo = new PrismaLobbyRepository(prisma);
    const broadcaster = new LobbyBroadcaster();

    // Start heartbeat
    broadcaster.startHeartbeat(30000);

    // Initialize use cases
    const joinLobby = new JoinLobbyUseCase(lobbyRepo, broadcaster, getContractInfo);
    const leaveLobby = new LeaveLobbyUseCase(lobbyRepo, broadcaster);
    const getLobbies = new GetLobbiesUseCase(lobbyRepo);
    const getLobbyStatus = new GetLobbyStatusUseCase(lobbyRepo);

    // Helper to verify user
    async function authenticateUser(authHeader: string | undefined) {
        if (!authHeader?.startsWith('Bearer ')) {
            return null;
        }
        const decoded = await verifyFirebaseToken(authHeader.slice(7));
        if (!decoded) return null;
        return getUserByFirebaseUid(decoded.uid);
    }

    // ============================================
    // Lobby Routes
    // ============================================

    // List lobbies
    app.get('/lobbies', async (request, reply) => {
        const query = request.query as { contractId?: string };
        const lobbies = await getLobbies.execute({ contractId: query.contractId });

        // Serialize BigInt
        return lobbies.map(l => ({
            ...l,
            entryFee: l.entryFee.toString(),
        }));
    });

    // Get lobby status
    app.get('/lobbies/:id/status', async (request, reply) => {
        const params = request.params as { id: string };
        const lobby = await getLobbyStatus.execute({ lobbyId: params.id });

        return {
            ...lobby,
            entryFee: lobby.entryFee.toString(),
        };
    });

    // SSE endpoint for lobby events
    app.get('/lobbies/:id/events', async (request, reply) => {
        const params = request.params as { id: string };
        const lobbyId = params.id;

        // Verify lobby exists
        const lobby = await lobbyRepo.findById(lobbyId);
        if (!lobby) {
            return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Lobby not found' } });
        }

        // Set up SSE headers
        reply.raw.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
        });

        // Send initial connection event
        reply.raw.write(`data: ${JSON.stringify({ type: 'connected', lobbyId })}\n\n`);

        // Add client to broadcaster
        const clientId = randomUUID();
        broadcaster.addClient(lobbyId, clientId, reply);

        // Keep connection open
        request.raw.on('close', () => {
            broadcaster.removeClient(lobbyId, clientId);
        });

        // Don't end the response - it's a continuous stream
        return reply;
    });

    // Join lobby
    app.post('/lobby/join', async (request, reply) => {
        const user = await authenticateUser(request.headers.authorization);
        if (!user) {
            return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'Invalid token' } });
        }

        const parsed = JoinLobbySchema.safeParse(request.body);
        if (!parsed.success) {
            return reply.status(400).send({
                error: { code: 'VALIDATION_ERROR', message: 'Invalid request', details: parsed.error.flatten() }
            });
        }

        const result = await joinLobby.execute({
            userId: user.id,
            displayName: user.displayName,
            contractId: parsed.data.contractId,
            userBalance: user.balance,
        });

        return result;
    });

    // Leave lobby
    app.post('/lobby/leave', async (request, reply) => {
        const user = await authenticateUser(request.headers.authorization);
        if (!user) {
            return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'Invalid token' } });
        }

        const result = await leaveLobby.execute({ userId: user.id });
        return result;
    });

    return { broadcaster };
}
