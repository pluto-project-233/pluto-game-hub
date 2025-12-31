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
import { RegisterDeveloperUseCase } from '../application/use-cases/RegisterDeveloper.js';
import { ListApplicationsUseCase } from '../application/use-cases/ListApplications.js';
import { ApproveApplicationUseCase } from '../application/use-cases/ApproveApplication.js';
import { RejectApplicationUseCase } from '../application/use-cases/RejectApplication.js';

// Validation schemas
const SetDisplayNameSchema = z.object({
    displayName: z.string().min(3).max(20),
});

const CheckDisplayNameSchema = z.object({
    displayName: z.string().min(3).max(20),
});

const DeveloperApplicationSchema = z.object({
    companyName: z.string().min(3).max(100),
    website: z.string().url().optional(),
    description: z.string().min(10).max(500),
    gamesPlanned: z.string().min(10).max(500),
});

const ApproveApplicationSchema = z.object({
    reviewNotes: z.string().optional(),
});

const RejectApplicationSchema = z.object({
    reviewNotes: z.string().min(1, 'Review notes are required for rejection'),
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
    const registerDeveloper = new RegisterDeveloperUseCase(prisma);
    const listApplications = new ListApplicationsUseCase(prisma);
    const approveApplication = new ApproveApplicationUseCase(prisma);
    const rejectApplication = new RejectApplicationUseCase(prisma);

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

        // Get full user data including developer fields
        const fullUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: {
                id: true,
                uniqueDisplayName: true,
                balance: true,
                lockedBalance: true,
                role: true,
                developerId: true,
                developerBalance: true,
                developerStatus: true,
                createdAt: true,
            },
        });

        if (!fullUser) {
            return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'User not found' } });
        }

        return {
            id: fullUser.id,
            displayName: fullUser.uniqueDisplayName,
            balance: fullUser.balance.toString(),
            lockedBalance: fullUser.lockedBalance.toString(),
            role: fullUser.role,
            developerId: fullUser.developerId,
            developerBalance: fullUser.developerBalance.toString(),
            developerStatus: fullUser.developerStatus,
            createdAt: fullUser.createdAt.toISOString(),
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

    // ============================================
    // Developer Routes
    // ============================================

    // Register as developer
    app.post('/developer/register', async (request, reply) => {
        const user = await getAuthenticatedUser(request.headers.authorization);
        if (!user) {
            return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'Invalid token' } });
        }

        const parsed = DeveloperApplicationSchema.safeParse(request.body);
        if (!parsed.success) {
            return reply.status(400).send({
                error: { code: 'VALIDATION_ERROR', message: 'Invalid request', details: parsed.error.flatten() }
            });
        }

        try {
            // Get user email from Firebase token
            const decoded = await verifyToken.execute({ token: request.headers.authorization!.slice(7) });

            const application = await registerDeveloper.execute({
                userId: user.id,
                email: decoded.email || '',
                companyName: parsed.data.companyName,
                website: parsed.data.website,
                description: parsed.data.description,
                gamesPlanned: parsed.data.gamesPlanned,
            });

            return {
                application,
                message: 'Application submitted successfully. You will be notified once reviewed.',
            };
        } catch (error: any) {
            if (error.message.startsWith('ALREADY_REGISTERED')) {
                return reply.status(409).send({
                    error: { code: 'ALREADY_REGISTERED', message: error.message.split(': ')[1] }
                });
            }
            throw error;
        }
    });

    // ============================================
    // Admin Routes
    // ============================================

    // Helper to check if user is admin
    async function requireAdmin(authHeader: string | undefined) {
        const user = await getAuthenticatedUser(authHeader);
        if (!user) {
            return null;
        }

        const fullUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { role: true },
        });

        if (fullUser?.role !== 'ADMIN') {
            return null;
        }

        return user;
    }

    // List developer applications (admin only)
    app.get('/admin/applications', async (request, reply) => {
        const user = await requireAdmin(request.headers.authorization);
        if (!user) {
            return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Admin access required' } });
        }

        const query = request.query as { status?: string; limit?: string; offset?: string };

        const result = await listApplications.execute({
            status: query.status as any,
            limit: query.limit ? parseInt(query.limit) : undefined,
            offset: query.offset ? parseInt(query.offset) : undefined,
        });

        return result;
    });

    // Approve developer application (admin only)
    app.put('/admin/applications/:id/approve', async (request, reply) => {
        const user = await requireAdmin(request.headers.authorization);
        if (!user) {
            return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Admin access required' } });
        }

        const { id } = request.params as { id: string };
        const parsed = ApproveApplicationSchema.safeParse(request.body);
        if (!parsed.success) {
            return reply.status(400).send({
                error: { code: 'VALIDATION_ERROR', message: 'Invalid request', details: parsed.error.flatten() }
            });
        }

        try {
            const result = await approveApplication.execute({
                applicationId: id,
                adminUserId: user.id,
                reviewNotes: parsed.data.reviewNotes,
            });

            return result;
        } catch (error: any) {
            if (error.message.startsWith('NOT_FOUND')) {
                return reply.status(404).send({
                    error: { code: 'NOT_FOUND', message: 'Application not found' }
                });
            }
            if (error.message.startsWith('CONFLICT')) {
                return reply.status(409).send({
                    error: { code: 'CONFLICT', message: error.message.split(': ')[1] }
                });
            }
            throw error;
        }
    });

    // Reject developer application (admin only)
    app.put('/admin/applications/:id/reject', async (request, reply) => {
        const user = await requireAdmin(request.headers.authorization);
        if (!user) {
            return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Admin access required' } });
        }

        const { id } = request.params as { id: string };
        const parsed = RejectApplicationSchema.safeParse(request.body);
        if (!parsed.success) {
            return reply.status(400).send({
                error: { code: 'VALIDATION_ERROR', message: 'Invalid request', details: parsed.error.flatten() }
            });
        }

        try {
            const result = await rejectApplication.execute({
                applicationId: id,
                adminUserId: user.id,
                reviewNotes: parsed.data.reviewNotes,
            });

            return result;
        } catch (error: any) {
            if (error.message.startsWith('NOT_FOUND')) {
                return reply.status(404).send({
                    error: { code: 'NOT_FOUND', message: 'Application not found' }
                });
            }
            if (error.message.startsWith('CONFLICT')) {
                return reply.status(409).send({
                    error: { code: 'CONFLICT', message: error.message.split(': ')[1] }
                });
            }
            throw error;
        }
    });

    // Export auth provider for use in other services
    return { authProvider, verifyToken, getOrCreateUser };
}
