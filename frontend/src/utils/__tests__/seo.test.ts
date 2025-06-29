import {
  generateHomeSEO,
  generateSearchSEO,
  generateRestaurantSEO,
  generateFavoritesSEO,
  generateHistorySEO,
  generateBreadcrumbJsonLd,
  DEFAULT_SEO,
} from '../seo';
import type { Restaurant } from '../../types/restaurant';
import type { SearchQuery } from '../../types/search';

describe('SEO Utilities', () => {
  describe('DEFAULT_SEO', () => {
    test('should have correct default values', () => {
      expect(DEFAULT_SEO.title).toBe('呑み会レストラン検索 - 最適な店舗を見つけよう');
      expect(DEFAULT_SEO.description).toContain('ホットペッパーや食べログの評価を総合');
      expect(DEFAULT_SEO.keywords).toContain('呑み会');
      expect(DEFAULT_SEO.keywords).toContain('レストラン');
      expect(DEFAULT_SEO.openGraph?.type).toBe('website');
      expect(DEFAULT_SEO.twitter?.card).toBe('summary_large_image');
    });
  });

  describe('generateHomeSEO', () => {
    test('should generate correct home page SEO config', () => {
      const seo = generateHomeSEO();
      
      expect(seo.title).toBe('呑み会レストラン検索 - 信頼できる評価で最適な店舗選び');
      expect(seo.canonical).toBe('/');
      expect(seo.jsonLd).toBeDefined();
      expect((seo.jsonLd as any)['@type']).toBe('WebSite');
      expect((seo.jsonLd as any).potentialAction).toBeDefined();
      expect((seo.jsonLd as any).potentialAction['@type']).toBe('SearchAction');
    });
  });

  describe('generateSearchSEO', () => {
    test('should generate correct search page SEO with query', () => {
      const query: SearchQuery = {
        location: '渋谷',
        genre: '居酒屋',
      };
      const resultCount = 25;
      
      const seo = generateSearchSEO(query, resultCount);
      
      expect(seo.title).toBe('渋谷の居酒屋検索結果 - 呑み会レストラン検索');
      expect(seo.description).toContain('渋谷エリアの居酒屋を検索');
      expect(seo.description).toContain('25件の');
      expect(seo.keywords).toContain('渋谷');
      expect(seo.keywords).toContain('居酒屋');
      expect(seo.canonical).toContain('location=%E6%B8%8B%E8%B0%B7');
      expect((seo.jsonLd as any)['@type']).toBe('SearchResultsPage');
    });

    test('should handle empty query', () => {
      const query: SearchQuery = {};
      
      const seo = generateSearchSEO(query);
      
      expect(seo.title).toBe('全国のレストラン検索結果 - 呑み会レストラン検索');
      expect(seo.canonical).toContain('location=%E5%85%A8%E5%9B%BD');
    });
  });

  describe('generateRestaurantSEO', () => {
    test('should generate correct restaurant page SEO', () => {
      const restaurant: Restaurant = {
        id: '1',
        name: 'テストレストラン',
        address: '東京都渋谷区渋谷1-1-1',
        phone: '03-1234-5678',
        genre: '居酒屋',
        priceRange: { min: 3000, max: 5000 },
        rating: 4.5,
        image: 'https://example.com/image.jpg',
        url: 'https://example.com',
        description: 'テスト説明文',
      };
      
      const comprehensiveRating = {
        aggregatedScore: 4.2,
        totalReviews: 150,
      };
      
      const seo = generateRestaurantSEO(restaurant, comprehensiveRating);
      
      expect(seo.title).toBe('テストレストラン - 詳細情報と総合評価 | 呑み会レストラン検索');
      expect(seo.description).toContain('テストレストラン');
      expect(seo.description).toContain('東京都渋谷区渋谷1-1-1');
      expect(seo.description).toContain('4.2点');
      expect(seo.canonical).toBe('/restaurant/1');
      expect(seo.openGraph?.type).toBe('restaurant');
      expect(seo.openGraph?.image).toBe('https://example.com/image.jpg');
      
      const jsonLd = seo.jsonLd as any;
      expect(jsonLd['@type']).toBe('Restaurant');
      expect(jsonLd.aggregateRating).toBeDefined();
      expect(jsonLd.aggregateRating.ratingValue).toBe(4.2);
      expect(jsonLd.priceRange).toBe('¥3000-5000');
    });

    test('should handle restaurant without comprehensive rating', () => {
      const restaurant: Restaurant = {
        id: '1',
        name: 'テストレストラン',
        address: '東京都',
        phone: '03-1234-5678',
        genre: '居酒屋',
        rating: 4.5,
      };
      
      const seo = generateRestaurantSEO(restaurant);
      
      expect(seo.description).not.toContain('点');
      expect((seo.jsonLd as any).aggregateRating).toBeUndefined();
    });
  });

  describe('generateFavoritesSEO', () => {
    test('should generate correct favorites page SEO', () => {
      const seo = generateFavoritesSEO();
      
      expect(seo.title).toBe('お気に入りレストラン一覧 - 呑み会レストラン検索');
      expect(seo.description).toContain('保存したお気に入りレストラン');
      expect(seo.canonical).toBe('/favorites');
    });
  });

  describe('generateHistorySEO', () => {
    test('should generate correct history page SEO', () => {
      const seo = generateHistorySEO();
      
      expect(seo.title).toBe('検索履歴 - 呑み会レストラン検索');
      expect(seo.description).toContain('過去の検索履歴');
      expect(seo.canonical).toBe('/history');
    });
  });

  describe('generateBreadcrumbJsonLd', () => {
    test('should generate correct breadcrumb JSON-LD', () => {
      const breadcrumbs = [
        { name: 'ホーム', url: '/' },
        { name: '検索', url: '/search' },
        { name: '渋谷の居酒屋', url: '/search?location=渋谷&genre=居酒屋' },
      ];
      
      const jsonLd = generateBreadcrumbJsonLd(breadcrumbs);
      
      expect(jsonLd['@context']).toBe('https://schema.org');
      expect(jsonLd['@type']).toBe('BreadcrumbList');
      expect(jsonLd.itemListElement).toHaveLength(3);
      expect(jsonLd.itemListElement[0].position).toBe(1);
      expect(jsonLd.itemListElement[0].name).toBe('ホーム');
      expect(jsonLd.itemListElement[2].position).toBe(3);
      expect(jsonLd.itemListElement[2].item).toBe('/search?location=渋谷&genre=居酒屋');
    });
  });
});