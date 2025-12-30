import type { IUserRepository } from '../../domain/repositories/IUserRepository.js';
import type { IContractRepository } from '../../domain/repositories/IContractRepository.js';
import type { ISessionRepository } from '../../domain/repositories/ISessionRepository.js';
import type { ILedgerRepository } from '../../domain/repositories/ILedgerRepository.js';
import type { ExecuteContractResult } from '@pluto/shared';
import {
    ContractNotFoundError,
    InsufficientFundsError,
    ValidationError,
    GameNotActiveError,
    addSeconds,
} from '@pluto/shared';

export interface ExecuteContractInput {
    contractId: string;
    playerFirebaseUids: string[];
}

/**
 * Execute a contract - lock funds for all players
 * This is called by game backend when a match starts
 */
export class ExecuteContractUseCase {
    constructor(
        private userRepository: IUserRepository,
        private contractRepository: IContractRepository,
        private sessionRepository: ISessionRepository,
        private ledgerRepository: ILedgerRepository,
        private generateSessionToken: (payload: {
            sessionId: string;
            contractId: string;
            playerIds: string[];
            totalPot: string;
            expiresAt: string;
        }) => string
    ) { }

    async execute(input: ExecuteContractInput): Promise<ExecuteContractResult> {
        // 1. Validate contract exists and is active
        const contract = await this.contractRepository.findContractById(input.contractId);
        if (!contract) {
            throw new ContractNotFoundError(input.contractId);
        }
        if (!contract.isActive) {
            throw new GameNotActiveError();
        }

        // 2. Validate player count
        const playerCount = input.playerFirebaseUids.length;
        if (!contract.isValidPlayerCount(playerCount)) {
            throw new ValidationError(
                `Invalid player count: ${playerCount}. Contract requires ${contract.minPlayers}-${contract.maxPlayers} players`
            );
        }

        // 3. Find all users
        const users = await this.userRepository.findByFirebaseUids(input.playerFirebaseUids);
        if (users.length !== playerCount) {
            const foundUids = users.map((u: any) => u.firebaseUid);
            const missingUids = input.playerFirebaseUids.filter(uid => !foundUids.includes(uid));
            throw new ValidationError(`Users not found: ${missingUids.join(', ')}`);
        }

        // 4. Check all users have sufficient funds
        const entryFee = contract.entryFee;
        for (const user of users) {
            if (!user.canAfford(entryFee)) {
                throw new InsufficientFundsError(entryFee, user.availableBalance);
            }
        }

        // 5. Calculate totals
        const totalPot = contract.calculateTotalPot(playerCount);
        const expiresAt = addSeconds(contract.ttlSeconds);

        // 6. Create session with players
        const session = await this.sessionRepository.create({
            contractId: contract.id,
            totalPot,
            expiresAt,
            players: users.map((user: any) => ({
                userId: user.id,
                displayName: user.displayName,
                amountLocked: entryFee,
            })),
        });

        // 7. Lock funds for each user and create ledger entries
        const ledgerEntries = [];
        for (const user of users) {
            user.lockFunds(entryFee);
            await this.userRepository.updateBalance(
                user.id,
                user.balance,
                user.lockedBalance
            );

            ledgerEntries.push({
                userId: user.id,
                type: 'LOCK' as const,
                amount: entryFee,
                balanceAfter: user.balance,
                description: `Locked for ${contract.gameName}: ${contract.name}`,
                sessionId: session.id,
            });
        }
        await this.ledgerRepository.appendMany(ledgerEntries);

        // 8. Generate session token
        const sessionToken = this.generateSessionToken({
            sessionId: session.id,
            contractId: contract.id,
            playerIds: users.map((u: any) => u.id),
            totalPot: totalPot.toString(),
            expiresAt: expiresAt.toISOString(),
        });

        return {
            sessionId: session.id,
            sessionToken,
            players: session.players.map((p: any) => ({
                id: p.userId,
                displayName: p.displayName,
                amountLocked: p.amountLocked,
            })),
            totalPot,
            expiresAt,
        };
    }
}
