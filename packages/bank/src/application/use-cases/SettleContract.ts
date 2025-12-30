import type { IUserRepository } from '../domain/repositories/IUserRepository.js';
import type { IContractRepository } from '../domain/repositories/IContractRepository.js';
import type { ISessionRepository } from '../domain/repositories/ISessionRepository.js';
import type { ILedgerRepository } from '../domain/repositories/ILedgerRepository.js';
import type { SettleContractResult, PlayerResult, SessionTokenPayload } from '@pluto/shared';
import {
    SessionNotFoundError,
    SessionAlreadySettledError,
    SessionExpiredError,
    ValidationError,
    distributeEvenly,
} from '@pluto/shared';

export interface SettleContractInput {
    sessionToken: string;
    results: PlayerResult[];
}

/**
 * Settle a contract - distribute rewards to winners
 * This is called by game backend when a match ends
 */
export class SettleContractUseCase {
    constructor(
        private userRepository: IUserRepository,
        private contractRepository: IContractRepository,
        private sessionRepository: ISessionRepository,
        private ledgerRepository: ILedgerRepository,
        private verifySessionToken: (token: string) => SessionTokenPayload | null
    ) { }

    async execute(input: SettleContractInput): Promise<SettleContractResult> {
        // 1. Verify and decode session token
        const payload = this.verifySessionToken(input.sessionToken);
        if (!payload) {
            throw new ValidationError('Invalid or expired session token');
        }

        // 2. Find session
        const session = await this.sessionRepository.findById(payload.sessionId);
        if (!session) {
            throw new SessionNotFoundError(payload.sessionId);
        }

        // 3. Check session status
        if (session.status === 'SETTLED') {
            throw new SessionAlreadySettledError(session.id);
        }
        if (session.status === 'CANCELLED' || session.status === 'EXPIRED') {
            throw new ValidationError(`Session is ${session.status.toLowerCase()}`);
        }
        if (session.isExpired()) {
            throw new SessionExpiredError(session.id);
        }

        // 4. Validate results
        const sessionPlayerIds = session.players.map(p => p.userId);
        const resultPlayerIds = input.results.map(r => r.playerId);

        // Check all session players are accounted for
        for (const playerId of sessionPlayerIds) {
            if (!resultPlayerIds.includes(playerId)) {
                throw new ValidationError(`Missing result for player ${playerId}`);
            }
        }

        // 5. Get contract for fee calculation
        const contract = await this.contractRepository.findContractById(session.contractId);
        if (!contract) {
            throw new ValidationError('Contract not found');
        }

        // 6. Calculate distributions
        const platformFee = contract.calculatePlatformFee(session.totalPot);
        const prizePool = contract.calculatePrizePool(session.totalPot);

        const winners = input.results.filter(r => r.isWinner);
        if (winners.length === 0) {
            throw new ValidationError('At least one winner required');
        }

        // Distribute prize pool among winners
        const winAmounts = distributeEvenly(prizePool, winners.length);
        const winnerDistribution = winners.map((w, i) => ({
            playerId: w.playerId,
            amount: w.winAmount ?? winAmounts[i],
        }));

        // 7. Update user balances and create ledger entries
        const users = await this.userRepository.findByIds(sessionPlayerIds);
        const ledgerEntries = [];
        const settledWinners = [];

        for (const user of users) {
            const player = session.getPlayer(user.id)!;
            const winnerInfo = winnerDistribution.find(w => w.playerId === user.id);

            // Everyone loses their locked amount first
            user.deductLockedFunds(player.amountLocked);

            ledgerEntries.push({
                userId: user.id,
                type: 'LOSE' as const,
                amount: player.amountLocked,
                balanceAfter: user.balance,
                description: 'Game entry fee deducted',
                sessionId: session.id,
            });

            // Winners get their share of prize pool
            if (winnerInfo) {
                user.addWinnings(winnerInfo.amount);

                ledgerEntries.push({
                    userId: user.id,
                    type: 'WIN' as const,
                    amount: winnerInfo.amount,
                    balanceAfter: user.balance,
                    description: 'Game winnings',
                    sessionId: session.id,
                });

                settledWinners.push({
                    id: user.id,
                    displayName: user.displayName,
                    amountWon: winnerInfo.amount,
                });
            }

            await this.userRepository.updateBalance(
                user.id,
                user.balance,
                user.lockedBalance
            );
        }

        // 8. Record ledger entries
        await this.ledgerRepository.appendMany(ledgerEntries);

        // 9. Update session status
        await this.sessionRepository.settle(
            session.id,
            input.results.map(r => ({
                playerId: r.playerId,
                isWinner: r.isWinner,
                winAmount: winnerDistribution.find(w => w.playerId === r.playerId)?.amount ?? 0n,
            }))
        );

        return {
            sessionId: session.id,
            winners: settledWinners,
            platformFeeCollected: platformFee,
        };
    }
}
