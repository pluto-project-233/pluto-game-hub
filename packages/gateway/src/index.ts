import Fastify, { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import { PlutoError } from '@pluto/shared';
import { LRUCache } from './cache/lru.js';

export interface GatewayConfig {
    port: number;
    host: string;
    corsOrigin: string | string[];
}

export class Gateway {
    private app: FastifyInstance;
    private cache: LRUCache<string, unknown>;

    constructor(private config: GatewayConfig) {
        this.app = Fastify({
            logger: {
                level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
            },
        });
        this.cache = new LRUCache(1000); // 1000 item cache
    }

    async initialize(): Promise<void> {
        // Register CORS
        await this.app.register(cors, {
            origin: this.config.corsOrigin,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'X-Pluto-Signature', 'X-Game-Id'],
            credentials: true,
        });

        // Global error handler
        this.app.setErrorHandler((error, request, reply) => {
            if (error instanceof PlutoError) {
                return reply.status(error.statusCode).send(error.toJSON());
            }

            // Log unexpected errors
            request.log.error(error);

            // Don't expose internal errors in production
            const message = process.env.NODE_ENV === 'production'
                ? 'Internal server error'
                : error.message;

            return reply.status(500).send({
                error: {
                    code: 'INTERNAL_ERROR',
                    message,
                },
            });
        });

        // Health check endpoint
        this.app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

        // API version prefix
        this.app.get('/v1', async () => ({
            name: 'Pluto Hub API',
            version: '1.0.0',
        }));
    }

    /**
     * Register service routes
     */
    registerRoutes(
        prefix: string,
        routes: (app: FastifyInstance, cache: LRUCache<string, unknown>) => void
    ): void {
        this.app.register(
            async (instance) => {
                routes(instance, this.cache);
            },
            { prefix }
        );
    }

    /**
     * Get the Fastify instance for advanced configuration
     */
    getInstance(): FastifyInstance {
        return this.app;
    }

    /**
     * Get cache instance
     */
    getCache(): LRUCache<string, unknown> {
        return this.cache;
    }

    /**
     * Start the server
     */
    async start(): Promise<void> {
        try {
            await this.app.listen({
                port: this.config.port,
                host: this.config.host
            });
            console.log(`🚀 Gateway running at http://${this.config.host}:${this.config.port}`);
        } catch (err) {
            this.app.log.error(err);
            process.exit(1);
        }
    }

    /**
     * Stop the server
     */
    async stop(): Promise<void> {
        await this.app.close();
    }
}

export { LRUCache } from './cache/lru.js';
