import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { Gateway } from '@pluto/gateway';
import { registerBankRoutes } from '@pluto/bank';

describe('Bank API Integration', () => {
    let app: FastifyInstance;
    const mockPrisma: any = {
        user: {
            findUnique: vi.fn(),
            findFirst: vi.fn(),
            update: vi.fn(),
        },
        ledgerEntry: {
            findMany: vi.fn(),
            count: vi.fn(),
        },
        $transaction: vi.fn((cb) => cb(mockPrisma)),
    };

    beforeEach(async () => {
        const gateway = new Gateway({ port: 0, host: 'localhost', corsOrigin: '*' });
        await gateway.initialize();
        app = gateway.getInstance();

        gateway.registerRoutes('/v1', (instance, cache) => {
            registerBankRoutes(instance, cache, {
                prisma: mockPrisma,
                verifyFirebaseToken: async (token) => token === 'valid' ? { uid: 'uid123' } : null,
                generateSessionToken: () => 'session-token',
                verifySessionToken: () => ({ sessionId: 's1' }),
                verifyHmacSignature: async () => true,
            });
        });
    });

    it('should return 401 for unauthorized balance request', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/v1/me/balance',
        });
        expect(response.statusCode).toBe(401);
    });

    it('should return balance for authorized user', async () => {
        mockPrisma.user.findUnique.mockResolvedValue({
            id: 'u1',
            firebaseUid: 'uid123',
            uniqueDisplayName: 'TestPlayer',
            balance: 1000n,
            lockedBalance: 200n,
            createdAt: new Date(),
        });

        const response = await app.inject({
            method: 'GET',
            url: '/v1/me/balance',
            headers: {
                authorization: 'Bearer valid',
            },
        });

        expect(response.statusCode).toBe(200);
        const data = JSON.parse(response.payload);
        expect(data.balance).toBe('1000');
        expect(data.availableBalance).toBe('800');
    });
});
