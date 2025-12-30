import { PrismaClient } from '@prisma/client';
import { initializeApp, cert } from 'firebase-admin/app';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import crypto from 'node:crypto';
import jwt from '@fastify/jwt';
import { Gateway } from '@pluto/gateway';
import { registerBankRoutes, PrismaUserRepository, PrismaContractRepository } from '@pluto/bank';
import { registerLobbyRoutes } from '@pluto/lobby';
import { registerIdentityRoutes } from '@pluto/identity';
import { registerDiceRoyaleRoutes } from '@pluto/dice-royale';

// ============================================
// Configuration
// ============================================

const config = {
    port: parseInt(process.env.PORT || '3000', 10),
    host: process.env.HOST || '0.0.0.0',
    nodeEnv: process.env.NODE_ENV || 'development',
    databaseUrl: process.env.DATABASE_URL!,
    firebaseServiceAccount: process.env.FIREBASE_SERVICE_ACCOUNT,
    firebaseServiceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './devops/firebase.json',
    jwtSecret: process.env.JWT_SECRET || 'development-jwt-secret',
    hmacSecret: process.env.HMAC_SECRET || 'development-hmac-secret',
};

// ============================================
// Initialize Dependencies
// ============================================

// Prisma Client
const prisma = new PrismaClient({
    log: config.nodeEnv === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Firebase Admin
let serviceAccount;
if (config.firebaseServiceAccount) {
    try {
        serviceAccount = JSON.parse(config.firebaseServiceAccount);
    } catch (error) {
        console.error('❌ Failed to parse FIREBASE_SERVICE_ACCOUNT env var as JSON');
        throw error;
    }
} else {
    const serviceAccountPath = resolve(process.cwd(), config.firebaseServiceAccountPath);
    serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf-8'));
}

const firebaseApp = initializeApp({
    credential: cert(serviceAccount),
});

// Repositories (for cross-service use)
const userRepo = new PrismaUserRepository(prisma);
const contractRepo = new PrismaContractRepository(prisma);

// ============================================
// Helper Functions
// ============================================

// JWT Token generation/verification for session tokens
function generateSessionToken(payload: object): string {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(JSON.stringify({ ...payload, iat: Date.now() })).toString('base64url');
    const signature = crypto
        .createHmac('sha256', config.jwtSecret)
        .update(`${header}.${body}`)
        .digest('base64url');
    return `${header}.${body}.${signature}`;
}

function verifySessionToken(token: string): any {
    try {
        const [header, body, signature] = token.split('.');
        const expectedSig = crypto
            .createHmac('sha256', config.jwtSecret)
            .update(`${header}.${body}`)
            .digest('base64url');

        if (signature !== expectedSig) return null;

        return JSON.parse(Buffer.from(body, 'base64url').toString('utf-8'));
    } catch {
        return null;
    }
}

// HMAC verification for game backend requests
async function verifyHmacSignature(body: string, signature: string, gameId: string): Promise<boolean> {
    const game = await contractRepo.findGameById(gameId);
    if (!game) return false;

    const expectedSig = crypto
        .createHmac('sha256', game.clientSecretHash)
        .update(body)
        .digest('hex');

    try {
        return crypto.timingSafeEqual(
            Buffer.from(signature, 'hex'),
            Buffer.from(expectedSig, 'hex')
        );
    } catch {
        return false;
    }
}

// ============================================
// Main Application
// ============================================

async function main() {
    console.log('🚀 Starting Pluto Hub...');

    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connected');

    // Create Gateway
    const gateway = new Gateway({
        port: config.port,
        host: config.host,
        corsOrigin: ['http://localhost:3000', 'http://localhost:5173'],
    });

    await gateway.initialize();
    const app = gateway.getInstance();
    const cache = gateway.getCache();

    // Register Identity routes (needed first for auth helpers)
    const { authProvider, getOrCreateUser } = registerIdentityRoutes(app, cache, {
        prisma,
        firebaseApp,
    });

    // Helper to verify Firebase tokens
    const verifyFirebaseToken = async (token: string) => {
        try {
            return await authProvider.verifyToken(token);
        } catch {
            return null;
        }
    };

    // Helper to get user by Firebase UID
    const getUserByFirebaseUid = async (uid: string) => {
        const user = await userRepo.findByFirebaseUid(uid);
        if (!user) return null;
        return {
            id: user.id,
            displayName: user.displayName,
            balance: user.balance,
        };
    };

    // Helper to get contract info
    const getContractInfo = async (contractId: string) => {
        const contract = await contractRepo.findContractById(contractId);
        if (!contract) return null;
        return {
            entryFee: contract.entryFee,
            minPlayers: contract.minPlayers,
            maxPlayers: contract.maxPlayers,
        };
    };

    // Register all service routes under /v1 prefix
    gateway.registerRoutes('/v1', (instance: any, cache: any) => {
        // Bank routes
        registerBankRoutes(instance, cache, {
            prisma,
            generateSessionToken,
            verifySessionToken,
            verifyFirebaseToken,
            verifyHmacSignature,
        });

        // Lobby routes
        const { broadcaster } = registerLobbyRoutes(instance, cache, {
            prisma,
            verifyFirebaseToken,
            getUserByFirebaseUid,
            getContractInfo,
        });

        // DiceRoyale routes
        registerDiceRoyaleRoutes(instance, cache, {
            prisma,
            verifyFirebaseToken,
            getUserByFirebaseUid,
            settleGame: async (sessionId: string, winnerUserIds: string[]) => {
                // This would call the settle contract endpoint internally
                console.log(`Settling game session ${sessionId} with winners: ${winnerUserIds.join(', ')}`);
                // In production, this would make an internal call to /v1/contracts/settle
            },
        });
    });

    // Start server
    await gateway.start();

    // Graceful shutdown
    const shutdown = async () => {
        console.log('\n📴 Shutting down...');
        await gateway.stop();
        await prisma.$disconnect();
        process.exit(0);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
}

// Run
main().catch(err => {
    console.error('❌ Failed to start:', err);
    process.exit(1);
});
