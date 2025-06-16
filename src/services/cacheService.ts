import Redis from 'redis';
import { config } from '@/utils/config';

export interface CacheOptions {
  includeExpired?: boolean;
}

export class CacheService {
  private client: Redis.RedisClientType;
  private connected: boolean = false;

  constructor() {
    this.client = Redis.createClient({
      url: config.redis.url,
    });

    this.client.on('error', (err) => {
      console.error('Redis Client Error:', err);
      this.connected = false;
    });

    this.client.on('connect', () => {
      console.log('Redis Client Connected');
      this.connected = true;
    });

    // Connect asynchronously
    this.connect().catch(console.error);
  }

  private async connect(): Promise<void> {
    if (!this.connected) {
      try {
        await this.client.connect();
      } catch (error) {
        console.error('Failed to connect to Redis:', error);
      }
    }
  }

  public async get<T>(key: string, options?: CacheOptions): Promise<T | null> {
    if (!this.connected) {
      console.warn('Redis not connected, skipping cache get');
      return null;
    }

    try {
      const data = await this.client.get(key);
      if (!data) return null;

      const parsed = JSON.parse(data) as { value: T; expiry?: number };
      
      // Check expiry if not including expired items
      if (!options?.includeExpired && parsed.expiry) {
        if (Date.now() > parsed.expiry) {
          await this.delete(key);
          return null;
        }
      }

      return parsed.value;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  public async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    if (!this.connected) {
      console.warn('Redis not connected, skipping cache set');
      return;
    }

    try {
      const data = {
        value,
        expiry: ttlSeconds ? Date.now() + (ttlSeconds * 1000) : undefined,
      };

      await this.client.set(
        key,
        JSON.stringify(data),
        ttlSeconds ? { EX: ttlSeconds } : {}
      );
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  public async delete(key: string): Promise<void> {
    if (!this.connected) {
      console.warn('Redis not connected, skipping cache delete');
      return;
    }

    try {
      await this.client.del(key);
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  public async flush(): Promise<void> {
    if (!this.connected) {
      console.warn('Redis not connected, skipping cache flush');
      return;
    }

    try {
      await this.client.flushAll();
    } catch (error) {
      console.error('Cache flush error:', error);
    }
  }

  public async close(): Promise<void> {
    if (this.connected) {
      await this.client.quit();
      this.connected = false;
    }
  }

  public isConnected(): boolean {
    return this.connected;
  }

  // Fallback in-memory cache for when Redis is unavailable
  private static memoryCache = new Map<string, { value: unknown; expiry?: number }>();

  public async getFromMemory<T>(key: string): Promise<T | null> {
    const item = CacheService.memoryCache.get(key);
    if (!item) return null;

    if (item.expiry && Date.now() > item.expiry) {
      CacheService.memoryCache.delete(key);
      return null;
    }

    return item.value as T;
  }

  public async setInMemory<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const expiry = ttlSeconds ? Date.now() + (ttlSeconds * 1000) : undefined;
    CacheService.memoryCache.set(key, { value, expiry });

    // Limit memory cache size
    if (CacheService.memoryCache.size > 1000) {
      const firstKey = CacheService.memoryCache.keys().next().value;
      CacheService.memoryCache.delete(firstKey);
    }
  }
}