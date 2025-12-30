import type { LobbyEvent } from '@pluto/shared';
import type { FastifyReply } from 'fastify';

interface SSEClient {
    id: string;
    reply: FastifyReply;
}

/**
 * SSE Broadcaster for lobby events
 * Manages connections and broadcasts events to all connected clients
 */
export class LobbyBroadcaster {
    private lobbies: Map<string, Set<SSEClient>> = new Map();

    /**
     * Add a client to a lobby's broadcast list
     */
    addClient(lobbyId: string, clientId: string, reply: FastifyReply): void {
        if (!this.lobbies.has(lobbyId)) {
            this.lobbies.set(lobbyId, new Set());
        }

        const client: SSEClient = { id: clientId, reply };
        this.lobbies.get(lobbyId)!.add(client);

        // Handle client disconnect
        reply.raw.on('close', () => {
            this.removeClient(lobbyId, clientId);
        });
    }

    /**
     * Remove a client from a lobby's broadcast list
     */
    removeClient(lobbyId: string, clientId: string): void {
        const clients = this.lobbies.get(lobbyId);
        if (!clients) return;

        for (const client of clients) {
            if (client.id === clientId) {
                clients.delete(client);
                break;
            }
        }

        // Clean up empty lobbies
        if (clients.size === 0) {
            this.lobbies.delete(lobbyId);
        }
    }

    /**
     * Broadcast an event to all clients in a lobby
     */
    broadcast(lobbyId: string, event: LobbyEvent): void {
        const clients = this.lobbies.get(lobbyId);
        if (!clients) return;

        const data = `data: ${JSON.stringify(event)}\n\n`;

        for (const client of clients) {
            try {
                client.reply.raw.write(data);
            } catch (error) {
                // Client disconnected, remove them
                clients.delete(client);
            }
        }
    }

    /**
     * Send a heartbeat to keep connections alive
     */
    sendHeartbeat(lobbyId: string): void {
        const clients = this.lobbies.get(lobbyId);
        if (!clients) return;

        const data = `: heartbeat\n\n`;

        for (const client of clients) {
            try {
                client.reply.raw.write(data);
            } catch (error) {
                clients.delete(client);
            }
        }
    }

    /**
     * Get number of connected clients for a lobby
     */
    getClientCount(lobbyId: string): number {
        return this.lobbies.get(lobbyId)?.size ?? 0;
    }

    /**
     * Start heartbeat interval for all lobbies
     */
    startHeartbeat(intervalMs = 30000): NodeJS.Timeout {
        return setInterval(() => {
            for (const lobbyId of this.lobbies.keys()) {
                this.sendHeartbeat(lobbyId);
            }
        }, intervalMs);
    }
}
