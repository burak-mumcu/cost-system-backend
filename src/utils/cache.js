import { APP_CONSTANTS } from '../config/constants.js';
import { logger } from './logger.js';

class CacheEntry {
    constructor(data, ttl) {
        this.data = data;
        this.createdAt = Date.now();
        this.ttl = ttl;
    }

    isExpired() {
        return Date.now() - this.createdAt > this.ttl;
    }

    getRemainingTtl() {
        const remaining = this.ttl - (Date.now() - this.createdAt);
        return Math.max(0, remaining);
    }
}

class CacheManager {
    constructor() {
        this.cache = new Map();
        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0,
            clears: 0
        };
    }

    /**
     * Get value from cache
     * @param {string} key - Cache key
     * @returns {*|null} - Cached value or null if not found/expired
     */
    get(key) {
        const entry = this.cache.get(key);

        if (!entry) {
            this.stats.misses++;
            logger.debug('Cache miss', { key });
            return null;
        }

        if (entry.isExpired()) {
            this.cache.delete(key);
            this.stats.misses++;
            logger.debug('Cache expired', { key });
            return null;
        }

        this.stats.hits++;
        logger.debug('Cache hit', {
            key,
            remainingTtl: entry.getRemainingTtl()
        });
        return entry.data;
    }

    /**
     * Set value in cache
     * @param {string} key - Cache key
     * @param {*} data - Data to cache
     * @param {number} ttl - Time to live in milliseconds
     */
    set(key, data, ttl) {
        const entry = new CacheEntry(data, ttl);
        this.cache.set(key, entry);
        this.stats.sets++;

        logger.debug('Cache set', {
            key,
            ttl,
            dataSize: JSON.stringify(data).length
        });
    }

    /**
     * Delete value from cache
     * @param {string} key - Cache key
     * @returns {boolean} - True if key existed and was deleted
     */
    delete(key) {
        const deleted = this.cache.delete(key);
        if (deleted) {
            this.stats.deletes++;
            logger.debug('Cache delete', { key });
        }
        return deleted;
    }

    /**
     * Check if key exists and is not expired
     * @param {string} key - Cache key
     * @returns {boolean}
     */
    has(key) {
        const entry = this.cache.get(key);
        if (!entry) return false;

        if (entry.isExpired()) {
            this.cache.delete(key);
            return false;
        }

        return true;
    }

    /**
     * Clear all cache entries
     */
    clear() {
        const size = this.cache.size;
        this.cache.clear();
        this.stats.clears++;
        logger.info('Cache cleared', { entriesCleared: size });
    }

    /**
     * Clean expired entries
     * @returns {number} - Number of expired entries removed
     */
    cleanExpired() {
        let cleaned = 0;
        const now = Date.now();

        for (const [key, entry] of this.cache.entries()) {
            if (entry.isExpired()) {
                this.cache.delete(key);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            logger.debug('Cache cleanup completed', {
                expiredEntriesRemoved: cleaned,
                remainingEntries: this.cache.size
            });
        }

        return cleaned;
    }

    /**
     * Get cache statistics
     * @returns {object} - Cache statistics
     */
    getStats() {
        const totalRequests = this.stats.hits + this.stats.misses;
        const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests * 100).toFixed(2) : 0;

        return {
            ...this.stats,
            totalRequests,
            hitRate: `${hitRate}%`,
            currentSize: this.cache.size,
            memoryUsage: this.getMemoryUsage()
        };
    }

    /**
     * Get approximate memory usage
     * @returns {string} - Memory usage in KB
     */
    getMemoryUsage() {
        let totalSize = 0;
        for (const [key, entry] of this.cache.entries()) {
            totalSize += key.length;
            totalSize += JSON.stringify(entry.data).length;
        }
        return `${(totalSize / 1024).toFixed(2)}KB`;
    }

    /**
     * Get or set pattern - if key exists return it, otherwise compute and cache
     * @param {string} key - Cache key
     * @param {function} computeFn - Function to compute value if not cached
     * @param {number} ttl - Time to live in milliseconds
     * @returns {*} - Cached or computed value
     */
    async getOrSet(key, computeFn, ttl) {
        const cached = this.get(key);
        if (cached !== null) {
            return cached;
        }

        const computed = await computeFn();
        this.set(key, computed, ttl);
        return computed;
    }

    /**
     * Get all cache keys
     * @returns {string[]} - Array of cache keys
     */
    getKeys() {
        return Array.from(this.cache.keys());
    }

    /**
     * Get cache entries with metadata
     * @returns {object[]} - Array of cache entries with metadata
     */
    getEntries() {
        const entries = [];
        for (const [key, entry] of this.cache.entries()) {
            entries.push({
                key,
                createdAt: new Date(entry.createdAt).toISOString(),
                ttl: entry.ttl,
                remainingTtl: entry.getRemainingTtl(),
                isExpired: entry.isExpired(),
                dataSize: JSON.stringify(entry.data).length
            });
        }
        return entries;
    }
}

// Create singleton instance
export const cacheManager = new CacheManager();

// Cache key generators
export const CACHE_KEYS = {
    ODS_DEFAULTS: 'ods:defaults',
    EXCHANGE_RATES: 'exchange:rates',
    CALCULATION: (inputHash) => `calculation:${inputHash}`,
    HEALTH_CHECK: 'health:check'
};

// Helper functions for specific cache operations
export const cacheHelpers = {
    // Cache ODS defaults
    setOdsDefaults(data) {
        cacheManager.set(
            CACHE_KEYS.ODS_DEFAULTS,
            data,
            APP_CONSTANTS.CACHE_EXPIRATION.ODS_DATA
        );
    },

    getOdsDefaults() {
        return cacheManager.get(CACHE_KEYS.ODS_DEFAULTS);
    },

    // Cache exchange rates
    setExchangeRates(rates) {
        cacheManager.set(
            CACHE_KEYS.EXCHANGE_RATES,
            rates,
            APP_CONSTANTS.CACHE_EXPIRATION.EXCHANGE_RATES
        );
    },

    getExchangeRates() {
        return cacheManager.get(CACHE_KEYS.EXCHANGE_RATES);
    },

    // Cache calculation results
    setCalculationResult(inputHash, result) {
        cacheManager.set(
            CACHE_KEYS.CALCULATION(inputHash),
            result,
            APP_CONSTANTS.CACHE_EXPIRATION.CALCULATION_RESULTS
        );
    },

    getCalculationResult(inputHash) {
        return cacheManager.get(CACHE_KEYS.CALCULATION(inputHash));
    }
};

// Start cleanup interval (every 5 minutes)
setInterval(() => {
    cacheManager.cleanExpired();
}, 5 * 60 * 1000);

export default cacheManager;