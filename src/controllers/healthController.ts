import { Router, Request, Response } from 'express';
import { DatabaseConnection } from '@/database/connection';
import { asyncHandler } from '@/middleware/errorHandler';

const router = Router();

router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const db = DatabaseConnection.getInstance();
  const isDbConnected = await db.testConnection();

  const healthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'nomikai-restaurant-finder',
    version: '1.0.0',
    checks: {
      database: isDbConnected ? 'healthy' : 'unhealthy',
      memory: {
        used: Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100,
        total: Math.round((process.memoryUsage().heapTotal / 1024 / 1024) * 100) / 100,
        unit: 'MB',
      },
      uptime: Math.floor(process.uptime()),
    },
  };

  const statusCode = isDbConnected ? 200 : 503;

  res.status(statusCode).json({
    status: 'success',
    data: healthStatus,
  });
}));

router.get('/readiness', asyncHandler(async (req: Request, res: Response) => {
  const db = DatabaseConnection.getInstance();
  const isDbConnected = await db.testConnection();

  if (isDbConnected) {
    res.status(200).json({
      status: 'success',
      message: 'Service is ready to accept requests',
      timestamp: new Date().toISOString(),
    });
  } else {
    res.status(503).json({
      status: 'error',
      message: 'Service is not ready - database connection failed',
      timestamp: new Date().toISOString(),
    });
  }
}));

router.get('/liveness', asyncHandler(async (req: Request, res: Response) => {
  res.status(200).json({
    status: 'success',
    message: 'Service is alive',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
  });
}));

export { router as healthRouter };