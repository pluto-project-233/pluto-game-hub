/**
 * Simple LRU (Least Recently Used) Cache implementation
 * Used by Gateway for response caching
 */
export class LRUCache<K, V> {
    private cache: Map<K, { value: V; expiresAt: number }>;
    private readonly maxSize: number;
    private readonly defaultTtlMs: number;

    constructor(maxSize = 1000, defaultTtlMs = 60000) {
        this.cache = new Map();
        this.maxSize = maxSize;
        this.defaultTtlMs = defaultTtlMs;
    }

    /**
     * Get a value from cache
     * Returns undefined if not found or expired
     */
    get(key: K): V | undefined {
        const entry = this.cache.get(key);

        if (!entry) {
            return undefined;
        }

        // Check if expired
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return undefined;
        }

        // Move to end (most recently used)
        this.cache.delete(key);
        this.cache.set(key, entry);

        return entry.value;
    }

    /**
     * Set a value in cache with optional TTL
     */
    set(key: K, value: V, ttlMs?: number): void {
        // Delete if exists to update position
        this.cache.delete(key);

        // Evict oldest if at capacity
        if (this.cache.size >= this.maxSize) {
            const oldestKey = this.cache.keys().next().value;
            if (oldestKey !== undefined) {
                this.cache.delete(oldestKey);
            }
        }

        this.cache.set(key, {
            value,
            expiresAt: Date.now() + (ttlMs ?? this.defaultTtlMs),
        });
    }

    /**
     * Check if key exists and is not expired
     */
    has(key: K): boolean {
        return this.get(key) !== undefined;
    }

    /**
     * Delete a key from cache
     */
    delete(key: K): boolean {
        return this.cache.delete(key);
    }

    /**
     * Clear all entries
     */
    clear(): void {
        this.cache.clear();
    }

    /**
     * Get current cache size
     */
    get size(): number {
        return this.cache.size;
    }

    /**
     * Invalidate all entries matching a pattern
     */
    invalidatePattern(predicate: (key: K) => boolean): number {
        let count = 0;
        for (const key of this.cache.keys()) {
            if (predicate(key)) {
                this.cache.delete(key);
                count++;
            }
        }
        return count;
    }
}
