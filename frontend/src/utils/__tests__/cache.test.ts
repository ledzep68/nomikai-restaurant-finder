import { Cache, RestaurantRatingCache, generateQueryHash } from '../cache';

describe('Cache', () => {
  let cache: Cache<string>;

  beforeEach(() => {
    cache = new Cache<string>({
      maxSize: 3,
      defaultTTL: 1000,
      enablePersistence: false,
    });
  });

  afterEach(() => {
    cache.clear();
  });

  describe('basic operations', () => {
    test('should set and get values', () => {
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
    });

    test('should return null for non-existent keys', () => {
      expect(cache.get('nonexistent')).toBeNull();
    });

    test('should check if key exists', () => {
      cache.set('key1', 'value1');
      expect(cache.has('key1')).toBe(true);
      expect(cache.has('key2')).toBe(false);
    });

    test('should delete keys', () => {
      cache.set('key1', 'value1');
      expect(cache.delete('key1')).toBe(true);
      expect(cache.get('key1')).toBeNull();
      expect(cache.delete('key1')).toBe(false);
    });

    test('should clear all keys', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.clear();
      expect(cache.size()).toBe(0);
    });
  });

  describe('TTL functionality', () => {
    test('should expire items after TTL', async () => {
      cache.set('key1', 'value1', 100); // 100ms TTL
      expect(cache.get('key1')).toBe('value1');
      
      await new Promise(resolve => setTimeout(resolve, 150));
      expect(cache.get('key1')).toBeNull();
    });

    test('should not expire items before TTL', async () => {
      cache.set('key1', 'value1', 200); // 200ms TTL
      
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(cache.get('key1')).toBe('value1');
    });

    test('should update TTL with touch', async () => {
      cache.set('key1', 'value1', 100);
      
      await new Promise(resolve => setTimeout(resolve, 50));
      cache.touch('key1', 200); // Reset with new TTL
      
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(cache.get('key1')).toBe('value1'); // Should still exist
    });
  });

  describe('size management', () => {
    test('should evict oldest item when max size reached', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
      cache.set('key4', 'value4'); // Should evict key1
      
      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBe('value2');
      expect(cache.get('key3')).toBe('value3');
      expect(cache.get('key4')).toBe('value4');
    });

    test('should track size correctly', () => {
      expect(cache.size()).toBe(0);
      cache.set('key1', 'value1');
      expect(cache.size()).toBe(1);
      cache.set('key2', 'value2');
      expect(cache.size()).toBe(2);
      cache.delete('key1');
      expect(cache.size()).toBe(1);
    });
  });

  describe('cleanup', () => {
    test('should cleanup expired items', async () => {
      cache.set('key1', 'value1', 100);
      cache.set('key2', 'value2', 1000);
      
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const cleaned = cache.cleanup();
      expect(cleaned).toBe(1);
      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBe('value2');
    });
  });
});

describe('RestaurantRatingCache', () => {
  let cache: RestaurantRatingCache;

  beforeEach(() => {
    cache = RestaurantRatingCache.getInstance();
    cache.clear();
  });

  afterEach(() => {
    cache.clear();
  });

  test('should cache and retrieve restaurant data', () => {
    const restaurantData = { id: '1', name: 'Test Restaurant' };
    cache.setRestaurant('1', restaurantData);
    
    expect(cache.getRestaurant('1')).toEqual(restaurantData);
  });

  test('should cache and retrieve comprehensive ratings', () => {
    const rating = { score: 4.5, confidence: 0.8 };
    cache.setComprehensiveRating('1', rating);
    
    expect(cache.getComprehensiveRating('1')).toEqual(rating);
  });

  test('should cache and retrieve search results', () => {
    const results = { restaurants: [], total: 0 };
    const queryHash = 'test-hash';
    cache.setSearchResults(queryHash, results);
    
    expect(cache.getSearchResults(queryHash)).toEqual(results);
  });

  test('should cache and retrieve platform ratings', () => {
    const rating = { rating: 4.0, reviews: 100 };
    cache.setPlatformRating('1', 'hotpepper', rating);
    
    expect(cache.getPlatformRating('1', 'hotpepper')).toEqual(rating);
  });

  test('should invalidate restaurant cache', () => {
    cache.setRestaurant('1', { id: '1', name: 'Test' });
    cache.setComprehensiveRating('1', { score: 4.5 });
    cache.setPlatformRating('1', 'hotpepper', { rating: 4.0 });
    
    cache.invalidateRestaurant('1');
    
    expect(cache.getRestaurant('1')).toBeNull();
    expect(cache.getComprehensiveRating('1')).toBeNull();
    expect(cache.getPlatformRating('1', 'hotpepper')).toBeNull();
  });

  test('should invalidate search cache', () => {
    cache.setSearchResults('hash1', { results: [] });
    cache.setSearchResults('hash2', { results: [] });
    cache.setRestaurant('1', { id: '1' }); // Should not be affected
    
    cache.invalidateSearchCache();
    
    expect(cache.getSearchResults('hash1')).toBeNull();
    expect(cache.getSearchResults('hash2')).toBeNull();
    expect(cache.getRestaurant('1')).toEqual({ id: '1' });
  });
});

describe('generateQueryHash', () => {
  test('should generate consistent hashes for same query', () => {
    const query1 = { location: 'Tokyo', genre: 'Japanese' };
    const query2 = { genre: 'Japanese', location: 'Tokyo' }; // Different order
    
    const hash1 = generateQueryHash(query1);
    const hash2 = generateQueryHash(query2);
    
    expect(hash1).toBe(hash2);
  });

  test('should generate different hashes for different queries', () => {
    const query1 = { location: 'Tokyo', genre: 'Japanese' };
    const query2 = { location: 'Osaka', genre: 'Japanese' };
    
    const hash1 = generateQueryHash(query1);
    const hash2 = generateQueryHash(query2);
    
    expect(hash1).not.toBe(hash2);
  });

  test('should handle complex queries', () => {
    const query = {
      location: 'Tokyo',
      genre: 'Japanese',
      priceRange: { min: 1000, max: 5000 },
      features: ['parking', 'wifi'],
      sort: 'rating',
    };
    
    const hash = generateQueryHash(query);
    expect(typeof hash).toBe('string');
    expect(hash.length).toBeGreaterThan(0);
  });
});