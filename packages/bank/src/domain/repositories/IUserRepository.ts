import type { User } from '../entities/User.js';

/**
 * Repository interface for User operations
 */
export interface IUserRepository {
    /**
     * Find user by Pluto ID
     */
    findById(id: string): Promise<User | null>;

    /**
     * Find user by Firebase UID
     */
    findByFirebaseUid(uid: string): Promise<User | null>;

    /**
     * Find multiple users by their IDs
     */
    findByIds(ids: string[]): Promise<User[]>;

    /**
     * Find multiple users by Firebase UIDs
     */
    findByFirebaseUids(uids: string[]): Promise<User[]>;

    /**
     * Create a new user
     */
    create(data: {
        firebaseUid: string;
        displayName: string;
        balance?: bigint;
    }): Promise<User>;

    /**
     * Update user balance and locked balance atomically
     */
    updateBalance(
        id: string,
        balance: bigint,
        lockedBalance: bigint
    ): Promise<User>;

    /**
     * Check if display name is available
     */
    isDisplayNameAvailable(displayName: string): Promise<boolean>;

    /**
     * Update user's display name
     */
    updateDisplayName(id: string, displayName: string): Promise<User>;
}
