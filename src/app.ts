import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config } from '@/utils/config';
import { errorHandler } from '@/middleware/errorHandler';
import { sanitizeInput } from '@/middleware/sanitization';
import { authRouter } from '@/controllers/authController';
import { restaurantRouter } from '@/controllers/restaurantController';
import { healthRouter } from '@/controllers/healthController';
import { monitoringRoutes } from '@/routes/monitoring';
import { comprehensiveRatingRouter } from '@/controllers/comprehensiveRatingController';

export class App {
  private app: Application;

  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    this.app.use(helmet());
    
    this.app.use(cors({
      origin: config.cors.allowedOrigins,
      credentials: true,
    }));

    this.app.use(compression());

    if (config.app.nodeEnv !== 'test') {
      this.app.use(morgan('combined'));
    }

    const limiter = rateLimit({
      windowMs: config.rateLimit.windowMs,
      max: config.rateLimit.max,
      message: {
        error: 'Too many requests from this IP, please try again later.',
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use(limiter);

    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));
    
    this.app.use(sanitizeInput);
  }

  private setupRoutes(): void {
    this.app.use('/api/health', healthRouter);
    this.app.use('/api/auth', authRouter);
    this.app.use('/api/restaurants', restaurantRouter);
    this.app.use('/api/restaurants', comprehensiveRatingRouter);
    this.app.use('/api/monitoring', monitoringRoutes);

    this.app.get('/', (req: Request, res: Response) => {
      res.json({
        message: 'Nomikai Restaurant Finder API',
        version: '1.0.0',
        status: 'running',
      });
    });

    this.app.use('*', (req: Request, res: Response) => {
      res.status(404).json({
        error: 'Route not found',
        path: req.originalUrl,
      });
    });
  }

  private setupErrorHandling(): void {
    this.app.use(errorHandler);
  }

  public getApp(): Application {
    return this.app;
  }

  public listen(port: number): void {
    this.app.listen(port, () => {
      console.log(`🚀 Server running on port ${port} in ${config.app.nodeEnv} mode`);
    });
  }
}