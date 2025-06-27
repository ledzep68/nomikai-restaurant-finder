const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const axios = require('axios');
const HotPepperApiClient = require('./hotpepper-api-client');

const app = express();
const PORT = 3003; // New port for integrated API

// CORS setup
app.use(cors({
  origin: ['http://localhost:8090', 'http://localhost:5173', 'http://127.0.0.1:8090', 'http://localhost:8091'],
  credentials: true
}));

app.use(express.json());

// Environment variables (would come from .env in production)
const USE_MOCK_API = process.env.USE_MOCK_API !== 'false';
const HOTPEPPER_API_KEY = process.env.HOTPEPPER_API_KEY;
const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

// Initialize HotPepper API client
let hotpepperClient = null;
if (HOTPEPPER_API_KEY && !USE_MOCK_API) {
  hotpepperClient = new HotPepperApiClient(HOTPEPPER_API_KEY);
  console.log('HotPepper API client initialized');
}

// SQLite database connection
const dbPath = path.join(__dirname, 'database', 'nomikai.db');
const db = new sqlite3.Database(dbPath);

// Mock restaurants data (fallback)
const mockRestaurants = [
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
    total_reviews: 45,
    source: 'mock'
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
    total_reviews: 67,
    source: 'mock'
  }
];

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Nomikai Integrated API Server is running',
    timestamp: new Date().toISOString(),
    mode: USE_MOCK_API ? 'mock' : 'integrated',
    features: {
      hotpepper: !!HOTPEPPER_API_KEY,
      googlePlaces: !!GOOGLE_PLACES_API_KEY,
      cache: true,
      fallback: true
    }
  });
});

// Integrated restaurant search endpoint
app.get('/api/restaurants/integrated-search', async (req, res) => {
  const { location, genre, capacity, priceMin, priceMax, page = 1, limit = 20 } = req.query;
  
  try {
    let allRestaurants = [];
    let platformsUsed = [];
    const startTime = Date.now();

    // If mock mode or no API keys, use mock data
    if (USE_MOCK_API || (!HOTPEPPER_API_KEY && !GOOGLE_PLACES_API_KEY)) {
      console.log('Using mock data for integrated search');
      allRestaurants = mockRestaurants.filter(r => {
        if (location && !r.location.includes(location) && !r.address.includes(location)) return false;
        if (genre && r.genre !== genre) return false;
        if (priceMin && r.price_range_max < parseInt(priceMin)) return false;
        if (priceMax && r.price_range_min > parseInt(priceMax)) return false;
        return true;
      });
      platformsUsed = ['mock'];
    } else {
      // Try to fetch from external APIs
      const apiPromises = [];

      // HotPepper API call
      if (HOTPEPPER_API_KEY && hotpepperClient) {
        apiPromises.push(fetchFromHotPepper({ location, genre, capacity, priceRange: { min: priceMin, max: priceMax } }));
      }

      // Google Places API call  
      if (GOOGLE_PLACES_API_KEY) {
        apiPromises.push(fetchFromGooglePlaces({ location, genre }));
      }

      try {
        const apiResults = await Promise.allSettled(apiPromises);
        
        apiResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            allRestaurants = allRestaurants.concat(result.value.restaurants);
            platformsUsed = platformsUsed.concat(result.value.platform);
          } else {
            console.warn(`API ${index} failed:`, result.reason);
          }
        });

        // If no external data, fallback to mock
        if (allRestaurants.length === 0) {
          console.log('External APIs failed, falling back to mock data');
          allRestaurants = mockRestaurants;
          platformsUsed = ['mock_fallback'];
        }
      } catch (error) {
        console.error('External API error, using mock data:', error);
        allRestaurants = mockRestaurants;
        platformsUsed = ['mock_fallback'];
      }
    }

    // Apply filters and pagination
    let filteredRestaurants = allRestaurants;
    
    if (location) {
      filteredRestaurants = filteredRestaurants.filter(r => 
        r.location?.includes(location) || r.address?.includes(location)
      );
    }
    
    if (genre) {
      filteredRestaurants = filteredRestaurants.filter(r => r.genre === genre);
    }

    // Transform to frontend format
    const transformedRestaurants = filteredRestaurants.map(r => ({
      restaurant: {
        id: r.id?.toString() || Math.random().toString(),
        name: r.name,
        address: r.address,
        phone: r.phone,
        genre: r.genre,
        priceRange: {
          min: r.price_range_min || r.priceMin || 1000,
          max: r.price_range_max || r.priceMax || 5000
        },
        location: {
          lat: r.latitude || r.lat || 35.6762,
          lng: r.longitude || r.lng || 139.6503
        },
        openingHours: r.openingHours || {},
        images: r.images || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        source: r.source || 'external'
      },
      totalScore: (r.avg_rating || r.rating || 4.0) * 20,
      confidence: 0.85,
      recommendation: (r.avg_rating || r.rating || 4.0) >= 4.0 ? 'highly_recommended' : 
                     (r.avg_rating || r.rating || 4.0) >= 3.5 ? 'recommended' : 'suitable',
      platformScores: [{
        platform: r.source || 'integrated',
        score: (r.avg_rating || r.rating || 4.0) * 20,
        weight: 1.0,
        available: true
      }],
      reviewCount: r.total_reviews || r.reviewCount || 0,
      lastUpdated: new Date().toISOString()
    }));

    const searchTime = Date.now() - startTime;

    res.json({
      data: {
        restaurants: transformedRestaurants,
        meta: {
          totalCount: transformedRestaurants.length,
          page: parseInt(page),
          limit: parseInt(limit),
          platformsUsed: platformsUsed,
          searchTime: searchTime,
          cached: false,
          integratedSearch: true
        },
        attributions: getAttributions(platformsUsed),
        legalNotices: {
          dataUsage: 'このサービスは外部APIから取得したデータを利用しています',
          privacyPolicy: '/privacy'
        }
      }
    });

  } catch (error) {
    console.error('Integrated search error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Integrated search failed',
      error: error.message
    });
  }
});

// HotPepper API integration
async function fetchFromHotPepper({ location, genre, capacity, priceRange }) {
  if (!hotpepperClient) {
    console.log('HotPepper API client not available, using fallback');
    return { restaurants: [], platform: 'hotpepper_unavailable' };
  }

  try {
    console.log('Fetching from HotPepper API...', { location, genre, capacity, priceRange });
    
    const restaurants = await hotpepperClient.searchRestaurants({
      location,
      genre,
      budget: priceRange,
      count: 20
    });

    console.log(`HotPepper API returned ${restaurants.length} restaurants`);
    
    return {
      restaurants,
      platform: 'hotpepper'
    };
    
  } catch (error) {
    console.error('HotPepper API error:', error.message);
    
    // フォールバックとしてモックデータを返す
    return {
      restaurants: [
        {
          id: 'hp_fallback_001',
          name: 'HotPepper API エラー時のフォールバック店舗',
          genre: genre || 'japanese',
          address: '東京都中央区銀座1-1-1',
          phone: '03-1111-2222',
          priceRange: {
            min: 2000,
            max: 4000
          },
          location: {
            lat: 35.6762,
            lng: 139.6503
          },
          rating: 4.0,
          reviewCount: 50,
          source: 'hotpepper_fallback',
          error: error.message
        }
      ],
      platform: 'hotpepper_fallback',
      error: error.message
    };
  }
}

// Google Places API integration  
async function fetchFromGooglePlaces({ location, genre }) {
  // This would be the actual Google Places API call
  console.log('Fetching from Google Places API...');
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 700));
  
  return {
    restaurants: [
      {
        id: 'gp_001',
        name: 'Google Places レストラン例',
        genre: genre || 'international',
        location: location || '東京',
        address: '東京都渋谷区渋谷2-2-2',
        phone: '03-2222-3333',
        price_range_min: 1500,
        price_range_max: 3500,
        latitude: 35.6581,
        longitude: 139.7414,
        avg_rating: 4.3,
        total_reviews: 156,
        source: 'google_places'
      }
    ],
    platform: 'google_places'
  };
}

// Get attributions for platforms used
function getAttributions(platforms) {
  const attributions = {};
  
  if (platforms.includes('hotpepper')) {
    attributions.hotpepper = '画像提供：ホットペッパー グルメ';
  }
  
  if (platforms.includes('google_places')) {
    attributions.google_places = 'Powered by Google';
  }
  
  if (platforms.includes('mock') || platforms.includes('mock_fallback')) {
    attributions.mock = 'サンプルデータを使用';
  }
  
  return attributions;
}

// Legacy search endpoint (compatible with existing frontend)
app.get('/api/restaurants/search', async (req, res) => {
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
    recommendation: r.avg_rating >= 4.0 ? 'highly_recommended' : 'recommended',
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

// Mock auth endpoints
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  if (email === 'test@example.com' && password === 'password') {
    res.json({
      success: true,
      data: {
        user: { id: 1, email: 'test@example.com', createdAt: new Date().toISOString() },
        token: 'mock-jwt-token-integrated'
      }
    });
  } else {
    res.status(401).json({ success: false, error: 'Invalid credentials' });
  }
});

app.post('/api/auth/register', (req, res) => {
  const { email, password } = req.body;
  
  res.json({
    success: true,
    data: {
      user: { id: 2, email: email, createdAt: new Date().toISOString() },
      token: 'mock-jwt-token-integrated-new'
    }
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Nomikai Integrated API Server`);
  console.log(`   Local: http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/api/health`);
  console.log(`   Integrated Search: http://localhost:${PORT}/api/restaurants/integrated-search`);
  console.log(`   Mode: ${USE_MOCK_API ? 'Mock' : 'Integrated'}`);
  console.log(`   HotPepper: ${HOTPEPPER_API_KEY ? 'Enabled' : 'Disabled'}`);
  console.log(`   Google Places: ${GOOGLE_PLACES_API_KEY ? 'Enabled' : 'Disabled'}`);
  console.log(``);
  console.log(`📊 Database: SQLite (${dbPath})`);
  console.log(`🔄 CORS enabled for frontend development`);
  console.log(`🎯 Phase 5: External API Integration Ready`);
});

module.exports = app;