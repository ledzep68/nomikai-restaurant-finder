/**
 * End-to-End User Journey Tests
 * Phase 9: Complete user experience validation with real API integration
 */

import { FreeTierRatingService } from '../../services/freeTierRatingService';
import { MultiPlatformCacheService } from '../../services/cache/multiPlatformCacheService';

// 実際のAPIテスト用の設定
const E2E_CONFIG = {
  useRealApis: process.env.E2E_USE_REAL_APIS === 'true',
  hotpepperApiKey: process.env.HOTPEPPER_API_KEY,
  testTimeout: 30000, // 30秒
  testLocations: [
    '東京駅',
    '新宿',
    '渋谷',
    '池袋',
    '銀座',
  ],
  testGenres: [
    '居酒屋',
    'イタリアン',
    '寿司',
    'ラーメン',
    '中華料理',
  ],
};

describe('End-to-End User Journey Tests', () => {
  let ratingService: FreeTierRatingService;
  let cacheService: MultiPlatformCacheService;

  beforeAll(async () => {
    // 実運用環境設定の読み込み
    process.env.ENABLE_FREE_TIER_MODE = 'true';
    process.env.ENABLE_HOTPEPPER = 'true';
    process.env.ENABLE_TABELOG = 'true';
    process.env.HOTPEPPER_FREE_TIER_RPM = '2';
    process.env.HOTPEPPER_FREE_TIER_RPH = '50';
    process.env.HOTPEPPER_FREE_TIER_RPD = '300';

    ratingService = new FreeTierRatingService();
    cacheService = new MultiPlatformCacheService();

    if (E2E_CONFIG.useRealApis && !E2E_CONFIG.hotpepperApiKey) {
      throw new Error('Real API test requires HOTPEPPER_API_KEY environment variable');
    }
  });

  afterAll(() => {
    ratingService.destroy();
    cacheService.destroy();
  });

  describe('🎯 Core User Journey: Restaurant Search & Rating', () => {
    it('Complete journey: Search → Select → View Details → Get Rating', async () => {
      const testLocation = E2E_CONFIG.testLocations[0]; // 東京駅
      const testGenre = E2E_CONFIG.testGenres[0]; // 居酒屋

      console.log(`\n🚀 Starting E2E test: ${testLocation} ${testGenre}`);

      // Step 1: User searches for restaurants
      const searchQuery = {
        location: testLocation,
        genre: testGenre,
        limit: 10,
      };

      console.log('📍 Step 1: Searching for restaurants...');
      const searchResults = await ratingService.searchUnifiedRatings(searchQuery);

      expect(searchResults.length).toBeGreaterThan(0);
      expect(searchResults.length).toBeLessThanOrEqual(10);

      const firstResult = searchResults[0];
      expect(firstResult.unifiedRating).not.toBeNull();
      expect(firstResult.errors.length).toBe(0);

      console.log(`✅ Found ${searchResults.length} restaurants`);
      console.log(`   First result: ${firstResult.unifiedRating?.aggregatedScore}/5.0`);

      // Step 2: User selects a restaurant for details
      const selectedRestaurant = firstResult.unifiedRating!;
      
      console.log('🏪 Step 2: Getting detailed restaurant information...');
      const detailedRating = await ratingService.getUnifiedRating(selectedRestaurant.restaurantId);

      expect(detailedRating.unifiedRating).not.toBeNull();
      expect(detailedRating.unifiedRating!.platforms.length).toBeGreaterThan(0);

      console.log(`✅ Restaurant details loaded`);
      console.log(`   Platforms: ${detailedRating.unifiedRating!.platforms.map(p => p.platform).join(', ')}`);
      console.log(`   Total reviews: ${detailedRating.unifiedRating!.totalReviews}`);
      console.log(`   Data completeness: ${(detailedRating.unifiedRating!.dataCompleteness * 100).toFixed(1)}%`);

      // Step 3: Verify rating display data quality
      console.log('📊 Step 3: Validating rating data quality...');
      
      const rating = detailedRating.unifiedRating!;
      expect(rating.aggregatedScore).toBeGreaterThan(0);
      expect(rating.aggregatedScore).toBeLessThanOrEqual(5);
      expect(rating.confidence).toBeGreaterThan(0);
      expect(rating.confidence).toBeLessThanOrEqual(1);

      // HotPepper platform should be primary
      const hotpepperData = rating.platforms.find(p => p.platform === 'hotpepper');
      expect(hotpepperData).toBeDefined();

      console.log(`✅ Data quality validated`);
      console.log(`   Aggregated score: ${rating.aggregatedScore}/5.0`);
      console.log(`   Confidence: ${(rating.confidence * 100).toFixed(1)}%`);

      // Step 4: Performance validation
      console.log('⚡ Step 4: Performance validation...');
      expect(detailedRating.processingTime).toBeLessThan(3000); // 3秒以下

      console.log(`✅ Performance validated: ${detailedRating.processingTime}ms`);

    }, E2E_CONFIG.testTimeout);

    it('Cache efficiency journey: Repeated access performance', async () => {
      const testQuery = {
        location: E2E_CONFIG.testLocations[1], // 新宿
        genre: E2E_CONFIG.testGenres[1], // イタリアン
        limit: 5,
      };

      console.log('\n🔄 Testing cache efficiency...');

      // First search (cache miss)
      console.log('📍 First search (cache miss expected)...');
      const startTime1 = Date.now();
      const firstSearch = await ratingService.searchUnifiedRatings(testQuery);
      const firstSearchTime = Date.now() - startTime1;

      expect(firstSearch.length).toBeGreaterThan(0);
      console.log(`✅ First search: ${firstSearchTime}ms, ${firstSearch.length} results`);

      // Second search (cache hit)
      console.log('📍 Second search (cache hit expected)...');
      const startTime2 = Date.now();
      const secondSearch = await ratingService.searchUnifiedRatings(testQuery);
      const secondSearchTime = Date.now() - startTime2;

      expect(secondSearch.length).toBe(firstSearch.length);
      
      // Cache hit should be significantly faster
      expect(secondSearchTime).toBeLessThan(firstSearchTime * 0.5);
      
      console.log(`✅ Second search: ${secondSearchTime}ms (${((firstSearchTime - secondSearchTime) / firstSearchTime * 100).toFixed(1)}% faster)`);

      // Verify cache hit rate
      const cacheStats = cacheService.getCacheStats();
      console.log(`📊 Cache stats: ${cacheStats.totalEntries} entries`);
    });

    it('Rate limiting behavior: User hitting limits gracefully', async () => {
      console.log('\n⏱️ Testing rate limiting behavior...');

      // Reset rate counters for clean test
      ratingService['requestCounts'] = {
        hotpepper: { minute: 0, hour: 0, day: 0, lastReset: { minute: 0, hour: 0, day: 0 } },
        tabelog: { week: 0, lastReset: Date.now() }
      };

      const testRestaurantId = 'rate-limit-test-restaurant';
      let successCount = 0;
      let rateLimitCount = 0;

      // Attempt multiple requests to hit rate limit
      for (let i = 0; i < 5; i++) {
        console.log(`📍 Request ${i + 1}/5...`);
        const result = await ratingService.getUnifiedRating(`${testRestaurantId}-${i}`);
        
        if (result.unifiedRating) {
          successCount++;
          console.log(`   ✅ Success`);
        } else if (result.errors.some(e => e.code === 'RATE_LIMIT_EXCEEDED')) {
          rateLimitCount++;
          console.log(`   ⏳ Rate limited`);
        }
      }

      // Should hit rate limit within 5 requests (2/minute limit)
      expect(rateLimitCount).toBeGreaterThan(0);
      expect(successCount).toBeLessThanOrEqual(2);

      console.log(`✅ Rate limiting working: ${successCount} successful, ${rateLimitCount} rate limited`);

      // Verify graceful degradation
      const usageReport = ratingService.getUsageReport();
      console.log(`📊 Usage: ${usageReport.hotpepper.minute}/2 per minute`);
    });
  });

  describe('🛡️ Error Resilience Journey', () => {
    it('API failure recovery: Graceful fallback to cache', async () => {
      console.log('\n🛡️ Testing error resilience...');

      const testQuery = {
        location: E2E_CONFIG.testLocations[2], // 渋谷
        genre: E2E_CONFIG.testGenres[2], // 寿司
        limit: 3,
      };

      // First, populate cache with successful request
      console.log('📍 Populating cache with successful request...');
      const initialResults = await ratingService.searchUnifiedRatings(testQuery);
      expect(initialResults.length).toBeGreaterThan(0);

      if (initialResults.length > 0 && initialResults[0].unifiedRating) {
        const restaurantId = initialResults[0].unifiedRating.restaurantId;

        // Get detailed rating to ensure it's cached
        const detailedRating = await ratingService.getUnifiedRating(restaurantId);
        expect(detailedRating.unifiedRating).not.toBeNull();

        console.log(`✅ Cache populated for restaurant: ${restaurantId}`);

        // Now simulate API failure by hitting rate limit
        ratingService['requestCounts'].hotpepper.minute = 2; // Hit limit

        console.log('📍 Testing cache fallback when rate limited...');
        const fallbackResult = await ratingService.getUnifiedRating(restaurantId);

        // Should still get result from cache
        expect(fallbackResult.unifiedRating).not.toBeNull();
        expect(fallbackResult.cacheHit || fallbackResult.errors.length === 0).toBe(true);

        console.log(`✅ Graceful fallback successful`);
      }
    });

    it('Partial platform failure: HotPepper-only operation', async () => {
      console.log('\n🔧 Testing partial platform failure...');

      // Simulate Tabelog being unavailable (weekly limit reached)
      ratingService['requestCounts'].tabelog.week = 50;

      const testQuery = {
        location: E2E_CONFIG.testLocations[3], // 池袋
        genre: E2E_CONFIG.testGenres[3], // ラーメン
        limit: 2,
      };

      const results = await ratingService.searchUnifiedRatings(testQuery);

      if (results.length > 0 && results[0].unifiedRating) {
        const rating = results[0].unifiedRating;
        
        // Should have HotPepper data only
        const hotpepperData = rating.platforms.find(p => p.platform === 'hotpepper');
        const tabelogData = rating.platforms.find(p => p.platform === 'tabelog');
        
        expect(hotpepperData).toBeDefined();
        expect(tabelogData).toBeUndefined();

        console.log(`✅ HotPepper-only operation successful`);
        console.log(`   Platforms: ${rating.platforms.map(p => p.platform).join(', ')}`);
      }
    });
  });

  describe('📱 User Experience Journey', () => {
    it('Mobile user simulation: Quick search and browse', async () => {
      console.log('\n📱 Simulating mobile user experience...');

      // Mobile users typically want quick results
      const mobileQuery = {
        location: E2E_CONFIG.testLocations[4], // 銀座
        genre: E2E_CONFIG.testGenres[4], // 中華料理
        limit: 5,
      };

      const startTime = Date.now();
      const results = await ratingService.searchUnifiedRatings(mobileQuery);
      const responseTime = Date.now() - startTime;

      // Mobile performance expectations
      expect(responseTime).toBeLessThan(3000); // 3秒以下
      expect(results.length).toBeGreaterThan(0);
      expect(results.length).toBeLessThanOrEqual(5);

      console.log(`✅ Mobile search: ${responseTime}ms, ${results.length} results`);

      // Quick browse through results
      let browseTime = 0;
      for (let i = 0; i < Math.min(3, results.length); i++) {
        if (results[i].unifiedRating) {
          const browseStart = Date.now();
          const details = await ratingService.getUnifiedRating(results[i].unifiedRating!.restaurantId);
          browseTime += Date.now() - browseStart;
          
          expect(details.unifiedRating).not.toBeNull();
        }
      }

      const avgBrowseTime = browseTime / Math.min(3, results.length);
      expect(avgBrowseTime).toBeLessThan(2000); // 平均2秒以下

      console.log(`✅ Browse performance: ${avgBrowseTime.toFixed(0)}ms average per restaurant`);
    });

    it('Heavy user simulation: Multiple searches and caching benefits', async () => {
      console.log('\n👥 Simulating heavy user activity...');

      const searchPatterns = [
        { location: '東京駅', genre: '居酒屋' },
        { location: '新宿', genre: 'イタリアン' },
        { location: '渋谷', genre: '寿司' },
        { location: '東京駅', genre: '居酒屋' }, // Repeat to test cache
        { location: '新宿', genre: 'イタリアン' }, // Repeat to test cache
      ];

      let totalTime = 0;
      let cacheHits = 0;
      const results = [];

      for (let i = 0; i < searchPatterns.length; i++) {
        const pattern = searchPatterns[i];
        console.log(`📍 Search ${i + 1}: ${pattern.location} ${pattern.genre}`);

        const startTime = Date.now();
        const searchResults = await ratingService.searchUnifiedRatings({
          ...pattern,
          limit: 3,
        });
        const searchTime = Date.now() - startTime;

        totalTime += searchTime;
        results.push({ pattern, time: searchTime, count: searchResults.length });

        // Check if this was likely a cache hit (much faster)
        if (i >= 3 && searchTime < 500) { // Repeat searches should be cached
          cacheHits++;
        }

        console.log(`   ⏱️ ${searchTime}ms, ${searchResults.length} results`);
      }

      const avgTime = totalTime / searchPatterns.length;
      console.log(`✅ Heavy usage completed: ${avgTime.toFixed(0)}ms average, ${cacheHits} cache hits detected`);

      // Performance should improve with caching
      expect(cacheHits).toBeGreaterThan(0);
      expect(avgTime).toBeLessThan(2000);
    });
  });

  describe('🎛️ System Health Monitoring', () => {
    it('Resource usage monitoring during normal operation', async () => {
      console.log('\n🎛️ Monitoring system resources...');

      const initialMemory = process.memoryUsage();
      const initialCacheStats = cacheService.getCacheStats();

      console.log(`📊 Initial memory: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
      console.log(`📊 Initial cache: ${initialCacheStats.totalEntries} entries`);

      // Simulate normal usage pattern
      const operations = [];
      for (let i = 0; i < 10; i++) {
        const location = E2E_CONFIG.testLocations[i % E2E_CONFIG.testLocations.length];
        const genre = E2E_CONFIG.testGenres[i % E2E_CONFIG.testGenres.length];
        
        operations.push(
          ratingService.searchUnifiedRatings({
            location,
            genre,
            limit: 3,
          })
        );
      }

      const results = await Promise.all(operations);
      
      const finalMemory = process.memoryUsage();
      const finalCacheStats = cacheService.getCacheStats();

      console.log(`📊 Final memory: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
      console.log(`📊 Final cache: ${finalCacheStats.totalEntries} entries`);

      const memoryIncrease = (finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024;
      console.log(`📊 Memory increase: ${memoryIncrease.toFixed(2)}MB`);

      // Memory usage should be reasonable
      expect(memoryIncrease).toBeLessThan(50); // Less than 50MB increase
      expect(finalMemory.heapUsed / 1024 / 1024).toBeLessThan(200); // Total less than 200MB

      console.log(`✅ Resource usage within acceptable limits`);
    });

    it('Rate limiting compliance verification', async () => {
      console.log('\n📏 Verifying rate limiting compliance...');

      const report = ratingService.getUsageReport();
      
      console.log(`📊 Current usage:`);
      console.log(`   HotPepper: ${report.hotpepper.minute}/2 per minute, ${report.hotpepper.day}/300 per day`);
      console.log(`   Tabelog: ${report.tabelog.week}/50 per week`);

      // Verify limits are respected
      expect(report.hotpepper.minute).toBeLessThanOrEqual(report.limits.hotpepper.requestsPerMinute);
      expect(report.hotpepper.hour).toBeLessThanOrEqual(report.limits.hotpepper.requestsPerHour);
      expect(report.hotpepper.day).toBeLessThanOrEqual(report.limits.hotpepper.requestsPerDay);
      expect(report.tabelog.week).toBeLessThanOrEqual(report.limits.tabelog.weeklyLimit);

      console.log(`✅ All rate limits within compliance`);
    });
  });
});