import type { App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

export interface DecodedToken {
    uid: string;
    email?: string;
    name?: string;
}

/**
 * Firebase authentication provider
 */
export class FirebaseAuthProvider {
    constructor(private firebaseApp: App) { }

    /**
     * Verify a Firebase ID token
     */
    async verifyToken(token: string): Promise<DecodedToken | null> {
        try {
            const auth = getAuth(this.firebaseApp);
            const decoded = await auth.verifyIdToken(token);
            return {
                uid: decoded.uid,
                email: decoded.email,
                name: decoded.name,
            };
        } catch (error) {
            return null;
        }
    }

    /**
     * Get user info from Firebase
     */
    async getUser(uid: string) {
        try {
            const auth = getAuth(this.firebaseApp);
            const user = await auth.getUser(uid);
            return {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                photoUrl: user.photoURL,
            };
        } catch (error) {
            return null;
        }
    }
}
