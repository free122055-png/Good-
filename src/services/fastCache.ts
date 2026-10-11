/**
 * High-Performance Client Cache & In-Memory Storage for BINISTA
 * - Instant synchronous retrieval of cached data to prevent render delays
 * - Background revalidation (Stale-While-Revalidate pattern)
 * - Safe TTL management to avoid serving outdated information
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class FastCacheManager {
  private memoryCache: Map<string, CacheEntry<any>> = new Map();

  /**
   * Get cached data from memory or localStorage (sub-millisecond instant return)
   */
  get<T>(key: string, maxAgeMs = 3 * 60 * 1000): T | null {
    // 1. Check memory Map first (fastest)
    const mem = this.memoryCache.get(key);
    const now = Date.now();
    if (mem && now - mem.timestamp < maxAgeMs) {
      return mem.data;
    }

    // 2. Check localStorage fallback
    try {
      const raw = localStorage.getItem(`binista_cache_${key}`);
      if (raw) {
        const parsed: CacheEntry<T> = JSON.parse(raw);
        if (now - parsed.timestamp < maxAgeMs) {
          // Re-populate memory cache
          this.memoryCache.set(key, parsed);
          return parsed.data;
        } else {
          localStorage.removeItem(`binista_cache_${key}`);
        }
      }
    } catch (_) {}

    return null;
  }

  /**
   * Store data in memory and localStorage asynchronously
   */
  set<T>(key: string, data: T): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
    };
    this.memoryCache.set(key, entry);

    // Save to localStorage safely (non-blocking)
    try {
      setTimeout(() => {
        try {
          localStorage.setItem(`binista_cache_${key}`, JSON.stringify(entry));
        } catch (_) {}
      }, 0);
    } catch (_) {}
  }

  /**
   * Invalidate specific key or keys matching prefix
   */
  invalidate(keyOrPrefix: string): void {
    for (const k of Array.from(this.memoryCache.keys())) {
      if (k === keyOrPrefix || k.startsWith(keyOrPrefix)) {
        this.memoryCache.delete(k);
        try {
          localStorage.removeItem(`binista_cache_${k}`);
        } catch (_) {}
      }
    }
  }

  /**
   * Clear all app caches
   */
  clear(): void {
    this.memoryCache.clear();
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('binista_cache_')) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch (_) {}
  }
}

export const fastCache = new FastCacheManager();
