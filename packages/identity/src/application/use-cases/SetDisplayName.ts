import type { IUserRepository } from '@pluto/bank';
import { DisplayNameTakenError, ValidationError, isValidDisplayName } from '@pluto/shared';

export interface SetDisplayNameInput {
    userId: string;
    displayName: string;
}

export interface SetDisplayNameResult {
    success: boolean;
    displayName: string;
}

/**
 * Set or change user's display name
 */
export class SetDisplayNameUseCase {
    constructor(private userRepository: IUserRepository) { }

    async execute(input: SetDisplayNameInput): Promise<SetDisplayNameResult> {
        // Validate format
        if (!isValidDisplayName(input.displayName)) {
            throw new ValidationError(
                'Display name must be 3-20 characters, alphanumeric with underscores and hyphens only'
            );
        }

        // Check availability
        const isAvailable = await this.userRepository.isDisplayNameAvailable(input.displayName);
        if (!isAvailable) {
            throw new DisplayNameTakenError(input.displayName);
        }

        // Update
        await this.userRepository.updateDisplayName(input.userId, input.displayName);

        return {
            success: true,
            displayName: input.displayName,
        };
    }
}
