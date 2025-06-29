import { Router, Request, Response } from 'express';
import { param, validationResult } from 'express-validator';
import { ComprehensiveRatingService } from '@/services/comprehensiveRatingService';
import { asyncHandler, createError } from '@/middleware/errorHandler';
import { requireSanitization } from '@/middleware/sanitization';
import { optionalAuth, AuthenticatedRequest } from '@/middleware/auth';
import { ApiUsageMonitor } from '@/services/apiUsageMonitor';

const router = Router();
const comprehensiveRatingService = new ComprehensiveRatingService();
const apiUsageMonitor = new ApiUsageMonitor();

const validateRestaurantId = [
  param('restaurantId').isString().trim().notEmpty(),
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

/**
 * GET /api/restaurants/:restaurantId/comprehensive-rating
 * 指定レストランの総合評価を取得
 */
router.get(
  '/:restaurantId/comprehensive-rating',
  validateRestaurantId,
  handleValidationErrors,
  requireSanitization,
  optionalAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { restaurantId } = req.params;
    const { refresh } = req.query;
    
    try {
      // API使用量を記録
      await apiUsageMonitor.recordApiUsage('hotpepper');
      
      // 総合評価データを取得
      const ratingData = await comprehensiveRatingService.getComprehensiveRating(
        restaurantId,
        refresh === 'true'
      );
      
      res.status(200).json({
        status: 'success',
        data: ratingData,
        meta: {
          cached: !refresh,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error('Failed to get comprehensive rating:', error);
      
      // エラーハンドリング
      if (error.message === '総合評価の取得に失敗しました') {
        throw createError('Failed to retrieve comprehensive rating', 503);
      }
      
      throw createError('Internal server error', 500);
    }
  })
);

/**
 * GET /api/restaurants/:restaurantId/rating-details
 * より詳細な評価情報を取得（認証必須）
 */
router.get(
  '/:restaurantId/rating-details',
  validateRestaurantId,
  handleValidationErrors,
  requireSanitization,
  optionalAuth,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { restaurantId } = req.params;
    
    try {
      // API使用可能性をチェック
      const canUseHotPepper = await apiUsageMonitor.canUseApi('hotpepper');
      const canUseTabelog = await apiUsageMonitor.canUseApi('tabelog');
      
      if (!canUseHotPepper.allowed && !canUseTabelog.allowed) {
        return res.status(429).json({
          status: 'error',
          message: 'API rate limits exceeded',
          data: {
            hotpepper: canUseHotPepper,
            tabelog: canUseTabelog,
          },
        });
      }
      
      // 詳細評価データを取得
      const ratingData = await comprehensiveRatingService.getComprehensiveRating(
        restaurantId,
        false
      );
      
      // プラットフォーム別の詳細情報を追加
      const detailedData = {
        ...ratingData,
        platformDetails: ratingData.platformRatings.map(platform => ({
          ...platform,
          canRefresh: platform.platform === 'hotpepper' ? canUseHotPepper.allowed : canUseTabelog.allowed,
          rateLimitInfo: platform.platform === 'hotpepper' ? canUseHotPepper : canUseTabelog,
        })),
      };
      
      res.status(200).json({
        status: 'success',
        data: detailedData,
        meta: {
          timestamp: new Date().toISOString(),
          apiUsage: {
            hotpepper: canUseHotPepper,
            tabelog: canUseTabelog,
          },
        },
      });
    } catch (error) {
      console.error('Failed to get rating details:', error);
      throw createError('Failed to retrieve rating details', 500);
    }
  })
);

/**
 * POST /api/admin/ratings/batch-update
 * 複数レストランの評価を一括更新（管理者用）
 */
router.post(
  '/admin/ratings/batch-update',
  requireSanitization,
  asyncHandler(async (req: Request, res: Response) => {
    const { restaurantIds } = req.body;
    
    if (!Array.isArray(restaurantIds) || restaurantIds.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid restaurant IDs',
      });
    }
    
    if (restaurantIds.length > 100) {
      return res.status(400).json({
        status: 'error',
        message: 'Too many restaurants. Maximum 100 allowed per batch.',
      });
    }
    
    try {
      // バックグラウンドで更新を開始
      comprehensiveRatingService.batchUpdateRatings(restaurantIds)
        .catch(error => console.error('Batch update failed:', error));
      
      res.status(202).json({
        status: 'accepted',
        message: 'Batch update started',
        data: {
          count: restaurantIds.length,
          estimatedTime: restaurantIds.length * 2, // 秒
        },
      });
    } catch (error) {
      console.error('Failed to start batch update:', error);
      throw createError('Failed to initiate batch update', 500);
    }
  })
);

export { router as comprehensiveRatingRouter };