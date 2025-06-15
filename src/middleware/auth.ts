import { Request, Response, NextFunction } from 'express';
import { JwtService, JwtPayload } from '@/utils/jwt';
import { createError } from './errorHandler';

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

export const authenticate = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      throw createError('Authorization header is required', 401);
    }

    const token = authHeader.split(' ')[1];
    
    if (!token) {
      throw createError('Token is required', 401);
    }

    const payload = JwtService.verifyToken(token);
    req.user = payload;
    
    next();
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Invalid token' || error.message === 'Token expired') {
        return next(createError(error.message, 401));
      }
    }
    next(createError('Authentication failed', 401));
  }
};

export const optionalAuth = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader) {
      const token = authHeader.split(' ')[1];
      if (token) {
        const payload = JwtService.verifyToken(token);
        req.user = payload;
      }
    }
    
    next();
  } catch (error) {
    next();
  }
};