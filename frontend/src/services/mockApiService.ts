/**
 * Mock API Service
 * 開発環境用のモックAPIサービス - より充実したデータを提供
 */

import { SearchQuery, EvaluationResult } from '@types/restaurant';

interface MockRestaurant {
  id: string;
  name: string;
  genre: string;
  address: string;
  rating: number;
  reviewCount: number;
  priceRange: {
    min: number;
    max: number;
  };
  coordinates: {
    lat: number;
    lng: number;
  };
  features: string[];
  imageUrl?: string;
  description: string;
}

// 地域別の基本座標
const AREA_COORDINATES: Record<string, { lat: number; lng: number }> = {
  '東京駅': { lat: 35.6812, lng: 139.7671 },
  '新宿': { lat: 35.6896, lng: 139.6917 },
  '渋谷': { lat: 35.6598, lng: 139.7006 },
  '池袋': { lat: 35.7295, lng: 139.7109 },
  '銀座': { lat: 35.6762, lng: 139.7653 },
  '品川': { lat: 35.6284, lng: 139.7387 },
  '上野': { lat: 35.7142, lng: 139.7773 },
  '六本木': { lat: 35.6627, lng: 139.7314 },
  '表参道': { lat: 35.6657, lng: 139.7128 },
  '恵比寿': { lat: 35.6464, lng: 139.7100 },
  '浅草': { lat: 35.7148, lng: 139.7967 },
  '秋葉原': { lat: 35.7022, lng: 139.7744 },
  '神田': { lat: 35.6916, lng: 139.7703 },
  '有楽町': { lat: 35.6751, lng: 139.7637 },
  '丸の内': { lat: 35.6795, lng: 139.7638 },
};

// ジャンル別のレストラン名パターン
const RESTAURANT_NAMES: Record<string, string[]> = {
  '居酒屋': [
    '寅福', '金の蔵', '魚民', '笑笑', '和民', '白木屋', '月の宴', '千年の宴',
    '山内農場', '坐・和民', 'とりあえず吾平', '庄や', '養老乃瀧', 'つぼ八',
    '鳥貴族', '大衆酒場', '赤提灯', '角打ち', '立ち呑み', '炉端焼き'
  ],
  'イタリアン': [
    'トラットリア', 'オステリア', 'リストランテ', 'ピッツェリア', 'カフェ',
    'ベッラ・ヴィスタ', 'ボーノ', 'プリマヴェーラ', 'マンマ・ミーア',
    'ダ・ジュゼッペ', 'イル・ソーレ', 'ラ・テラッツァ', 'カンティーナ'
  ],
  '中華料理': [
    '北京飯店', '上海軒', '四川飯店', '広東', '龍門', '福臨門', '聘珍楼',
    '東天紅', '重慶飯店', '萬里', '麒麟', '天龍', '金龍', '白龍', '青龍'
  ],
  'フレンチ': [
    'ル・', 'ラ・', 'レストラン', 'ビストロ', 'ブラッスリー', 'シェ',
    'マノワール', 'シャトー', 'プティ', 'グラン', 'ボン・ヴィヴァン'
  ],
  'カフェ': [
    'スターバックス', 'ドトール', 'タリーズ', 'エクセルシオール',
    'ベローチェ', 'プロント', 'カフェ・', 'コーヒーハウス', 'ブックカフェ'
  ],
  '寿司': [
    '鮨', '寿司', '廻転寿司', 'かっぱ寿司', 'スシロー', 'はま寿司',
    '銀座久兵衛', '数寄屋橋次郎', '京樽', '元気寿司', 'がってん寿司'
  ],
  'ラーメン': [
    '一蘭', '一風堂', '博多風龙', 'らーめん', '麺屋', '麺匠', '麺工房',
    '味千ラーメン', '天下一品', '山岡家', 'めん', '麺や'
  ],
  '焼肉': [
    '牛角', '安楽亭', '叙々苑', '大同門', '焼肉キング', 'ワンカルビ',
    '焼肉', 'カルビ', 'ホルモン', '韓国', 'サムギョプサル'
  ]
};

// レストランの特徴
const FEATURES = [
  '個室あり', '座敷あり', '駐車場あり', 'WiFi完備', '禁煙席あり', '分煙',
  'クレジットカード可', 'ランチあり', '夜景がきれい', 'テラス席あり',
  'ペット可', 'バリアフリー', '貸切可能', 'カラオケあり', '飲み放題',
  '食べ放題', 'デリバリー可', 'テイクアウト可', '24時間営業', '深夜営業'
];

class MockApiService {
  private restaurants: MockRestaurant[] = [];

  constructor() {
    this.generateMockRestaurants();
  }

  private generateMockRestaurants() {
    let id = 1;
    
    Object.entries(AREA_COORDINATES).forEach(([area, baseCoords]) => {
      Object.entries(RESTAURANT_NAMES).forEach(([genre, names]) => {
        // 各エリア・ジャンルで10-15店舗生成
        const count = 10 + Math.floor(Math.random() * 6);
        
        for (let i = 0; i < count; i++) {
          const namePattern = names[Math.floor(Math.random() * names.length)];
          const restaurant: MockRestaurant = {
            id: `mock_${id++}`,
            name: `${namePattern} ${area}店`,
            genre,
            address: `東京都${area}${Math.floor(Math.random() * 9) + 1}-${Math.floor(Math.random() * 20) + 1}-${Math.floor(Math.random() * 20) + 1}`,
            rating: 3.0 + Math.random() * 2.0, // 3.0-5.0
            reviewCount: Math.floor(Math.random() * 500) + 20,
            priceRange: this.generatePriceRange(genre),
            coordinates: {
              lat: baseCoords.lat + (Math.random() - 0.5) * 0.02,
              lng: baseCoords.lng + (Math.random() - 0.5) * 0.02,
            },
            features: this.selectRandomFeatures(),
            description: `${area}エリアで人気の${genre}店。${this.generateDescription(genre)}`,
          };
          
          this.restaurants.push(restaurant);
        }
      });
    });

    console.log(`Generated ${this.restaurants.length} mock restaurants`);
  }

  private generatePriceRange(genre: string): { min: number; max: number } {
    const ranges: Record<string, { min: number; max: number }> = {
      '居酒屋': { min: 2000, max: 4000 },
      'イタリアン': { min: 2500, max: 6000 },
      '中華料理': { min: 1500, max: 4000 },
      'フレンチ': { min: 5000, max: 15000 },
      'カフェ': { min: 800, max: 2000 },
      '寿司': { min: 3000, max: 12000 },
      'ラーメン': { min: 700, max: 1500 },
      '焼肉': { min: 2500, max: 8000 },
    };

    const baseRange = ranges[genre] || { min: 2000, max: 5000 };
    const variation = 0.3; // ±30%の変動
    
    return {
      min: Math.floor(baseRange.min * (1 - variation + Math.random() * variation * 2)),
      max: Math.floor(baseRange.max * (1 - variation + Math.random() * variation * 2)),
    };
  }

  private selectRandomFeatures(): string[] {
    const count = 2 + Math.floor(Math.random() * 4); // 2-5個の特徴
    const shuffled = [...FEATURES].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  }

  private generateDescription(genre: string): string {
    const descriptions: Record<string, string[]> = {
      '居酒屋': ['新鮮な魚介と豊富な日本酒が自慢', '活気ある雰囲気で宴会にも最適', 'こだわりの料理とお酒でおもてなし'],
      'イタリアン': ['本格的なイタリア料理を気軽に楽しめる', '石窯で焼く本格ピザが自慢', '厳選されたワインと共に'],
      '中華料理': ['本場の味を日本人好みにアレンジ', '四川の辛さが病みつきになる', '点心から本格料理まで幅広く'],
      'フレンチ': ['シェフの創作料理が楽しめる', '記念日にふさわしい上質な空間', 'ワインとのマリアージュを重視'],
      'カフェ': ['居心地の良い空間でゆったりと', '自家焙煎のコーヒーが自慢', 'スイーツも充実'],
      '寿司': ['新鮮なネタと職人の技術', '回転寿司でも本格的な味', '気軽に楽しめる寿司店'],
      'ラーメン': ['こだわりのスープが自慢', '麺とスープの絶妙なバランス', 'コクのあるスープが人気'],
      '焼肉': ['上質な和牛を良心的価格で', 'ファミリーでも気軽に利用可能', '各種ホルモンも充実'],
    };

    const genreDescriptions = descriptions[genre] || ['美味しい料理でおもてなし'];
    return genreDescriptions[Math.floor(Math.random() * genreDescriptions.length)];
  }

  public async searchRestaurants(query: SearchQuery): Promise<EvaluationResult[]> {
    // 検索フィルタリング
    let filteredRestaurants = [...this.restaurants];

    // 地域フィルタ
    if (query.location) {
      const locationKey = Object.keys(AREA_COORDINATES).find(area => 
        area.includes(query.location!) || query.location!.includes(area)
      );
      
      if (locationKey) {
        const targetCoords = AREA_COORDINATES[locationKey];
        filteredRestaurants = filteredRestaurants.filter(restaurant => {
          const distance = this.calculateDistance(
            restaurant.coordinates,
            targetCoords
          );
          return distance < 2; // 2km圏内
        });
      } else {
        // 名前でのあいまい検索
        filteredRestaurants = filteredRestaurants.filter(restaurant =>
          restaurant.name.includes(query.location!) ||
          restaurant.address.includes(query.location!)
        );
      }
    }

    // ジャンルフィルタ
    if (query.genre) {
      filteredRestaurants = filteredRestaurants.filter(restaurant =>
        restaurant.genre === query.genre ||
        restaurant.genre.includes(query.genre!) ||
        query.genre!.includes(restaurant.genre)
      );
    }

    // 価格フィルタ
    if (query.priceRange) {
      filteredRestaurants = filteredRestaurants.filter(restaurant =>
        restaurant.priceRange.max >= query.priceRange!.min &&
        restaurant.priceRange.min <= query.priceRange!.max
      );
    }

    // ソート
    if (query.sort === 'rating') {
      filteredRestaurants.sort((a, b) => b.rating - a.rating);
    } else if (query.sort === 'price') {
      filteredRestaurants.sort((a, b) => a.priceRange.min - b.priceRange.min);
    }

    // ページネーション
    const limit = query.limit || 50;
    const offset = ((query.page || 1) - 1) * limit;
    const paginatedRestaurants = filteredRestaurants.slice(offset, offset + limit);

    console.log(`Mock API: Found ${filteredRestaurants.length} restaurants, returning ${paginatedRestaurants.length}`);

    // EvaluationResult形式に変換
    return paginatedRestaurants.map(restaurant => ({
      restaurant: {
        id: restaurant.id,
        externalId: restaurant.id,
        platform: 'hotpepper',
        name: restaurant.name,
        genre: restaurant.genre,
        address: restaurant.address,
        priceRange: restaurant.priceRange,
        rating: restaurant.rating,
        reviewCount: restaurant.reviewCount,
        coordinates: restaurant.coordinates,
        features: restaurant.features,
        imageUrl: restaurant.imageUrl,
        openingHours: '11:00-23:00',
        url: `https://hotpepper.jp/mock/${restaurant.id}`,
        fetchedAt: new Date(),
      },
      platforms: [
        {
          platform: 'hotpepper',
          rating: restaurant.rating,
          reviewCount: restaurant.reviewCount,
          confidence: 0.8 + Math.random() * 0.2,
          lastUpdated: new Date(),
        }
      ],
      aggregatedScore: restaurant.rating,
      recommendation: this.getRecommendation(restaurant.rating),
      confidence: 0.8 + Math.random() * 0.2,
      dataCompleteness: 0.7 + Math.random() * 0.3,
      totalReviews: restaurant.reviewCount,
      lastUpdated: new Date(),
    }));
  }

  private calculateDistance(
    coord1: { lat: number; lng: number },
    coord2: { lat: number; lng: number }
  ): number {
    const R = 6371; // 地球の半径 (km)
    const dLat = (coord2.lat - coord1.lat) * Math.PI / 180;
    const dLon = (coord2.lng - coord1.lng) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(coord1.lat * Math.PI / 180) * Math.cos(coord2.lat * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private getRecommendation(rating: number): 'highly_recommended' | 'recommended' | 'suitable' | 'not_recommended' {
    if (rating >= 4.5) return 'highly_recommended';
    if (rating >= 4.0) return 'recommended';
    if (rating >= 3.0) return 'suitable';
    return 'not_recommended';
  }
}

export const mockApiService = new MockApiService();
export default mockApiService;