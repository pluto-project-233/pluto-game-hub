import crypto from 'node:crypto';

// ============================================
// HMAC Utilities
// ============================================

/**
 * Generate HMAC-SHA256 signature for a payload
 */
export function generateHmacSignature(payload: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Verify HMAC-SHA256 signature
 */
export function verifyHmacSignature(
    payload: string,
    signature: string,
    secret: string
): boolean {
    const expectedSignature = generateHmacSignature(payload, secret);
    // Use timing-safe comparison to prevent timing attacks
    try {
        return crypto.timingSafeEqual(
            Buffer.from(signature, 'hex'),
            Buffer.from(expectedSignature, 'hex')
        );
    } catch {
        return false;
    }
}

// ============================================
// Random Utilities
// ============================================

/**
 * Generate a cryptographically secure random string
 */
export function generateSecureToken(length = 32): string {
    return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate a random integer between min and max (inclusive)
 */
export function randomInt(min: number, max: number): number {
    return crypto.randomInt(min, max + 1);
}

// ============================================
// BigInt Utilities
// ============================================

/**
 * Calculate percentage of a BigInt value
 * @param amount The base amount
 * @param percentage The percentage (0-100)
 * @returns The percentage amount, rounded down
 */
export function calculatePercentage(amount: bigint, percentage: number): bigint {
    // Handle decimal percentages by scaling (e.g., 2.5% = 25 / 1000)
    // We multiply by 100 and floor the percentage to handle 2 decimal places of precision
    const scaledPercentage = BigInt(Math.floor(percentage * 100));
    return (amount * scaledPercentage) / 10000n;
}

/**
 * Distribute amount among winners equally
 * Handles remainder by giving extra to first winners
 */
export function distributeEvenly(amount: bigint, count: number): bigint[] {
    if (count === 0) return [];

    const base = amount / BigInt(count);
    const remainder = amount % BigInt(count);

    return Array.from({ length: count }, (_, i) =>
        i < Number(remainder) ? base + 1n : base
    );
}

// ============================================
// Date Utilities
// ============================================

/**
 * Add seconds to current date
 */
export function addSeconds(seconds: number): Date {
    return new Date(Date.now() + seconds * 1000);
}

/**
 * Check if a date has passed
 */
export function isExpired(date: Date): boolean {
    return date.getTime() < Date.now();
}

// ============================================
// Display Name Utilities
// ============================================

const DISPLAY_NAME_REGEX = /^[a-zA-Z0-9_-]{3,20}$/;

/**
 * Validate display name format
 */
export function isValidDisplayName(name: string): boolean {
    return DISPLAY_NAME_REGEX.test(name);
}

/**
 * Normalize display name (lowercase for uniqueness check)
 */
export function normalizeDisplayName(name: string): string {
    return name.toLowerCase();
}
