import type { Restaurant } from '../types/restaurant';
import type { SearchQuery } from '../types/search';

// SEO設定のインターフェース
export interface SEOConfig {
  title: string;
  description: string;
  keywords?: string[];
  canonical?: string;
  openGraph?: {
    title: string;
    description: string;
    image?: string;
    type?: string;
    url?: string;
  };
  twitter?: {
    card: string;
    title: string;
    description: string;
    image?: string;
  };
  jsonLd?: object;
}

// デフォルトSEO設定
export const DEFAULT_SEO: SEOConfig = {
  title: '呑み会レストラン検索 - 最適な店舗を見つけよう',
  description: 'ホットペッパーや食べログの評価を総合した信頼性の高いレストラン検索サービス。呑み会や宴会に最適な店舗を簡単に見つけられます。',
  keywords: [
    '呑み会',
    'レストラン',
    '居酒屋',
    '宴会',
    'ホットペッパー',
    '食べログ',
    'グルメ',
    '飲食店検索',
    '評価',
    'レビュー'
  ],
  openGraph: {
    title: '呑み会レストラン検索',
    description: 'ホットペッパーや食べログの評価を総合した信頼性の高いレストラン検索サービス',
    type: 'website'
  },
  twitter: {
    card: 'summary_large_image',
    title: '呑み会レストラン検索',
    description: 'ホットペッパーや食べログの評価を総合した信頼性の高いレストラン検索サービス'
  }
};

// ホームページのSEO設定
export const generateHomeSEO = (): SEOConfig => ({
  ...DEFAULT_SEO,
  title: '呑み会レストラン検索 - 信頼できる評価で最適な店舗選び',
  description: '複数のグルメサイトの評価を統合し、信頼性の高いレストラン情報を提供。呑み会や宴会に最適な店舗を効率的に見つけられる検索サービスです。',
  canonical: '/',
  jsonLd: {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    'name': '呑み会レストラン検索',
    'description': '複数のグルメサイトの評価を統合したレストラン検索サービス',
    'url': process.env.NODE_ENV === 'production' ? 'https://nomikai-finder.com' : 'http://localhost:5173',
    'potentialAction': {
      '@type': 'SearchAction',
      'target': {
        '@type': 'EntryPoint',
        'urlTemplate': '/search?q={search_term_string}'
      },
      'query-input': 'required name=search_term_string'
    }
  }
});

// 検索ページのSEO設定
export const generateSearchSEO = (query: SearchQuery, resultCount?: number): SEOConfig => {
  const location = query.location || '全国';
  const genre = query.genre || 'レストラン';
  const title = `${location}の${genre}検索結果 - 呑み会レストラン検索`;
  const description = `${location}エリアの${genre}を検索。${resultCount ? `${resultCount}件の` : ''}信頼性の高い評価データでお店選びをサポートします。`;

  return {
    ...DEFAULT_SEO,
    title,
    description,
    keywords: [
      ...DEFAULT_SEO.keywords!,
      location,
      genre,
      '検索結果'
    ],
    canonical: `/search?location=${encodeURIComponent(location)}&genre=${encodeURIComponent(genre)}`,
    openGraph: {
      ...DEFAULT_SEO.openGraph!,
      title,
      description
    },
    twitter: {
      ...DEFAULT_SEO.twitter!,
      title,
      description
    },
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'SearchResultsPage',
      'name': title,
      'description': description,
      'mainEntity': {
        '@type': 'ItemList',
        'numberOfItems': resultCount || 0
      }
    }
  };
};

// レストラン詳細ページのSEO設定
export const generateRestaurantSEO = (restaurant: Restaurant, comprehensiveRating?: any): SEOConfig => {
  const title = `${restaurant.name} - 詳細情報と総合評価 | 呑み会レストラン検索`;
  const description = `${restaurant.name}の詳細情報。${restaurant.address || ''}。複数サイトの評価を統合した総合評価${comprehensiveRating?.aggregatedScore ? `${comprehensiveRating.aggregatedScore.toFixed(1)}点` : ''}で信頼性の高い情報を提供。`;

  return {
    ...DEFAULT_SEO,
    title,
    description,
    keywords: [
      ...DEFAULT_SEO.keywords!,
      restaurant.name,
      restaurant.genre || '',
      restaurant.address?.split(/[都道府県市区町村]/)[0] || '',
      '詳細情報'
    ].filter(Boolean),
    canonical: `/restaurant/${restaurant.id}`,
    openGraph: {
      ...DEFAULT_SEO.openGraph!,
      title,
      description,
      type: 'restaurant',
      image: (restaurant as any).imageUrl || restaurant.images?.[0]
    },
    twitter: {
      ...DEFAULT_SEO.twitter!,
      title,
      description,
      image: (restaurant as any).imageUrl || restaurant.images?.[0]
    },
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'Restaurant',
      'name': restaurant.name,
      'description': restaurant.description || description,
      'image': (restaurant as any).imageUrl || restaurant.images?.[0],
      'address': restaurant.address,
      'telephone': restaurant.phone,
      'url': (restaurant as any).website || (restaurant as any).url,
      'priceRange': restaurant.priceRange ? `¥${restaurant.priceRange.min}-${restaurant.priceRange.max}` : undefined,
      'aggregateRating': comprehensiveRating ? {
        '@type': 'AggregateRating',
        'ratingValue': comprehensiveRating.aggregatedScore,
        'bestRating': 5,
        'ratingCount': comprehensiveRating.totalReviews || 1
      } : undefined,
      'geo': (restaurant as any).coordinates ? {
        '@type': 'GeoCoordinates',
        'latitude': (restaurant as any).coordinates.lat,
        'longitude': (restaurant as any).coordinates.lng
      } : undefined
    }
  };
};

// お気に入りページのSEO設定
export const generateFavoritesSEO = (): SEOConfig => ({
  ...DEFAULT_SEO,
  title: 'お気に入りレストラン一覧 - 呑み会レストラン検索',
  description: '保存したお気に入りレストランの一覧。気になる店舗をまとめて管理し、次回の呑み会計画に活用しましょう。',
  canonical: '/favorites',
  openGraph: {
    ...DEFAULT_SEO.openGraph!,
    title: 'お気に入りレストラン一覧',
    description: '保存したお気に入りレストランの一覧'
  },
  twitter: {
    ...DEFAULT_SEO.twitter!,
    title: 'お気に入りレストラン一覧',
    description: '保存したお気に入りレストランの一覧'
  }
});

// 検索履歴ページのSEO設定
export const generateHistorySEO = (): SEOConfig => ({
  ...DEFAULT_SEO,
  title: '検索履歴 - 呑み会レストラン検索',
  description: '過去の検索履歴を確認し、再検索や検索パターンの分析ができます。効率的なレストラン探しをサポートします。',
  canonical: '/history',
  openGraph: {
    ...DEFAULT_SEO.openGraph!,
    title: '検索履歴',
    description: '過去の検索履歴を確認し、再検索や検索パターンの分析ができます'
  },
  twitter: {
    ...DEFAULT_SEO.twitter!,
    title: '検索履歴',
    description: '過去の検索履歴を確認し、再検索や検索パターンの分析ができます'
  }
});

// パンくずリスト生成
export const generateBreadcrumbJsonLd = (breadcrumbs: Array<{ name: string; url: string }>) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  'itemListElement': breadcrumbs.map((item, index) => ({
    '@type': 'ListItem',
    'position': index + 1,
    'name': item.name,
    'item': item.url
  }))
});

// サイトマップ用のURL生成
export const generateSitemapUrls = () => {
  const baseUrl = process.env.NODE_ENV === 'production' 
    ? 'https://nomikai-finder.com' 
    : 'http://localhost:5173';

  return {
    static: [
      { url: `${baseUrl}/`, priority: 1.0, changefreq: 'daily' },
      { url: `${baseUrl}/search`, priority: 0.9, changefreq: 'daily' },
      { url: `${baseUrl}/favorites`, priority: 0.7, changefreq: 'weekly' },
      { url: `${baseUrl}/history`, priority: 0.6, changefreq: 'weekly' }
    ],
    dynamic: {
      restaurants: (restaurantIds: string[]) => 
        restaurantIds.map(id => ({
          url: `${baseUrl}/restaurant/${id}`,
          priority: 0.8,
          changefreq: 'weekly'
        })),
      searches: (searchQueries: Array<{ location: string; genre: string }>) =>
        searchQueries.map(query => ({
          url: `${baseUrl}/search?location=${encodeURIComponent(query.location)}&genre=${encodeURIComponent(query.genre)}`,
          priority: 0.7,
          changefreq: 'daily'
        }))
    }
  };
};

// robots.txt生成
export const generateRobotsTxt = () => {
  const baseUrl = process.env.NODE_ENV === 'production' 
    ? 'https://nomikai-finder.com' 
    : 'http://localhost:5173';

  return `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /private/

# Sitemap
Sitemap: ${baseUrl}/sitemap.xml

# Crawl-delay for respectful crawling
Crawl-delay: 1`;
};