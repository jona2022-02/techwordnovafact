// lib/queryOptimizer.ts
import { 
  DocumentSnapshot, 
  QuerySnapshot, 
  Query,
  CollectionReference,
  DocumentReference,
  getDoc,
  getDocs
} from 'firebase/firestore';
import { logger } from './logger';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface BatchResult<T> {
  success: boolean;
  data?: T[];
  errors?: Error[];
}

export class FirestoreQueryOptimizer {
  private cache = new Map<string, CacheEntry<any>>();
  private pendingQueries = new Map<string, Promise<any>>();
  
  constructor(private defaultTtl: number = 5 * 60 * 1000) {} // 5 minutes default

  /**
   * Get data with caching and deduplication
   */
  async getCached<T>(
    key: string,
    queryFn: () => Promise<T>,
    ttl: number = this.defaultTtl
  ): Promise<T> {
    // Check cache first
    const cached = this.cache.get(key);
    if (cached && Date.now() < cached.expiresAt) {
      logger.debug('Cache hit', { key });
      return cached.data;
    }

    // Check if query is already in progress (deduplication)
    if (this.pendingQueries.has(key)) {
      logger.debug('Deduplicating query', { key });
      return this.pendingQueries.get(key)!;
    }

    // Execute query
    const promise = this.executeWithMetrics(key, queryFn);
    this.pendingQueries.set(key, promise);

    try {
      const data = await promise;
      
      // Cache the result
      this.cache.set(key, {
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + ttl
      });

      return data;
    } finally {
      this.pendingQueries.delete(key);
    }
  }

  /**
   * Execute multiple queries in parallel with batching
   */
  async batchQueries<T>(
    queries: Array<{
      key: string;
      queryFn: () => Promise<T>;
      ttl?: number;
    }>
  ): Promise<BatchResult<T>> {
    try {
      const promises = queries.map(({ key, queryFn, ttl }) => 
        this.getCached(key, queryFn, ttl)
      );

      const results = await Promise.allSettled(promises);
      const data: T[] = [];
      const errors: Error[] = [];

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          data.push(result.value);
        } else {
          logger.error('Batch query failed', { 
            key: queries[index].key, 
            error: result.reason 
          });
          errors.push(result.reason);
        }
      });

      return {
        success: errors.length === 0,
        data,
        errors: errors.length > 0 ? errors : undefined
      };
    } catch (error) {
      logger.error('Batch queries failed', error);
      return { success: false, errors: [error as Error] };
    }
  }

  /**
   * Optimized single document fetch with caching
   */
  async getDocument<T>(
    docRef: DocumentReference,
    cacheKey?: string,
    ttl?: number
  ): Promise<T | null> {
    const key = cacheKey || `doc:${docRef.path}`;
    
    return this.getCached(
      key,
      async () => {
        const snapshot = await getDoc(docRef);
        if (!snapshot.exists()) return null;
        
        return {
          id: snapshot.id,
          ...snapshot.data()
        } as T;
      },
      ttl
    );
  }

  /**
   * Optimized collection query with pagination and caching
   */
  async getCollection<T>(
    query: Query,
    options: {
      cacheKey: string;
      ttl?: number;
      limit?: number;
      includeMeta?: boolean;
    }
  ): Promise<{ data: T[]; meta?: any }> {
    const { cacheKey, ttl, includeMeta } = options;
    
    return this.getCached(
      cacheKey,
      async () => {
        const snapshot = await getDocs(query);
        const data = snapshot.docs.map((doc: any) => ({
          id: doc.id,
          ...doc.data()
        })) as T[];

        const result: { data: T[]; meta?: any } = { data };
        
        if (includeMeta) {
          result.meta = {
            size: snapshot.size,
            empty: snapshot.empty,
            fromCache: snapshot.metadata?.fromCache,
            hasPendingWrites: snapshot.metadata?.hasPendingWrites
          };
        }

        return result;
      },
      ttl
    );
  }

  /**
   * Execute query with performance metrics
   */
  private async executeWithMetrics<T>(
    key: string,
    queryFn: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      const result = await queryFn();
      const duration = Date.now() - startTime;
      
      logger.debug('Query executed', { 
        key, 
        duration: `${duration}ms`,
        cached: false 
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Query failed', { 
        key, 
        duration: `${duration}ms`, 
        error 
      });
      throw error;
    }
  }

  /**
   * Invalidate cache entries
   */
  invalidate(keyPattern?: string): void {
    if (!keyPattern) {
      this.cache.clear();
      logger.debug('Cache cleared completely');
      return;
    }

    const keysToDelete: string[] = [];
    for (const key of this.cache.keys()) {
      if (key.includes(keyPattern)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
    logger.debug('Cache invalidated', { 
      pattern: keyPattern, 
      keysDeleted: keysToDelete.length 
    });
  }

  /**
   * Clean expired cache entries
   */
  cleanExpiredCache(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now >= entry.expiresAt) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
    
    if (keysToDelete.length > 0) {
      logger.debug('Expired cache entries cleaned', { 
        count: keysToDelete.length 
      });
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    hitRate: number;
    expired: number;
  } {
    const now = Date.now();
    let expired = 0;

    for (const entry of this.cache.values()) {
      if (now >= entry.expiresAt) {
        expired++;
      }
    }

    return {
      size: this.cache.size,
      hitRate: 0, // Would need to track hits/misses for this
      expired
    };
  }
}

// Singleton instance
export const queryOptimizer = new FirestoreQueryOptimizer();