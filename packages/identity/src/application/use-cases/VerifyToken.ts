import type { FirebaseAuthProvider, DecodedToken } from '../../infrastructure/firebase/FirebaseAuthProvider.js';
import { InvalidTokenError } from '@pluto/shared';

export interface VerifyTokenInput {
    token: string;
}

/**
 * Verify a Firebase token
 */
export class VerifyTokenUseCase {
    constructor(private authProvider: FirebaseAuthProvider) { }

    async execute(input: VerifyTokenInput): Promise<DecodedToken> {
        const decoded = await this.authProvider.verifyToken(input.token);
        if (!decoded) {
            throw new InvalidTokenError();
        }
        return decoded;
    }
}
