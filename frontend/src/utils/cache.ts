interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
  version?: string;
}

interface CacheConfig {
  maxSize?: number;
  defaultTTL?: number;
  enableCompression?: boolean;
  enablePersistence?: boolean;
  storageKey?: string;
}

export class Cache<T = any> {
  private cache = new Map<string, CacheItem<T>>();
  private config: Required<CacheConfig>;
  private compressionSupported: boolean;

  constructor(config: CacheConfig = {}) {
    this.config = {
      maxSize: config.maxSize || 100,
      defaultTTL: config.defaultTTL || 300000, // 5 minutes
      enableCompression: config.enableCompression || false,
      enablePersistence: config.enablePersistence || true,
      storageKey: config.storageKey || 'nomikai_cache',
    };
    
    this.compressionSupported = typeof CompressionStream !== 'undefined';
    
    if (this.config.enablePersistence) {
      this.loadFromStorage();
    }
  }

  set(key: string, data: T, ttl?: number, version?: string): void {
    // サイズ制限チェック
    if (this.cache.size >= this.config.maxSize && !this.cache.has(key)) {
      this.evictOldest();
    }

    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.config.defaultTTL,
      version,
    };

    this.cache.set(key, item);

    if (this.config.enablePersistence) {
      this.saveToStorage();
    }
  }

  get(key: string, version?: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    // TTL チェック
    if (this.isExpired(item)) {
      this.cache.delete(key);
      if (this.config.enablePersistence) {
        this.saveToStorage();
      }
      return null;
    }

    // バージョンチェック
    if (version && item.version && item.version !== version) {
      this.cache.delete(key);
      if (this.config.enablePersistence) {
        this.saveToStorage();
      }
      return null;
    }

    return item.data;
  }

  has(key: string): boolean {
    const item = this.cache.get(key);
    return item ? !this.isExpired(item) : false;
  }

  delete(key: string): boolean {
    const result = this.cache.delete(key);
    if (result && this.config.enablePersistence) {
      this.saveToStorage();
    }
    return result;
  }

  clear(): void {
    this.cache.clear();
    if (this.config.enablePersistence) {
      this.saveToStorage();
    }
  }

  size(): number {
    return this.cache.size;
  }

  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  // TTL を更新
  touch(key: string, ttl?: number): boolean {
    const item = this.cache.get(key);
    if (!item) {
      return false;
    }

    item.timestamp = Date.now();
    if (ttl !== undefined) {
      item.ttl = ttl;
    }

    if (this.config.enablePersistence) {
      this.saveToStorage();
    }
    return true;
  }

  // 期限切れアイテムのクリーンアップ
  cleanup(): number {
    let cleaned = 0;
    const keysToDelete: string[] = [];

    for (const [key, item] of this.cache.entries()) {
      if (this.isExpired(item)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => {
      this.cache.delete(key);
      cleaned++;
    });

    if (cleaned > 0 && this.config.enablePersistence) {
      this.saveToStorage();
    }

    return cleaned;
  }

  // 統計情報
  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    expiredItems: number;
  } {
    let expiredItems = 0;
    for (const item of this.cache.values()) {
      if (this.isExpired(item)) {
        expiredItems++;
      }
    }

    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      hitRate: 0, // 実装すればヒット率も計算可能
      expiredItems,
    };
  }

  private isExpired(item: CacheItem<T>): boolean {
    return Date.now() - item.timestamp > item.ttl;
  }

  private evictOldest(): void {
    let oldest: string | null = null;
    let oldestTime = Date.now();

    for (const [key, item] of this.cache.entries()) {
      if (item.timestamp < oldestTime) {
        oldestTime = item.timestamp;
        oldest = key;
      }
    }

    if (oldest) {
      this.cache.delete(oldest);
    }
  }

  private saveToStorage(): void {
    try {
      const serialized = JSON.stringify(Array.from(this.cache.entries()));
      localStorage.setItem(this.config.storageKey, serialized);
    } catch (error) {
      console.warn('Failed to save cache to storage:', error);
    }
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.config.storageKey);
      if (stored) {
        const entries = JSON.parse(stored) as Array<[string, CacheItem<T>]>;
        this.cache = new Map(entries);
        // 読み込み時に期限切れアイテムをクリーンアップ
        this.cleanup();
      }
    } catch (error) {
      console.warn('Failed to load cache from storage:', error);
      this.cache.clear();
    }
  }
}

// レストラン評価データ専用のキャッシュマネージャー
export class RestaurantRatingCache {
  private cache: Cache<any>;
  private static instance: RestaurantRatingCache;

  private constructor() {
    this.cache = new Cache({
      maxSize: 200,
      defaultTTL: 600000, // 10 minutes
      enablePersistence: true,
      storageKey: 'nomikai_rating_cache',
    });
  }

  static getInstance(): RestaurantRatingCache {
    if (!RestaurantRatingCache.instance) {
      RestaurantRatingCache.instance = new RestaurantRatingCache();
    }
    return RestaurantRatingCache.instance;
  }

  // レストラン詳細情報をキャッシュ
  setRestaurant(restaurantId: string, data: any, ttl?: number): void {
    this.cache.set(`restaurant:${restaurantId}`, data, ttl);
  }

  getRestaurant(restaurantId: string): any | null {
    return this.cache.get(`restaurant:${restaurantId}`);
  }

  // 総合評価をキャッシュ
  setComprehensiveRating(restaurantId: string, rating: any, ttl?: number): void {
    this.cache.set(`rating:${restaurantId}`, rating, ttl);
  }

  getComprehensiveRating(restaurantId: string): any | null {
    return this.cache.get(`rating:${restaurantId}`);
  }

  // 検索結果をキャッシュ
  setSearchResults(queryHash: string, results: any, ttl?: number): void {
    this.cache.set(`search:${queryHash}`, results, ttl);
  }

  getSearchResults(queryHash: string): any | null {
    return this.cache.get(`search:${queryHash}`);
  }

  // プラットフォーム別評価をキャッシュ
  setPlatformRating(restaurantId: string, platform: string, rating: any, ttl?: number): void {
    this.cache.set(`platform:${platform}:${restaurantId}`, rating, ttl);
  }

  getPlatformRating(restaurantId: string, platform: string): any | null {
    return this.cache.get(`platform:${platform}:${restaurantId}`);
  }

  // レストラント関連のキャッシュを無効化
  invalidateRestaurant(restaurantId: string): void {
    const keys = this.cache.keys();
    const restaurantKeys = keys.filter(key => 
      key.includes(restaurantId) || key.startsWith(`restaurant:${restaurantId}`)
    );
    
    restaurantKeys.forEach(key => this.cache.delete(key));
  }

  // 検索キャッシュを無効化
  invalidateSearchCache(): void {
    const keys = this.cache.keys();
    const searchKeys = keys.filter(key => key.startsWith('search:'));
    searchKeys.forEach(key => this.cache.delete(key));
  }

  // 期限切れアイテムのクリーンアップ
  cleanup(): number {
    return this.cache.cleanup();
  }

  // キャッシュ統計
  getStats() {
    return this.cache.getStats();
  }

  // 全キャッシュクリア
  clear(): void {
    this.cache.clear();
  }
}

// クエリハッシュ生成ユーティリティ
export const generateQueryHash = (query: any): string => {
  const sortedQuery = Object.keys(query)
    .sort()
    .reduce((result, key) => {
      result[key] = query[key];
      return result;
    }, {} as any);
  
  return btoa(JSON.stringify(sortedQuery)).replace(/[^a-zA-Z0-9]/g, '');
};

// デフォルトエクスポート
export const ratingCache = RestaurantRatingCache.getInstance();