import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  status?: string;
  isOperational?: boolean;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const statusCode = err.statusCode || 500;
  const status = err.status || 'error';

  console.error('Error details:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  if (process.env.NODE_ENV === 'development') {
    res.status(statusCode).json({
      status,
      error: err.message,
      stack: err.stack,
      timestamp: new Date().toISOString(),
      path: req.path,
    });
  } else {
    if (err.isOperational) {
      res.status(statusCode).json({
        status,
        message: err.message,
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(500).json({
        status: 'error',
        message: 'Something went wrong!',
        timestamp: new Date().toISOString(),
      });
    }
  }
};

export const createError = (
  message: string,
  statusCode: number = 500
): AppError => {
  const error: AppError = new Error(message);
  error.statusCode = statusCode;
  error.isOperational = true;
  return error;
};

export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};