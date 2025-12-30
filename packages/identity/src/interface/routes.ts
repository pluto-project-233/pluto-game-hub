import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import type { App } from 'firebase-admin/app';
import type { LRUCache } from '@pluto/gateway';
import { z } from 'zod';
import { PrismaUserRepository } from '@pluto/bank';
import { FirebaseAuthProvider } from '../infrastructure/firebase/FirebaseAuthProvider.js';
import { VerifyTokenUseCase } from '../application/use-cases/VerifyToken.js';
import { GetOrCreateUserUseCase } from '../application/use-cases/GetOrCreateUser.js';
import { SetDisplayNameUseCase } from '../application/use-cases/SetDisplayName.js';
import { CheckDisplayNameUseCase } from '../application/use-cases/CheckDisplayName.js';

// Validation schemas
const SetDisplayNameSchema = z.object({
    displayName: z.string().min(3).max(20),
});

const CheckDisplayNameSchema = z.object({
    displayName: z.string().min(3).max(20),
});

export interface IdentityRoutesConfig {
    prisma: PrismaClient;
    firebaseApp: App;
}

export function registerIdentityRoutes(
    app: FastifyInstance,
    cache: LRUCache<string, unknown>,
    config: IdentityRoutesConfig
) {
    const { prisma, firebaseApp } = config;

    // Initialize
    const userRepo = new PrismaUserRepository(prisma);
    const authProvider = new FirebaseAuthProvider(firebaseApp);

    // Initialize use cases
    const verifyToken = new VerifyTokenUseCase(authProvider);
    const getOrCreateUser = new GetOrCreateUserUseCase(userRepo);
    const setDisplayName = new SetDisplayNameUseCase(userRepo);
    const checkDisplayName = new CheckDisplayNameUseCase(userRepo);

    // Helper to get authenticated user
    async function getAuthenticatedUser(authHeader: string | undefined) {
        if (!authHeader?.startsWith('Bearer ')) {
            return null;
        }

        try {
            const decoded = await verifyToken.execute({ token: authHeader.slice(7) });
            const user = await getOrCreateUser.execute({
                firebaseUid: decoded.uid,
                suggestedDisplayName: decoded.name,
            });
            return user;
        } catch {
            return null;
        }
    }

    // ============================================
    // Identity Routes
    // ============================================

    // Get current user profile
    app.get('/me/profile', async (request, reply) => {
        const user = await getAuthenticatedUser(request.headers.authorization);
        if (!user) {
            return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'Invalid token' } });
        }

        return {
            id: user.id,
            displayName: user.uniqueDisplayName,
            balance: user.balance.toString(),
            lockedBalance: user.lockedBalance.toString(),
            createdAt: user.createdAt.toISOString(),
        };
    });

    // Set display name
    app.put('/me/display-name', async (request, reply) => {
        const user = await getAuthenticatedUser(request.headers.authorization);
        if (!user) {
            return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'Invalid token' } });
        }

        const parsed = SetDisplayNameSchema.safeParse(request.body);
        if (!parsed.success) {
            return reply.status(400).send({
                error: { code: 'VALIDATION_ERROR', message: 'Invalid request', details: parsed.error.flatten() }
            });
        }

        // Invalidate cache
        cache.delete(`user:${user.id}`);

        const result = await setDisplayName.execute({
            userId: user.id,
            displayName: parsed.data.displayName,
        });

        return result;
    });

    // Check display name availability
    app.get('/display-name/check', async (request, reply) => {
        const query = request.query as { name?: string };

        if (!query.name) {
            return reply.status(400).send({
                error: { code: 'VALIDATION_ERROR', message: 'Display name required' }
            });
        }

        const result = await checkDisplayName.execute({ displayName: query.name });
        return result;
    });

    // Export auth provider for use in other services
    return { authProvider, verifyToken, getOrCreateUser };
}
