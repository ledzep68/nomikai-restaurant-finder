const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3002;

app.use(cors({
  origin: ['http://localhost:8090', 'http://localhost:5173', 'http://127.0.0.1:8090'],
  credentials: true
}));

app.use(express.json());

// Mock restaurant data
const mockRestaurants = [
  // 既存のデータ
  {
    id: 1,
    name: '渋谷タワレコ前焼き鳥',
    genre: 'yakitori',
    location: '渋谷',
    address: '東京都渋谷区道玄坂2-6-2',
    phone: '03-1234-5678',
    price_range_min: 2000,
    price_range_max: 4000,
    latitude: 35.659,
    longitude: 139.700,
    avg_rating: 4.2,
    total_reviews: 45
  },
  {
    id: 2,
    name: '新宿韓国料理チング',
    genre: 'korean',
    location: '新宿',
    address: '東京都新宿区歌舞伎町1-1-1',
    phone: '03-2345-6789',
    price_range_min: 3000,
    price_range_max: 5000,
    latitude: 35.694,
    longitude: 139.703,
    avg_rating: 4.5,
    total_reviews: 67
  },
  {
    id: 3,
    name: '六本木タイ料理レストラン',
    genre: 'thai',
    location: '六本木',
    address: '東京都港区六本木6-1-20',
    phone: '03-3456-7890',
    price_range_min: 2500,
    price_range_max: 4500,
    latitude: 35.663,
    longitude: 139.732,
    avg_rating: 4.0,
    total_reviews: 32
  },
  {
    id: 4,
    name: '表参道スイーツカフェ',
    genre: 'sweets',
    location: '表参道',
    address: '東京都渋谷区神宮前4-12-10',
    phone: '03-4567-8901',
    price_range_min: 1000,
    price_range_max: 2500,
    latitude: 35.669,
    longitude: 139.703,
    avg_rating: 4.3,
    total_reviews: 89
  },
  // 追加データ - 和食
  {
    id: 5,
    name: '銀座 鮨処 雅',
    genre: 'sushi',
    location: '銀座',
    address: '東京都中央区銀座4-5-1',
    phone: '03-5678-9012',
    price_range_min: 8000,
    price_range_max: 15000,
    latitude: 35.672,
    longitude: 139.765,
    avg_rating: 4.8,
    total_reviews: 156
  },
  {
    id: 6,
    name: '東京駅 麺屋武蔵',
    genre: 'ramen',
    location: '東京駅',
    address: '東京都千代田区丸の内1-9-1',
    phone: '03-6789-0123',
    price_range_min: 800,
    price_range_max: 1500,
    latitude: 35.681,
    longitude: 139.767,
    avg_rating: 4.1,
    total_reviews: 234
  },
  {
    id: 7,
    name: '浅草 天ぷら大黒',
    genre: 'tempura',
    location: '浅草',
    address: '東京都台東区浅草2-3-1',
    phone: '03-7890-1234',
    price_range_min: 3000,
    price_range_max: 6000,
    latitude: 35.714,
    longitude: 139.797,
    avg_rating: 4.4,
    total_reviews: 78
  },
  {
    id: 8,
    name: '新橋 居酒屋横丁',
    genre: 'izakaya',
    location: '新橋',
    address: '東京都港区新橋2-16-1',
    phone: '03-8901-2345',
    price_range_min: 2500,
    price_range_max: 4000,
    latitude: 35.667,
    longitude: 139.758,
    avg_rating: 3.9,
    total_reviews: 445
  },
  // アジア料理
  {
    id: 9,
    name: '池袋 ベトナム料理フォー',
    genre: 'vietnamese',
    location: '池袋',
    address: '東京都豊島区西池袋1-1-25',
    phone: '03-9012-3456',
    price_range_min: 1500,
    price_range_max: 3000,
    latitude: 35.730,
    longitude: 139.711,
    avg_rating: 4.2,
    total_reviews: 123
  },
  {
    id: 10,
    name: '恵比寿 インドカレー マハラジャ',
    genre: 'indian',
    location: '恵比寿',
    address: '東京都渋谷区恵比寿南1-5-5',
    phone: '03-0123-4567',
    price_range_min: 1000,
    price_range_max: 2500,
    latitude: 35.646,
    longitude: 139.710,
    avg_rating: 4.3,
    total_reviews: 189
  },
  {
    id: 11,
    name: '上野 中華料理 龍門',
    genre: 'chinese',
    location: '上野',
    address: '東京都台東区上野2-7-12',
    phone: '03-1234-5678',
    price_range_min: 2000,
    price_range_max: 4000,
    latitude: 35.711,
    longitude: 139.773,
    avg_rating: 4.0,
    total_reviews: 267
  },
  // 西洋料理
  {
    id: 12,
    name: '赤坂 イタリアン ベラビスタ',
    genre: 'italian',
    location: '赤坂',
    address: '東京都港区赤坂3-8-1',
    phone: '03-2345-6789',
    price_range_min: 3500,
    price_range_max: 7000,
    latitude: 35.676,
    longitude: 139.737,
    avg_rating: 4.5,
    total_reviews: 98
  },
  {
    id: 13,
    name: '六本木 フレンチ ル・ジャルダン',
    genre: 'french',
    location: '六本木',
    address: '東京都港区六本木3-2-1',
    phone: '03-3456-7890',
    price_range_min: 5000,
    price_range_max: 12000,
    latitude: 35.663,
    longitude: 139.732,
    avg_rating: 4.7,
    total_reviews: 76
  },
  {
    id: 14,
    name: '原宿 ハンバーガー ビッグバイト',
    genre: 'hamburger',
    location: '原宿',
    address: '東京都渋谷区神宮前1-8-10',
    phone: '03-4567-8901',
    price_range_min: 1200,
    price_range_max: 2500,
    latitude: 35.670,
    longitude: 139.703,
    avg_rating: 4.1,
    total_reviews: 312
  },
  // 肉料理
  {
    id: 15,
    name: '六本木 焼肉 牛角プレミアム',
    genre: 'yakiniku',
    location: '六本木',
    address: '東京都港区六本木4-10-3',
    phone: '03-5678-9012',
    price_range_min: 3000,
    price_range_max: 8000,
    latitude: 35.662,
    longitude: 139.731,
    avg_rating: 4.4,
    total_reviews: 156
  },
  {
    id: 16,
    name: '品川 ステーキハウス リベラ',
    genre: 'steak',
    location: '品川',
    address: '東京都港区港南2-15-2',
    phone: '03-6789-0123',
    price_range_min: 4000,
    price_range_max: 10000,
    latitude: 35.630,
    longitude: 139.740,
    avg_rating: 4.6,
    total_reviews: 89
  },
  // カフェ・スイーツ
  {
    id: 17,
    name: '吉祥寺 カフェ モカ',
    genre: 'cafe',
    location: '吉祥寺',
    address: '東京都武蔵野市吉祥寺本町1-5-1',
    phone: '03-7890-1234',
    price_range_min: 800,
    price_range_max: 2000,
    latitude: 35.703,
    longitude: 139.580,
    avg_rating: 4.2,
    total_reviews: 234
  },
  {
    id: 18,
    name: '自由が丘 ベーカリー パンドール',
    genre: 'bakery',
    location: '自由が丘',
    address: '東京都目黒区自由が丘2-10-8',
    phone: '03-8901-2345',
    price_range_min: 500,
    price_range_max: 1500,
    latitude: 35.608,
    longitude: 139.668,
    avg_rating: 4.5,
    total_reviews: 167
  },
  // その他
  {
    id: 19,
    name: '渋谷 スペイン料理 エル・トロ',
    genre: 'spanish',
    location: '渋谷',
    address: '東京都渋谷区宇田川町15-1',
    phone: '03-9012-3456',
    price_range_min: 3000,
    price_range_max: 6000,
    latitude: 35.660,
    longitude: 139.699,
    avg_rating: 4.3,
    total_reviews: 87
  },
  {
    id: 20,
    name: '新宿 ビュッフェ オーシャン',
    genre: 'buffet',
    location: '新宿',
    address: '東京都新宿区西新宿2-2-1',
    phone: '03-0123-4567',
    price_range_min: 2500,
    price_range_max: 4000,
    latitude: 35.690,
    longitude: 139.695,
    avg_rating: 3.8,
    total_reviews: 523
  }
];

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Nomikai Restaurant Finder API is running',
    timestamp: new Date().toISOString()
  });
});

// Restaurant search
app.get('/api/restaurants/search', (req, res) => {
  const { location, genre, capacity, priceMin, priceMax, page = 1, limit = 20 } = req.query;
  
  let filteredRestaurants = mockRestaurants;
  
  if (location) {
    filteredRestaurants = filteredRestaurants.filter(r => 
      r.location.includes(location) || r.address.includes(location)
    );
  }
  
  if (genre) {
    filteredRestaurants = filteredRestaurants.filter(r => r.genre === genre);
  }
  
  if (priceMin) {
    filteredRestaurants = filteredRestaurants.filter(r => r.price_range_max >= parseInt(priceMin));
  }
  
  if (priceMax) {
    filteredRestaurants = filteredRestaurants.filter(r => r.price_range_min <= parseInt(priceMax));
  }
  
  const transformedRestaurants = filteredRestaurants.map(r => ({
    restaurant: {
      id: r.id.toString(),
      name: r.name,
      address: r.address,
      phone: r.phone,
      genre: r.genre,
      priceRange: {
        min: r.price_range_min,
        max: r.price_range_max
      },
      location: {
        lat: r.latitude,
        lng: r.longitude
      },
      openingHours: {},
      images: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    totalScore: r.avg_rating * 20,
    confidence: 0.85,
    recommendation: r.avg_rating >= 4.0 ? 'highly_recommended' : 
                   r.avg_rating >= 3.5 ? 'recommended' : 'suitable',
    platformScores: [],
    reviewCount: r.total_reviews,
    lastUpdated: new Date().toISOString()
  }));
  
  res.json({
    data: {
      restaurants: transformedRestaurants,
      meta: {
        totalCount: transformedRestaurants.length,
        page: parseInt(page),
        limit: parseInt(limit),
        platformsUsed: ['mock'],
        searchTime: 50,
        cached: false,
        integratedSearch: false
      },
      attributions: {},
      legalNotices: {
        dataUsage: 'Mock開発データを使用',
        privacyPolicy: '/privacy'
      }
    }
  });
});

// Mock auth
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  if (email === 'test@example.com' && password === 'password') {
    res.json({
      success: true,
      data: {
        user: { id: 1, email: 'test@example.com', createdAt: new Date().toISOString() },
        token: 'mock-jwt-token-12345'
      }
    });
  } else {
    res.status(401).json({ success: false, error: 'Invalid credentials' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Quick Nomikai API Server running on http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/api/health`);
  console.log(`   Search: http://localhost:${PORT}/api/restaurants/search`);
});