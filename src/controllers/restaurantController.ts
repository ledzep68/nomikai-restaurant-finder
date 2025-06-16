import { Router, Request, Response } from 'express';
import { query, param, validationResult } from 'express-validator';
import { RestaurantService } from '@/services/restaurantService';
import { asyncHandler, createError } from '@/middleware/errorHandler';
import { optionalAuth, AuthenticatedRequest } from '@/middleware/auth';

const router = Router();
const restaurantService = new RestaurantService();

const validateSearch = [
  query('genre').optional().isString().trim(),
  query('location').optional().isString().trim(),
  query('priceRange').optional().isIn(['low', 'medium', 'high']),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('offset').optional().isInt({ min: 0 }).toInt(),
];

const validateRestaurantId = [
  param('id').isInt({ min: 1 }).toInt(),
];

const handleValidationErrors = (req: Request, res: Response, next: Function): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: errors.array(),
    });
    return;
  }
  next();
};

router.get('/search', validateSearch, handleValidationErrors, optionalAuth, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { genre, location, priceRange, limit, offset, useIntegrated } = req.query;
  
  const userSession = req.user?.userId.toString() || req.ip || 'anonymous';

  // Use integrated search by default, fallback to local if requested or if location is missing
  const shouldUseIntegrated = useIntegrated !== 'false' && location;

  if (shouldUseIntegrated) {
    const result = await restaurantService.searchRestaurantsIntegrated(
      {
        genre: genre as string,
        location: location as string,
        priceRange: priceRange as string,
        limit: limit as number,
        offset: offset as number,
      },
      userSession
    );

    res.status(200).json({
      status: 'success',
      message: 'Restaurants retrieved successfully via integrated search',
      data: {
        restaurants: result.restaurants,
        pagination: {
          limit: limit || 20,
          offset: offset || 0,
          total: result.totalAvailable,
        },
        meta: {
          platformsUsed: result.platformsUsed,
          searchTime: result.searchTime,
          cached: result.cached,
          integratedSearch: true,
        },
      },
    });
  } else {
    const restaurants = await restaurantService.searchRestaurants(
      {
        genre: genre as string,
        location: location as string,
        priceRange: priceRange as string,
        limit: limit as number,
        offset: offset as number,
      },
      userSession
    );

    res.status(200).json({
      status: 'success',
      message: 'Restaurants retrieved successfully via local search',
      data: {
        restaurants,
        pagination: {
          limit: limit || 20,
          offset: offset || 0,
          total: restaurants.length,
        },
        meta: {
          platformsUsed: ['local'],
          integratedSearch: false,
        },
      },
    });
  }
}));

router.get('/:id', validateRestaurantId, handleValidationErrors, asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const restaurant = await restaurantService.getRestaurantById(parseInt(id));

  if (!restaurant) {
    throw createError('Restaurant not found', 404);
  }

  res.status(200).json({
    status: 'success',
    message: 'Restaurant retrieved successfully',
    data: restaurant,
  });
}));

router.post('/:id/evaluate', validateRestaurantId, handleValidationErrors, optionalAuth, asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.userId;

  const evaluation = await restaurantService.evaluateRestaurant(
    parseInt(id),
    userId
  );

  res.status(200).json({
    status: 'success',
    message: 'Restaurant evaluation completed',
    data: evaluation,
  });
}));

export { router as restaurantRouter };