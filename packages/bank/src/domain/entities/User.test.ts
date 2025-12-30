import { describe, it, expect } from 'vitest';
import { User } from './User.js';

describe('User Entity', () => {
    it('should initialize with correct balance', () => {
        const user = new User('id', 'uid', 'Name', 1000n, 0n, new Date());
        expect(user.balance).toBe(1000n);
        expect(user.lockedBalance).toBe(0n);
        expect(user.availableBalance).toBe(1000n);
    });

    it('should lock funds correctly', () => {
        const user = new User('id', 'uid', 'Name', 1000n, 0n, new Date());
        user.lockFunds(200n);
        expect(user.balance).toBe(1000n);
        expect(user.lockedBalance).toBe(200n);
        expect(user.availableBalance).toBe(800n);
    });

    it('should fail to lock insufficient funds', () => {
        const user = new User('id', 'uid', 'Name', 100n, 0n, new Date());
        expect(() => user.lockFunds(200n)).toThrow('Insufficient funds');
    });

    it('should unlock funds correctly', () => {
        const user = new User('id', 'uid', 'Name', 1000n, 500n, new Date());
        user.unlockFunds(200n);
        expect(user.lockedBalance).toBe(300n);
        expect(user.availableBalance).toBe(700n);
    });

    it('should deduct locked funds correctly', () => {
        const user = new User('id', 'uid', 'Name', 1000n, 500n, new Date());
        user.deductLockedFunds(200n);
        expect(user.balance).toBe(800n);
        expect(user.lockedBalance).toBe(300n);
    });
});
