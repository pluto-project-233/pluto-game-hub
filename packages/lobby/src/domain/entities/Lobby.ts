import type { LobbyStatus } from '@prisma/client';

/**
 * Lobby domain entity
 */
export class Lobby {
    constructor(
        public readonly id: string,
        public readonly contractId: string,
        public readonly contractName: string,
        public readonly gameName: string,
        public readonly entryFee: bigint,
        public readonly minPlayers: number,
        public readonly maxPlayers: number,
        private _status: LobbyStatus,
        public readonly createdAt: Date,
        private _players: LobbyPlayer[]
    ) { }

    get status(): LobbyStatus {
        return this._status;
    }

    get players(): LobbyPlayer[] {
        return [...this._players];
    }

    get currentPlayers(): number {
        return this._players.length;
    }

    get isFull(): boolean {
        return this._players.length >= this.maxPlayers;
    }

    get isReady(): boolean {
        return this._players.length >= this.minPlayers;
    }

    /**
     * Check if a user is already in this lobby
     */
    hasPlayer(userId: string): boolean {
        return this._players.some(p => p.userId === userId);
    }

    /**
     * Add a player to the lobby
     */
    addPlayer(player: LobbyPlayer): void {
        if (this.isFull) {
            throw new Error('Lobby is full');
        }
        if (this.hasPlayer(player.userId)) {
            throw new Error('Player already in lobby');
        }
        if (this._status !== 'WAITING') {
            throw new Error(`Cannot join lobby in ${this._status} status`);
        }
        this._players.push(player);
    }

    /**
     * Remove a player from the lobby
     */
    removePlayer(userId: string): LobbyPlayer | null {
        const index = this._players.findIndex(p => p.userId === userId);
        if (index === -1) return null;
        return this._players.splice(index, 1)[0];
    }

    /**
     * Mark lobby as starting
     */
    start(): void {
        if (!this.isReady) {
            throw new Error(`Not enough players: ${this.currentPlayers}/${this.minPlayers}`);
        }
        this._status = 'STARTING';
    }

    /**
     * Mark lobby as in game
     */
    setInGame(): void {
        this._status = 'IN_GAME';
    }

    /**
     * Close the lobby
     */
    close(): void {
        this._status = 'CLOSED';
    }

    toJSON() {
        return {
            id: this.id,
            contractId: this.contractId,
            contractName: this.contractName,
            gameName: this.gameName,
            entryFee: this.entryFee.toString(),
            status: this._status,
            currentPlayers: this.currentPlayers,
            minPlayers: this.minPlayers,
            maxPlayers: this.maxPlayers,
            players: this._players.map(p => p.toJSON()),
            createdAt: this.createdAt.toISOString(),
        };
    }
}

/**
 * Player in a lobby
 */
export class LobbyPlayer {
    constructor(
        public readonly id: string,
        public readonly lobbyId: string,
        public readonly userId: string,
        public readonly displayName: string,
        public readonly joinedAt: Date
    ) { }

    toJSON() {
        return {
            id: this.id,
            userId: this.userId,
            displayName: this.displayName,
            joinedAt: this.joinedAt.toISOString(),
        };
    }
}
