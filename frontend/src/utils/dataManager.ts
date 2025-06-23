import { ratingCache, generateQueryHash } from './cache';
import { realtimeManager } from './realtime';
import { restaurantService } from '@services/restaurantService';
import type { SearchQuery } from '@types/search';

interface DataFetchOptions {
  useCache?: boolean;
  cacheTTL?: number;
  enableRealtime?: boolean;
  forceRefresh?: boolean;
}

interface BackgroundSyncOptions {
  interval?: number;
  maxAge?: number;
  enableBackgroundRefresh?: boolean;
}

export class DataManager {
  private static instance: DataManager;
  private backgroundSyncTimer: NodeJS.Timeout | null = null;
  private syncOptions: Required<BackgroundSyncOptions> = {
    interval: 300000, // 5 minutes
    maxAge: 600000, // 10 minutes
    enableBackgroundRefresh: true,
  };

  private constructor() {
    this.initializeRealtime();
  }

  static getInstance(): DataManager {
    if (!DataManager.instance) {
      DataManager.instance = new DataManager();
    }
    return DataManager.instance;
  }

  // レストラン詳細データの取得（キャッシュ付き）
  async getRestaurant(
    restaurantId: string, 
    options: DataFetchOptions = {}
  ): Promise<any> {
    const {
      useCache = true,
      cacheTTL = 600000, // 10 minutes
      forceRefresh = false,
    } = options;

    // キャッシュチェック
    if (useCache && !forceRefresh) {
      const cached = ratingCache.getRestaurant(restaurantId);
      if (cached) {
        console.log(`Restaurant ${restaurantId} loaded from cache`);
        return cached;
      }
    }

    try {
      console.log(`Fetching restaurant ${restaurantId} from API`);
      const data = await restaurantService.getRestaurant(restaurantId);
      
      if (useCache) {
        ratingCache.setRestaurant(restaurantId, data, cacheTTL);
      }

      return data;
    } catch (error) {
      console.error(`Failed to fetch restaurant ${restaurantId}:`, error);
      
      // エラー時はキャッシュがあれば返す
      if (useCache) {
        const cached = ratingCache.getRestaurant(restaurantId);
        if (cached) {
          console.log(`Returning stale cache for restaurant ${restaurantId}`);
          return cached;
        }
      }
      
      throw error;
    }
  }

  // 総合評価データの取得（キャッシュ付き）
  async getComprehensiveRating(
    restaurantId: string,
    options: DataFetchOptions = {}
  ): Promise<any> {
    const {
      useCache = true,
      cacheTTL = 300000, // 5 minutes
      forceRefresh = false,
    } = options;

    // キャッシュチェック
    if (useCache && !forceRefresh) {
      const cached = ratingCache.getComprehensiveRating(restaurantId);
      if (cached) {
        console.log(`Comprehensive rating for ${restaurantId} loaded from cache`);
        return cached;
      }
    }

    try {
      console.log(`Fetching comprehensive rating for ${restaurantId} from API`);
      const data = await restaurantService.getComprehensiveRating(restaurantId);
      
      if (useCache) {
        ratingCache.setComprehensiveRating(restaurantId, data, cacheTTL);
      }

      return data;
    } catch (error) {
      console.error(`Failed to fetch comprehensive rating for ${restaurantId}:`, error);
      
      // エラー時はキャッシュがあれば返す
      if (useCache) {
        const cached = ratingCache.getComprehensiveRating(restaurantId);
        if (cached) {
          console.log(`Returning stale cache for comprehensive rating ${restaurantId}`);
          return cached;
        }
      }
      
      throw error;
    }
  }

  // 検索結果の取得（キャッシュ付き）
  async searchRestaurants(
    query: SearchQuery,
    options: DataFetchOptions = {}
  ): Promise<any> {
    const {
      useCache = true,
      cacheTTL = 180000, // 3 minutes
      forceRefresh = false,
    } = options;

    const queryHash = generateQueryHash(query);

    // キャッシュチェック
    if (useCache && !forceRefresh) {
      const cached = ratingCache.getSearchResults(queryHash);
      if (cached) {
        console.log(`Search results for query ${queryHash} loaded from cache`);
        return cached;
      }
    }

    try {
      console.log(`Fetching search results for query ${queryHash} from API`);
      const data = await restaurantService.search(query);
      
      if (useCache) {
        ratingCache.setSearchResults(queryHash, data, cacheTTL);
      }

      return data;
    } catch (error) {
      console.error(`Failed to fetch search results for query ${queryHash}:`, error);
      
      // エラー時はキャッシュがあれば返す
      if (useCache) {
        const cached = ratingCache.getSearchResults(queryHash);
        if (cached) {
          console.log(`Returning stale cache for search query ${queryHash}`);
          return cached;
        }
      }
      
      throw error;
    }
  }

  // バックグラウンド同期の開始
  startBackgroundSync(options: BackgroundSyncOptions = {}): void {
    this.syncOptions = { ...this.syncOptions, ...options };
    
    if (!this.syncOptions.enableBackgroundRefresh) {
      return;
    }

    this.stopBackgroundSync(); // 既存のタイマーをクリア

    this.backgroundSyncTimer = setInterval(() => {
      this.performBackgroundSync();
    }, this.syncOptions.interval);

    console.log('Background sync started with interval:', this.syncOptions.interval);
  }

  // バックグラウンド同期の停止
  stopBackgroundSync(): void {
    if (this.backgroundSyncTimer) {
      clearInterval(this.backgroundSyncTimer);
      this.backgroundSyncTimer = null;
      console.log('Background sync stopped');
    }
  }

  // キャッシュの無効化
  invalidateCache(type: 'all' | 'restaurant' | 'search' | 'rating', id?: string): void {
    switch (type) {
      case 'all':
        ratingCache.clear();
        break;
      case 'restaurant':
        if (id) {
          ratingCache.invalidateRestaurant(id);
        }
        break;
      case 'search':
        ratingCache.invalidateSearchCache();
        break;
      case 'rating':
        if (id) {
          ratingCache.invalidateRestaurant(id);
        }
        break;
    }
    console.log(`Cache invalidated: ${type}${id ? ` (${id})` : ''}`);
  }

  // キャッシュ統計の取得
  getCacheStats() {
    return ratingCache.getStats();
  }

  // キャッシュクリーンアップ
  cleanupCache(): number {
    return ratingCache.cleanup();
  }

  // データの事前読み込み
  async preloadData(restaurantIds: string[]): Promise<void> {
    const promises = restaurantIds.map(async (id) => {
      try {
        // レストラン詳細と総合評価を並行して読み込み
        await Promise.all([
          this.getRestaurant(id, { useCache: true }),
          this.getComprehensiveRating(id, { useCache: true }),
        ]);
      } catch (error) {
        console.warn(`Failed to preload data for restaurant ${id}:`, error);
      }
    });

    await Promise.allSettled(promises);
    console.log(`Preloaded data for ${restaurantIds.length} restaurants`);
  }

  private async performBackgroundSync(): Promise<void> {
    try {
      console.log('Performing background sync...');
      
      // キャッシュクリーンアップ
      const cleanedItems = this.cleanupCache();
      if (cleanedItems > 0) {
        console.log(`Cleaned up ${cleanedItems} expired cache items`);
      }

      // 古いキャッシュアイテムの更新
      const stats = this.getCacheStats();
      if (stats.size > 0) {
        await this.refreshStaleData();
      }

    } catch (error) {
      console.error('Background sync failed:', error);
    }
  }

  private async refreshStaleData(): Promise<void> {
    const cacheKeys = ratingCache.keys();
    const staleKeys: string[] = [];

    // 古いデータを特定（実装を簡素化のため、ここでは一部のみ）
    cacheKeys.forEach(key => {
      if (key.startsWith('rating:') && Math.random() < 0.1) { // 10%の確率で更新
        staleKeys.push(key);
      }
    });

    if (staleKeys.length === 0) {
      return;
    }

    console.log(`Refreshing ${staleKeys.length} stale cache items`);

    const refreshPromises = staleKeys.map(async (key) => {
      try {
        if (key.startsWith('rating:')) {
          const restaurantId = key.split(':')[1];
          await this.getComprehensiveRating(restaurantId, { forceRefresh: true });
        }
      } catch (error) {
        console.warn(`Failed to refresh cache for key ${key}:`, error);
      }
    });

    await Promise.allSettled(refreshPromises);
  }

  private initializeRealtime(): void {
    // リアルタイム更新のリスナー設定
    realtimeManager.on('rating_updated', (payload: any) => {
      console.log('Real-time rating update received:', payload);
      // キャッシュを自動的に無効化
      this.invalidateCache('rating', payload.restaurantId);
    });

    realtimeManager.on('restaurant_updated', (payload: any) => {
      console.log('Real-time restaurant update received:', payload);
      // キャッシュを自動的に無効化
      this.invalidateCache('restaurant', payload.restaurantId);
    });

    // 接続状態の監視
    realtimeManager.on('connected', () => {
      console.log('Real-time connection established');
    });

    realtimeManager.on('disconnected', () => {
      console.log('Real-time connection lost');
    });
  }
}

// シングルトンインスタンス
export const dataManager = DataManager.getInstance();

// React Hook
import { useState, useEffect } from 'react';

export const useDataManager = () => {
  const [cacheStats, setCacheStats] = useState(dataManager.getCacheStats());

  useEffect(() => {
    // 定期的にキャッシュ統計を更新
    const interval = setInterval(() => {
      setCacheStats(dataManager.getCacheStats());
    }, 5000);

    // バックグラウンド同期を開始
    dataManager.startBackgroundSync();

    return () => {
      clearInterval(interval);
      dataManager.stopBackgroundSync();
    };
  }, []);

  return {
    cacheStats,
    invalidateCache: dataManager.invalidateCache.bind(dataManager),
    cleanupCache: dataManager.cleanupCache.bind(dataManager),
    preloadData: dataManager.preloadData.bind(dataManager),
    getRestaurant: dataManager.getRestaurant.bind(dataManager),
    getComprehensiveRating: dataManager.getComprehensiveRating.bind(dataManager),
    searchRestaurants: dataManager.searchRestaurants.bind(dataManager),
  };
};