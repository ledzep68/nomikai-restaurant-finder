import { Request, Response, NextFunction } from 'express';

export interface SanitizedRequest extends Request {
  sanitized?: boolean;
}

const sanitizeString = (str: string): string => {
  return str
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript:
    .replace(/on\w+=/gi, '') // Remove event handlers
    .replace(/script/gi, '') // Remove script tags
    .trim();
};

const sanitizeValue = (value: unknown): unknown => {
  if (typeof value === 'string') {
    return sanitizeString(value);
  }
  
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }
  
  if (typeof value === 'object' && value !== null) {
    const sanitized: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      sanitized[key] = sanitizeValue(val);
    }
    return sanitized;
  }
  
  return value;
};

export const sanitizeInput = (
  req: SanitizedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeValue(req.body);
    }
    
    if (req.query && typeof req.query === 'object') {
      req.query = sanitizeValue(req.query) as { [key: string]: unknown };
    }
    
    if (req.params && typeof req.params === 'object') {
      req.params = sanitizeValue(req.params) as { [key: string]: string };
    }
    
    req.sanitized = true;
    next();
  } catch (error) {
    console.error('Sanitization error:', error);
    res.status(400).json({
      status: 'error',
      message: 'Invalid input data',
    });
  }
};

export const requireSanitization = (
  req: SanitizedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.sanitized) {
    return res.status(500).json({
      status: 'error',
      message: 'Input sanitization required',
    });
  }
  next();
};