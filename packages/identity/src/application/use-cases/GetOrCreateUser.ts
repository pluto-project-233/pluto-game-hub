import type { IUserRepository } from '@pluto/bank';
import type { UserProfile } from '@pluto/shared';
import { generateSecureToken } from '@pluto/shared';

export interface GetOrCreateUserInput {
    firebaseUid: string;
    suggestedDisplayName?: string;
}

/**
 * Get existing user or create a new one
 */
export class GetOrCreateUserUseCase {
    constructor(private userRepository: IUserRepository) { }

    async execute(input: GetOrCreateUserInput): Promise<UserProfile> {
        // Try to find existing user
        let user = await this.userRepository.findByFirebaseUid(input.firebaseUid);

        if (!user) {
            // Generate unique display name
            let displayName = input.suggestedDisplayName || `Player_${generateSecureToken(4)}`;

            // Ensure uniqueness
            while (!(await this.userRepository.isDisplayNameAvailable(displayName))) {
                displayName = `Player_${generateSecureToken(4)}`;
            }

            user = await this.userRepository.create({
                firebaseUid: input.firebaseUid,
                displayName,
            });
        }

        return {
            id: user.id,
            firebaseUid: user.firebaseUid,
            uniqueDisplayName: user.displayName,
            balance: user.balance,
            lockedBalance: user.lockedBalance,
            createdAt: user.createdAt,
        };
    }
}
