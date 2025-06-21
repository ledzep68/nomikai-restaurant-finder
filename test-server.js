const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = 3001;

// CORS setup
app.use(cors({
  origin: ['http://localhost:8090', 'http://localhost:5173', 'http://127.0.0.1:8090'],
  credentials: true
}));

app.use(express.json());

// Simple SQLite connection
const dbPath = path.join(__dirname, 'database', 'nomikai.db');
const db = new sqlite3.Database(dbPath);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Nomikai Restaurant Finder API is running',
    timestamp: new Date().toISOString()
  });
});

// Restaurant search endpoint
app.get('/api/restaurants/search', (req, res) => {
  const { location, genre, capacity, priceMin, priceMax, page = 1, limit = 20 } = req.query;
  
  let query = `
    SELECT r.*, 
           COALESCE(AVG(rv.rating), 0) as avg_rating,
           COALESCE(SUM(rv.review_count), 0) as total_reviews
    FROM restaurants r
    LEFT JOIN reviews rv ON r.id = rv.restaurant_id
    WHERE 1=1
  `;
  
  const params = [];
  
  if (location) {
    query += ` AND r.location LIKE ?`;
    params.push(`%${location}%`);
  }
  
  if (genre) {
    query += ` AND r.genre = ?`;
    params.push(genre);
  }
  
  if (priceMin) {
    query += ` AND r.price_range_min >= ?`;
    params.push(parseInt(priceMin));
  }
  
  if (priceMax) {
    query += ` AND r.price_range_max <= ?`;
    params.push(parseInt(priceMax));
  }
  
  query += `
    GROUP BY r.id
    ORDER BY avg_rating DESC, total_reviews DESC
    LIMIT ? OFFSET ?
  `;
  
  const offset = (parseInt(page) - 1) * parseInt(limit);
  params.push(parseInt(limit), offset);
  
  db.all(query, params, (err, restaurants) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({
        success: false,
        error: 'Database query failed'
      });
    }
    
    // Transform to match frontend expectations
    const transformedRestaurants = restaurants.map(r => ({
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
        createdAt: r.created_at,
        updatedAt: r.updated_at
      },
      totalScore: (r.avg_rating || 0) * 20, // Convert 0-5 to 0-100
      confidence: 0.85,
      recommendation: r.avg_rating >= 4.0 ? 'highly_recommended' : 
                     r.avg_rating >= 3.5 ? 'recommended' :
                     r.avg_rating >= 2.5 ? 'suitable' : 'not_recommended',
      platformScores: [],
      reviewCount: r.total_reviews || 0,
      lastUpdated: new Date().toISOString()
    }));
    
    res.json({
      data: {
        restaurants: transformedRestaurants,
        meta: {
          totalCount: transformedRestaurants.length,
          page: parseInt(page),
          limit: parseInt(limit),
          platformsUsed: ['local'],
          searchTime: 50,
          cached: false,
          integratedSearch: false
        },
        attributions: {},
        legalNotices: {
          dataUsage: 'SQLite開発データベースを使用',
          privacyPolicy: '/privacy'
        }
      }
    });
  });
});

// Restaurant detail endpoint
app.get('/api/restaurants/:id', (req, res) => {
  const { id } = req.params;
  
  const query = `
    SELECT r.*, 
           COALESCE(AVG(rv.rating), 0) as avg_rating,
           COALESCE(SUM(rv.review_count), 0) as total_reviews
    FROM restaurants r
    LEFT JOIN reviews rv ON r.id = rv.restaurant_id
    WHERE r.id = ?
    GROUP BY r.id
  `;
  
  db.get(query, [id], (err, restaurant) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({
        success: false,
        error: 'Database query failed'
      });
    }
    
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        error: 'Restaurant not found'
      });
    }
    
    res.json({
      data: {
        id: restaurant.id.toString(),
        name: restaurant.name,
        address: restaurant.address,
        phone: restaurant.phone,
        genre: restaurant.genre,
        priceRange: {
          min: restaurant.price_range_min,
          max: restaurant.price_range_max
        },
        location: {
          lat: restaurant.latitude,
          lng: restaurant.longitude
        },
        openingHours: {},
        images: [],
        createdAt: restaurant.created_at,
        updatedAt: restaurant.updated_at,
        avgRating: restaurant.avg_rating,
        totalReviews: restaurant.total_reviews
      }
    });
  });
});

// User authentication (mock)
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  if (email === 'test@example.com' && password === 'password') {
    res.json({
      success: true,
      data: {
        user: {
          id: 1,
          email: 'test@example.com',
          createdAt: new Date().toISOString()
        },
        token: 'mock-jwt-token-12345'
      }
    });
  } else {
    res.status(401).json({
      success: false,
      error: 'Invalid credentials'
    });
  }
});

app.post('/api/auth/register', (req, res) => {
  const { email, password } = req.body;
  
  res.json({
    success: true,
    data: {
      user: {
        id: 2,
        email: email,
        createdAt: new Date().toISOString()
      },
      token: 'mock-jwt-token-67890'
    }
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Nomikai Restaurant Finder API Server`);
  console.log(`   Local: http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/api/health`);
  console.log(`   Search: http://localhost:${PORT}/api/restaurants/search`);
  console.log(``);
  console.log(`📊 Database: SQLite (${dbPath})`);
  console.log(`🔄 CORS enabled for frontend development`);
});