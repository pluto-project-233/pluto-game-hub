import type { IUserRepository } from '../../domain/repositories/IUserRepository.js';
import type { ISessionRepository } from '../../domain/repositories/ISessionRepository.js';
import type { ILedgerRepository } from '../../domain/repositories/ILedgerRepository.js';
import type { SessionTokenPayload } from '@pluto/shared';
import {
    SessionNotFoundError,
    ValidationError,
} from '@pluto/shared';

export interface CancelContractInput {
    sessionToken: string;
    reason?: string;
}

export interface CancelContractResult {
    sessionId: string;
    refundedPlayers: Array<{
        id: string;
        displayName: string;
        amountRefunded: bigint;
    }>;
}

/**
 * Cancel a contract - return locked funds to all players
 * This is called when a game fails to start or needs to be aborted
 */
export class CancelContractUseCase {
    constructor(
        private userRepository: IUserRepository,
        private sessionRepository: ISessionRepository,
        private ledgerRepository: ILedgerRepository,
        private verifySessionToken: (token: string) => SessionTokenPayload | null
    ) { }

    async execute(input: CancelContractInput): Promise<CancelContractResult> {
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

        // 3. Check session can be cancelled
        if (!session.canCancel()) {
            throw new ValidationError(`Cannot cancel session in ${session.status} status`);
        }

        // 4. Refund all players
        const users = await this.userRepository.findByIds(
            session.players.map((p: any) => p.userId)
        );
        const ledgerEntries = [];
        const refundedPlayers = [];

        for (const user of users) {
            const player = session.getPlayer(user.id)!;

            // Unlock funds
            user.unlockFunds(player.amountLocked);

            await this.userRepository.updateBalance(
                user.id,
                user.balance,
                user.lockedBalance
            );

            ledgerEntries.push({
                userId: user.id,
                type: 'UNLOCK' as const,
                amount: player.amountLocked,
                balanceAfter: user.balance,
                description: input.reason ?? 'Game cancelled - funds refunded',
                sessionId: session.id,
            });

            refundedPlayers.push({
                id: user.id,
                displayName: user.displayName,
                amountRefunded: player.amountLocked,
            });
        }

        // 5. Record ledger entries
        await this.ledgerRepository.appendMany(ledgerEntries);

        // 6. Update session status
        await this.sessionRepository.updateStatus(session.id, 'CANCELLED');

        return {
            sessionId: session.id,
            refundedPlayers,
        };
    }
}
