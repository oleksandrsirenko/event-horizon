const logger = require('./logger');

/**
 * Simple in-memory cache with TTL for API responses
 */
class Cache {
  constructor() {
    this.cache = new Map();
    
    // Run cleanup every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60 * 1000);
  }

  /**
   * Set a value in the cache with expiration
   * @param {string} key - Cache key
   * @param {*} value - Value to store
   * @param {number} ttl - Time to live in milliseconds (default: 5 minutes)
   */
  set(key, value, ttl = 5 * 60 * 1000) {
    const expiry = Date.now() + ttl;
    this.cache.set(key, {
      value,
      expiry
    });
    logger.debug(`Cache set: ${key} (expires in ${ttl/1000}s)`);
  }

  /**
   * Get a value from the cache
   * @param {string} key - Cache key
   * @returns {*|null} - Cached value or null if not found or expired
   */
  get(key) {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }
    
    // Check if the entry has expired
    if (entry.expiry < Date.now()) {
      this.delete(key);
      return null;
    }
    
    return entry.value;
  }

  /**
   * Check if a key exists in the cache
   * @param {string} key - Cache key
   * @returns {boolean} - True if key exists and is not expired
   */
  has(key) {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }
    
    // Check if the entry has expired
    if (entry.expiry < Date.now()) {
      this.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Delete a key from the cache
   * @param {string} key - Cache key
   */
  delete(key) {
    this.cache.delete(key);
    logger.debug(`Cache delete: ${key}`);
  }

  /**
   * Clear all entries from the cache
   */
  clear() {
    this.cache.clear();
    logger.debug('Cache cleared');
  }

  /**
   * Clean up expired entries
   */
  cleanup() {
    const now = Date.now();
    let expiredCount = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiry < now) {
        this.cache.delete(key);
        expiredCount++;
      }
    }
    
    if (expiredCount > 0) {
      logger.debug(`Cache cleanup: removed ${expiredCount} expired entries`);
    }
  }

  /**
   * Get cache statistics
   * @returns {Object} - Cache statistics
   */
  getStats() {
    const now = Date.now();
    let activeCount = 0;
    let expiredCount = 0;
    
    for (const [_, entry] of this.cache.entries()) {
      if (entry.expiry >= now) {
        activeCount++;
      } else {
        expiredCount++;
      }
    }
    
    return {
      total: this.cache.size,
      active: activeCount,
      expired: expiredCount
    };
  }

  /**
   * Stop the cleanup interval
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// Create singleton instance
const cache = new Cache();

module.exports = cache;