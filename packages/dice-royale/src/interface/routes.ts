import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import type { LRUCache } from '@pluto/gateway';
import { StartGameUseCase } from '../application/use-cases/StartGame.js';
import { RollDiceUseCase } from '../application/use-cases/RollDice.js';
import { GetGameStateUseCase } from '../application/use-cases/GetGameState.js';
import { PrismaDiceGameRepository } from '../infrastructure/repositories/PrismaDiceGameRepository.js';

export interface DiceRoyaleRoutesConfig {
    prisma: PrismaClient;
    verifyFirebaseToken: (token: string) => Promise<{ uid: string } | null>;
    getUserByFirebaseUid: (uid: string) => Promise<{ id: string } | null>;
    settleGame: (sessionId: string, winners: string[]) => Promise<void>;
}

export function registerDiceRoyaleRoutes(
    app: FastifyInstance,
    cache: LRUCache<string, unknown>,
    config: DiceRoyaleRoutesConfig
) {
    const { prisma, verifyFirebaseToken, getUserByFirebaseUid, settleGame } = config;

    // Initialize
    const diceGameRepo = new PrismaDiceGameRepository(prisma);

    // Game completion callback - settles the contract
    const onGameComplete = async (gameId: string, winnerUserIds: string[]) => {
        const game = await diceGameRepo.findById(gameId);
        if (game) {
            await settleGame(game.sessionId, winnerUserIds);
        }
    };

    // Initialize use cases
    const startGame = new StartGameUseCase(diceGameRepo);
    const rollDice = new RollDiceUseCase(diceGameRepo, onGameComplete);
    const getGameState = new GetGameStateUseCase(diceGameRepo);

    // Helper to authenticate user
    async function authenticateUser(authHeader: string | undefined) {
        if (!authHeader?.startsWith('Bearer ')) {
            return null;
        }
        const decoded = await verifyFirebaseToken(authHeader.slice(7));
        if (!decoded) return null;
        return getUserByFirebaseUid(decoded.uid);
    }

    // ============================================
    // DiceRoyale Routes
    // ============================================

    // Get game state by session ID
    app.get('/dice-royale/:sessionId/state', async (request, reply) => {
        const params = request.params as { sessionId: string };

        try {
            const state = await getGameState.execute({ sessionId: params.sessionId });
            return state;
        } catch (error: any) {
            if (error.name === 'NotFoundError') {
                return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Game not found' } });
            }
            throw error;
        }
    });

    // Roll dice (player action)
    app.post('/dice-royale/:gameId/roll', async (request, reply) => {
        const user = await authenticateUser(request.headers.authorization);
        if (!user) {
            return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'Invalid token' } });
        }

        const params = request.params as { gameId: string };

        try {
            const result = await rollDice.execute({
                gameId: params.gameId,
                userId: user.id,
            });

            return result;
        } catch (error: any) {
            if (error.name === 'NotFoundError') {
                return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Game not found' } });
            }
            if (error.name === 'ValidationError') {
                return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: error.message } });
            }
            throw error;
        }
    });

    // Internal: Start game (called by lobby when match starts)
    app.post('/dice-royale/start', async (request, reply) => {
        // This endpoint should be called internally when a lobby match starts
        // In production, this would be protected by internal auth
        const body = request.body as {
            sessionId: string;
            players: Array<{ userId: string; displayName: string }>;
        };

        const game = await startGame.execute(body);
        return game.toJSON();
    });

    return { startGame, rollDice, getGameState };
}
