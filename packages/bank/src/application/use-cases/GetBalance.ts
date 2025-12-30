import type { IUserRepository } from '../domain/repositories/IUserRepository.js';
import type { UserBalance } from '@pluto/shared';
import { UserNotFoundError } from '@pluto/shared';

export interface GetBalanceInput {
    userId: string;
}

export interface GetBalanceOutput {
    balance: string;
    lockedBalance: string;
    availableBalance: string;
}

/**
 * Get user's current balance
 */
export class GetBalanceUseCase {
    constructor(private userRepository: IUserRepository) { }

    async execute(input: GetBalanceInput): Promise<GetBalanceOutput> {
        const user = await this.userRepository.findById(input.userId);

        if (!user) {
            throw new UserNotFoundError(input.userId);
        }

        return {
            balance: user.balance.toString(),
            lockedBalance: user.lockedBalance.toString(),
            availableBalance: user.availableBalance.toString(),
        };
    }
}
