/**
 * Contract domain entity
 * Represents economic rules for a game
 */
export class Contract {
    constructor(
        public readonly id: string,
        public readonly gameId: string,
        public readonly gameName: string,
        public readonly name: string,
        public readonly entryFee: bigint,
        public readonly platformFee: number, // Percentage 0-100
        public readonly minPlayers: number,
        public readonly maxPlayers: number,
        public readonly ttlSeconds: number,
        public readonly isActive: boolean,
        public readonly createdAt: Date
    ) { }

    /**
     * Calculate total pot for a number of players
     */
    calculateTotalPot(playerCount: number): bigint {
        return this.entryFee * BigInt(playerCount);
    }

    /**
     * Calculate platform fee amount from pot
     */
    calculatePlatformFee(pot: bigint): bigint {
        return (pot * BigInt(this.platformFee)) / 100n;
    }

    /**
     * Calculate prize pool (pot minus platform fee)
     */
    calculatePrizePool(pot: bigint): bigint {
        return pot - this.calculatePlatformFee(pot);
    }

    /**
     * Check if player count is valid for this contract
     */
    isValidPlayerCount(count: number): boolean {
        return count >= this.minPlayers && count <= this.maxPlayers;
    }

    toJSON() {
        return {
            id: this.id,
            gameId: this.gameId,
            gameName: this.gameName,
            name: this.name,
            entryFee: this.entryFee.toString(),
            platformFee: this.platformFee,
            minPlayers: this.minPlayers,
            maxPlayers: this.maxPlayers,
            ttlSeconds: this.ttlSeconds,
            isActive: this.isActive,
            createdAt: this.createdAt.toISOString(),
        };
    }
}

/**
 * Game domain entity
 * Represents a registered game
 */
export class Game {
    constructor(
        public readonly id: string,
        public readonly name: string,
        public readonly description: string | null,
        public readonly clientSecretHash: string,
        public readonly callbackUrl: string | null,
        public readonly isActive: boolean,
        public readonly createdAt: Date
    ) { }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            description: this.description,
            callbackUrl: this.callbackUrl,
            isActive: this.isActive,
            createdAt: this.createdAt.toISOString(),
        };
    }
}
