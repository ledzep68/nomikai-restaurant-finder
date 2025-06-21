import { Router } from 'express';
import { RestaurantService } from '@/services/restaurantService';
import { asyncHandler } from '@/middleware/asyncHandler';
import { authenticateToken } from '@/middleware/auth';
import { sanitizeInput } from '@/middleware/sanitization';
import { validateRequest } from '@/middleware/validation';
import { body, query, param } from 'express-validator';

const router = Router();
const restaurantService = new RestaurantService();

// Apply sanitization to all routes
router.use(sanitizeInput);

/**
 * Search restaurants with integrated external APIs
 * GET /api/restaurants/integrated-search
 */
router.get(
  '/integrated-search',
  [
    query('location').notEmpty().withMessage('Location is required'),
    query('genre').optional().isString(),
    query('priceRange').optional().isIn(['low', 'medium', 'high']),
    query('capacity').optional().isInt({ min: 1 }),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  validateRequest,
  asyncHandler(async (req, res) => {
    const userSession = req.headers['x-session-id'] as string;
    
    const result = await restaurantService.searchRestaurantsIntegrated(
      {
        location: req.query.location as string,
        genre: req.query.genre as string,
        priceRange: req.query.priceRange as string,
        limit: parseInt(req.query.limit as string) || 20,
        offset: ((parseInt(req.query.page as string) || 1) - 1) * (parseInt(req.query.limit as string) || 20),
      },
      userSession
    );

    res.json({
      status: 'success',
      data: result,
    });
  })
);

/**
 * Search restaurants (local database)
 * GET /api/restaurants/search
 */
router.get(
  '/search',
  [
    query('location').optional().isString(),
    query('genre').optional().isString(),
    query('priceMin').optional().isInt({ min: 0 }),
    query('priceMax').optional().isInt({ min: 0 }),
    query('capacity').optional().isInt({ min: 1 }),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  validateRequest,
  asyncHandler(async (req, res) => {
    const restaurants = await restaurantService.searchRestaurants({
      location: req.query.location as string,
      genre: req.query.genre as string,
      priceRange: req.query.priceMin && req.query.priceMax ? {
        min: parseInt(req.query.priceMin as string),
        max: parseInt(req.query.priceMax as string),
      } : undefined,
      capacity: req.query.capacity ? parseInt(req.query.capacity as string) : undefined,
      limit: parseInt(req.query.limit as string) || 20,
      offset: ((parseInt(req.query.page as string) || 1) - 1) * (parseInt(req.query.limit as string) || 20),
    });

    res.json({
      status: 'success',
      data: {
        restaurants,
        meta: {
          totalCount: restaurants.length,
          page: parseInt(req.query.page as string) || 1,
          limit: parseInt(req.query.limit as string) || 20,
        },
      },
    });
  })
);

/**
 * Get restaurant by ID
 * GET /api/restaurants/:id
 */
router.get(
  '/:id',
  [param('id').isInt().withMessage('Invalid restaurant ID')],
  validateRequest,
  asyncHandler(async (req, res) => {
    const restaurant = await restaurantService.getRestaurantById(
      parseInt(req.params.id)
    );

    res.json({
      status: 'success',
      data: restaurant,
    });
  })
);

/**
 * Evaluate restaurant (requires authentication)
 * POST /api/restaurants/:id/evaluate
 */
router.post(
  '/:id/evaluate',
  authenticateToken,
  [
    param('id').isInt().withMessage('Invalid restaurant ID'),
    body('rating').isFloat({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    body('comment').optional().isString().isLength({ max: 1000 }),
  ],
  validateRequest,
  asyncHandler(async (req, res) => {
    const userId = (req as any).user.id;
    const restaurantId = parseInt(req.params.id);
    
    const evaluation = await restaurantService.evaluateRestaurant(
      restaurantId,
      userId
    );

    res.json({
      status: 'success',
      data: evaluation,
    });
  })
);

/**
 * Get user's search history
 * GET /api/restaurants/history
 */
router.get(
  '/history',
  asyncHandler(async (req, res) => {
    const userSession = req.headers['x-session-id'] as string || 'anonymous';
    
    const history = await restaurantService.getSearchHistory(userSession);

    res.json({
      status: 'success',
      data: history,
    });
  })
);

export default router;