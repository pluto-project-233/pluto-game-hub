import { describe, it, expect } from 'vitest';
import {
    calculatePercentage,
    distributeEvenly,
    isValidDisplayName,
    generateHmacSignature
} from './index.js';

describe('Shared Utils', () => {
    describe('calculatePercentage', () => {
        it('should calculate percentage correctly', () => {
            expect(calculatePercentage(1000n, 5)).toBe(50n);
            expect(calculatePercentage(100n, 10)).toBe(10n);
            expect(calculatePercentage(2500n, 2.5)).toBe(62n); // Fixed-point math check
        });
    });

    describe('distributeEvenly', () => {
        it('should distribute amount evenly among winners', () => {
            expect(distributeEvenly(1000n, 2)).toEqual([500n, 500n]);
            expect(distributeEvenly(1000n, 3)).toEqual([334n, 333n, 333n]); // Remainder goes to first player per implementation
        });
    });

    describe('isValidDisplayName', () => {
        it('should validate display names correctly', () => {
            expect(isValidDisplayName('Player_1')).toBe(true);
            expect(isValidDisplayName('cool-player')).toBe(true);
            expect(isValidDisplayName('abc')).toBe(true);
            expect(isValidDisplayName('ab')).toBe(false); // Too short
            expect(isValidDisplayName('this-is-way-too-long-for-a-display-name')).toBe(false); // Too long
            expect(isValidDisplayName('Player!1')).toBe(false); // Invalid char
        });
    });

    describe('generateHmacSignature', () => {
        it('should generate consistent signatures', () => {
            const payload = JSON.stringify({ test: true });
            const secret = 'test-secret';
            const sig1 = generateHmacSignature(payload, secret);
            const sig2 = generateHmacSignature(payload, secret);
            expect(sig1).toBe(sig2);
            expect(sig1).toHaveLength(64); // Hex SHA256
        });
    });
});
