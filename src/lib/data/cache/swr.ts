type CacheEntry<T> = {
  data: T;
  timestamp: number;
};

/**
 * In-memory Stale-While-Revalidate (SWR) cache and request deduplicator.
 * Designed to prevent rate-limit exhaustion and provide instant loading.
 */
class SwrCache {
  private cache = new Map<string, CacheEntry<any>>();
  private inFlight = new Map<string, Promise<any>>();
  private listeners = new Map<string, Set<(data: any) => void>>();

  /**
   * Fetch data using SWR strategy.
   * If fresh data exists, returns it immediately.
   * If stale data exists, returns it immediately and kicks off background refresh.
   * If no data exists, fetches it (and deduplicates any parallel requests).
   */
  async get<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlMs: number = 30000 // Default 30s TTL
  ): Promise<T> {
    const cached = this.cache.get(key);
    const now = Date.now();

    if (cached) {
      const isExpired = now - cached.timestamp > ttlMs;
      if (isExpired) {
        // Stale data exists. Trigger background revalidation but return cached immediately
        this.revalidate(key, fetcher).catch((err) =>
          console.warn(`SWR background revalidation failed for key: ${key}`, err)
        );
      }
      return cached.data as T;
    }

    // No cache. Must perform blocking fetch (deduplicated)
    return this.revalidate(key, fetcher);
  }

  /**
   * Returns a cached value instantly if it exists, otherwise undefined.
   */
  getImmediate<T>(key: string): T | undefined {
    return this.cache.get(key)?.data as T | undefined;
  }

  /**
   * Trigger / deduplicate fetch request.
   */
  private async revalidate<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    let promise = this.inFlight.get(key);

    if (promise) {
      return promise as Promise<T>;
    }

    promise = (async () => {
      try {
        const result = await fetcher();
        this.cache.set(key, {
          data: result,
          timestamp: Date.now(),
        });
        this.notify(key, result);
        return result;
      } finally {
        this.inFlight.delete(key);
      }
    })();

    this.inFlight.set(key, promise);
    return promise;
  }

  /**
   * Subscribe to updates for a specific cache key.
   */
  subscribe<T>(key: string, callback: (data: T) => void): () => void {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }

    const set = this.listeners.get(key)!;
    set.add(callback);

    // If we have cached data, emit it to the subscriber immediately
    const cached = this.cache.get(key);
    if (cached) {
      callback(cached.data);
    }

    return () => {
      set.delete(callback);
      if (set.size === 0) {
        this.listeners.delete(key);
      }
    };
  }

  /**
   * Notify all subscribers of new data.
   */
  private notify(key: string, data: any) {
    const set = this.listeners.get(key);
    if (set) {
      set.forEach((callback) => {
        try {
          callback(data);
        } catch (e) {
          console.error(`SWR: Error in subscriber callback for key ${key}`, e);
        }
      });
    }
  }

  /**
   * Manually invalidate a cache key.
   */
  invalidate(key: string) {
    this.cache.delete(key);
    this.inFlight.delete(key);
  }

  /**
   * Clear all cache.
   */
  clear() {
    this.cache.clear();
    this.inFlight.clear();
  }
}

export const swrCache = new SwrCache();
export type { SwrCache };
