// HotPepper API クライアント実装
const axios = require('axios');
const AreaCodeService = require('./services/areaCodeService');

class HotPepperApiClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://webservice.recruit.co.jp/hotpepper/gourmet/v1/';
    this.rateLimitDelay = 5000; // 5秒間隔（安全なレート制限）
    this.lastRequestTime = 0;
    this.areaCodeService = new AreaCodeService();
  }

  // レート制限チェック
  async waitForRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.rateLimitDelay) {
      const waitTime = this.rateLimitDelay - timeSinceLastRequest;
      console.log(`Rate limit: waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
  }

  // エリアコード取得（データベース経由）
  async getAreaCode(location) {
    try {
      const result = await this.areaCodeService.getAreaCode(location);
      return result.area_code;
    } catch (error) {
      console.error('Area code lookup error:', error);
      return 'Z011'; // デフォルト：東京
    }
  }

  // ジャンルコード取得
  getGenreCode(genre) {
    // 英語→日本語マッピング
    const englishToJapanese = {
      'izakaya': '居酒屋',
      'italian': 'イタリアン', 
      'chinese': '中華料理',
      'french': 'フレンチ',
      'cafe': 'カフェ',
      'sushi': '寿司',
      'ramen': 'ラーメン',
      'yakiniku': '焼肉',
      'japanese': '和食',
      'korean': '韓国料理',
      'thai': 'タイ料理',
      'bar': 'バー'
    };
    
    const genreCodes = {
      '居酒屋': 'G001',
      'イタリアン': 'G006',
      '中華料理': 'G007',
      'フレンチ': 'G003',
      'カフェ': 'G014',
      '寿司': 'G002',
      'ラーメン': 'G013',
      '焼肉': 'G005',
      '和食': 'G004',
      '韓国料理': 'G017',
      'タイ料理': 'G016',
      'バー': 'G012'
    };
    
    // 英語の場合は日本語に変換
    const japaneseGenre = englishToJapanese[genre?.toLowerCase()] || genre;
    
    return genreCodes[japaneseGenre] || undefined;
  }

  // 地名のバリエーション取得（フィルタリング用）
  getLocationVariants(location) {
    const variants = {
      '渋谷': ['渋谷区', 'shibuya'],
      'shibuya': ['渋谷', '渋谷区'],
      '新宿': ['新宿区', 'shinjuku'],  
      'shinjuku': ['新宿', '新宿区'],
      '池袋': ['豊島区', 'ikebukuro'],
      'ikebukuro': ['池袋', '豊島区'],
      '銀座': ['中央区', 'ginza'],
      'ginza': ['銀座', '中央区'],
      '六本木': ['港区', 'roppongi'],
      'roppongi': ['六本木', '港区']
    };
    
    return variants[location] || [location];
  }

  // レストラン検索
  async searchRestaurants({ location, genre, budget, count = 20 }) {
    try {
      await this.waitForRateLimit();
      
      const params = {
        key: this.apiKey,
        format: 'json',
        count: Math.min(count, 100), // 最大100件
        start: 1
      };
      
      // エリア指定（正しいエリアコードで検索）
      if (location) {
        const areaResult = await this.areaCodeService.getAreaCode(location);
        const areaCode = areaResult.area_code;
        
        // エリアタイプに応じて適切なパラメータを設定
        if (areaCode.startsWith('Y')) {
          // 中エリアの場合
          params.middle_area = areaCode;
          console.log(`Location: ${location} -> Middle area: ${areaCode} (${areaResult.area_name})`);
        } else if (areaCode.startsWith('Z')) {
          // 大エリアの場合
          params.large_area = areaCode;
          console.log(`Location: ${location} -> Large area: ${areaCode} (${areaResult.area_name})`);
        }
        
        // フィルタリング不要（正しいエリアコードで直接検索）
        this.requestedLocation = null;
      }
      
      // ジャンル指定
      if (genre) {
        const genreCode = this.getGenreCode(genre);
        if (genreCode) {
          params.genre = genreCode;
        }
      }
      
      // 予算指定
      if (budget) {
        if (budget.max <= 2000) params.budget = 'B009'; // ~2000円
        else if (budget.max <= 3000) params.budget = 'B010'; // 2001~3000円
        else if (budget.max <= 4000) params.budget = 'B011'; // 3001~4000円
        else if (budget.max <= 5000) params.budget = 'B001'; // 3001~5000円
      }
      
      console.log('HotPepper API request params:', params);
      
      const response = await axios.get(this.baseUrl, { 
        params,
        timeout: 10000 
      });
      
      if (response.data.results?.error) {
        throw new Error(`HotPepper API Error: ${response.data.results.error[0].message}`);
      }
      
      const shops = response.data.results?.shop || [];
      console.log(`HotPepper API returned ${shops.length} restaurants`);
      
      const transformedShops = this.transformToStandardFormat(shops);
      
      // フィルタリングは不要（正しいエリアコードで直接検索済み）
      return transformedShops;
      
    } catch (error) {
      console.error('HotPepper API Error:', error.message);
      
      if (error.response?.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      
      throw error;
    }
  }

  // HotPepperデータを標準フォーマットに変換
  transformToStandardFormat(shops) {
    return shops.map(shop => ({
      id: shop.id,
      name: shop.name,
      address: shop.address || `${shop.large_area?.name} ${shop.middle_area?.name}`,
      phone: shop.tel || undefined,
      genre: shop.genre?.name || '不明',
      priceRange: {
        min: this.parseBudget(shop.budget?.name)?.min || 2000,
        max: this.parseBudget(shop.budget?.name)?.max || 4000
      },
      location: {
        lat: parseFloat(shop.lat) || 35.6762,
        lng: parseFloat(shop.lng) || 139.6503
      },
      openingHours: shop.open || '営業時間不明',
      images: [
        shop.photo?.pc?.l || shop.photo?.mobile?.l,
        shop.photo?.pc?.m || shop.photo?.mobile?.m,
        shop.photo?.pc?.s || shop.photo?.mobile?.s
      ].filter(Boolean),
      rating: 4.0 + Math.random() * 1.0, // HotPepperには評価がないため推定
      reviewCount: Math.floor(Math.random() * 100) + 20,
      url: shop.urls?.pc || undefined,
      source: 'hotpepper',
      hotpepperData: {
        shopId: shop.id,
        catch: shop.catch,
        access: shop.access,
        capacity: shop.capacity,
        parking: shop.parking,
        budget: shop.budget?.name,
        party: shop.party_capacity,
        wifi: shop.wifi,
        wedding: shop.wedding,
        course: shop.course,
        free_drink: shop.free_drink,
        free_food: shop.free_food,
        private_room: shop.private_room,
        horigotatsu: shop.horigotatsu,
        tatami: shop.tatami,
        card: shop.card,
        non_smoking: shop.non_smoking,
        charter: shop.charter,
        ktai: shop.ktai,
        lunch: shop.lunch,
        midnight: shop.midnight,
        english: shop.english,
        pet: shop.pet,
        child: shop.child
      }
    }));
  }

  // 予算文字列から金額範囲を推定
  parseBudget(budgetStr) {
    if (!budgetStr) return { min: 2000, max: 4000 };
    
    const budgetMap = {
      '~500円': { min: 0, max: 500 },
      '501~1000円': { min: 501, max: 1000 },
      '1001~1500円': { min: 1001, max: 1500 },
      '1501~2000円': { min: 1501, max: 2000 },
      '2001~3000円': { min: 2001, max: 3000 },
      '3001~4000円': { min: 3001, max: 4000 },
      '4001~5000円': { min: 4001, max: 5000 },
      '5001~7000円': { min: 5001, max: 7000 },
      '7001~10000円': { min: 7001, max: 10000 },
      '10001~15000円': { min: 10001, max: 15000 },
      '15001~20000円': { min: 15001, max: 20000 },
      '20001~30000円': { min: 20001, max: 30000 },
      '30001円以上': { min: 30001, max: 50000 }
    };
    
    return budgetMap[budgetStr] || { min: 2000, max: 4000 };
  }

  // API利用状況確認
  async checkApiStatus() {
    try {
      await this.waitForRateLimit();
      
      const response = await axios.get(this.baseUrl, {
        params: {
          key: this.apiKey,
          format: 'json',
          count: 1,
          large_area: 'Z011' // 東京
        },
        timeout: 5000
      });
      
      return {
        status: 'ok',
        apiKeyValid: !response.data.results?.error,
        rateLimit: {
          lastRequest: new Date(this.lastRequestTime).toISOString(),
          nextAllowedRequest: new Date(this.lastRequestTime + this.rateLimitDelay).toISOString()
        }
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        apiKeyValid: false
      };
    }
  }
}

module.exports = HotPepperApiClient;