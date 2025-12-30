import type { IUserRepository } from '@pluto/bank';

export interface CheckDisplayNameInput {
    displayName: string;
}

export interface CheckDisplayNameResult {
    available: boolean;
    displayName: string;
}

/**
 * Check if a display name is available
 */
export class CheckDisplayNameUseCase {
    constructor(private userRepository: IUserRepository) { }

    async execute(input: CheckDisplayNameInput): Promise<CheckDisplayNameResult> {
        const available = await this.userRepository.isDisplayNameAvailable(input.displayName);
        return {
            available,
            displayName: input.displayName,
        };
    }
}
