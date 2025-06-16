import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { Redis } from 'ioredis';

interface SecurityConfig {
  rateLimits: {
    [endpoint: string]: { requests: number; window: number };
  };
  security: {
    requestSecret: string;
    sessionSecret: string;
    encryptionKey: string;
  };
}

interface SecurityEvent {
  timestamp: Date;
  userId?: string;
  ipAddress: string;
  userAgent: string;
  endpoint: string;
  method: string;
  deviceFingerprint?: string;
}

interface ThreatAssessment {
  riskScore: number;
  anomalies: string[];
  recommendation: 'allow' | 'challenge' | 'block';
}

export class AdvancedSecurityMiddleware {
  private redis: Redis;
  private config: SecurityConfig;
  private nonceStore = new Map<string, Date>();
  private suspiciousIPs = new Set<string>();

  constructor(config: SecurityConfig, redis: Redis) {
    this.config = config;
    this.redis = redis;
    
    // Cleanup intervals
    setInterval(() => this.cleanupNonces(), 300000); // 5 minutes
    setInterval(() => this.cleanupSuspiciousIPs(), 3600000); // 1 hour
  }

  // Request signature validation for API integrity
  validateRequestSignature = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Skip for health checks and public endpoints
      if (req.path === '/health' || req.path === '/api/health') {
        return next();
      }

      const signature = req.headers['x-request-signature'] as string;
      const timestamp = req.headers['x-timestamp'] as string;
      const nonce = req.headers['x-nonce'] as string;

      if (!signature || !timestamp || !nonce) {
        await this.logSecurityEvent(req, 'missing_security_headers');
        return res.status(400).json({ 
          error: 'Security headers required',
          required: ['x-request-signature', 'x-timestamp', 'x-nonce']
        });
      }

      // Timestamp validation (5 minutes tolerance)
      const requestTime = new Date(timestamp);
      const now = new Date();
      const timeDiff = now.getTime() - requestTime.getTime();
      
      if (timeDiff > 300000 || timeDiff < -300000) {
        await this.logSecurityEvent(req, 'invalid_timestamp', { timeDiff });
        return res.status(400).json({ error: 'Request timestamp out of range' });
      }

      // Nonce validation (prevent replay attacks)
      const nonceKey = `nonce:${nonce}`;
      const nonceExists = await this.redis.exists(nonceKey);
      if (nonceExists) {
        await this.logSecurityEvent(req, 'replay_attack', { nonce });
        return res.status(400).json({ error: 'Request already processed' });
      }

      // Signature validation
      const payload = this.buildSignaturePayload(req, timestamp, nonce);
      const expectedSignature = crypto
        .createHmac('sha256', this.config.security.requestSecret)
        .update(payload)
        .digest('hex');

      const isValidSignature = crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );

      if (!isValidSignature) {
        await this.logSecurityEvent(req, 'invalid_signature', { 
          expectedLength: expectedSignature.length,
          receivedLength: signature.length 
        });
        return res.status(401).json({ error: 'Invalid request signature' });
      }

      // Store nonce to prevent replay
      await this.redis.setex(nonceKey, 300, '1'); // 5 minutes
      next();
    } catch (error) {
      await this.logSecurityEvent(req, 'signature_validation_error', { 
        error: error.message 
      });
      res.status(500).json({ error: 'Security validation failed' });
    }
  };

  // Advanced rate limiting with behavioral analysis
  createBehavioralRateLimit = (endpoint: string) => {
    const baseLimit = this.config.rateLimits[endpoint] || { requests: 60, window: 60000 };
    
    return rateLimit({
      windowMs: baseLimit.window,
      max: async (req: Request) => {
        const clientKey = this.getClientKey(req);
        const threatLevel = await this.assessThreatLevel(req);
        
        let adjustedLimit = baseLimit.requests;
        
        // Adjust based on threat assessment
        switch (threatLevel.recommendation) {
          case 'block':
            return 0; // No requests allowed
          case 'challenge':
            adjustedLimit = Math.ceil(baseLimit.requests * 0.3); // 30% of normal
            break;
          case 'allow':
            adjustedLimit = baseLimit.requests;
            break;
        }

        // Check user tier
        const userTier = await this.getUserTier(req);
        if (userTier === 'premium') adjustedLimit *= 2;
        if (userTier === 'admin') adjustedLimit *= 5;

        return Math.max(1, adjustedLimit);
      },
      keyGenerator: (req: Request) => this.getClientKey(req),
      handler: async (req: Request, res: Response) => {
        await this.logSecurityEvent(req, 'rate_limit_exceeded', { endpoint });
        
        // Add to suspicious IPs after multiple violations
        const clientKey = this.getClientKey(req);
        const violations = await this.redis.incr(`violations:${clientKey}`);
        await this.redis.expire(`violations:${clientKey}`, 3600); // 1 hour
        
        if (violations > 5) {
          this.suspiciousIPs.add(this.getClientIP(req));
        }

        res.status(429).json({
          error: 'Rate limit exceeded',
          retryAfter: Math.ceil(baseLimit.window / 1000),
          endpoint,
        });
      },
      standardHeaders: true,
      legacyHeaders: false,
    });
  };

  // SQL Injection prevention
  preventSQLInjection = (req: Request, res: Response, next: NextFunction) => {
    const sqlInjectionPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/gi,
      /(UNION\s+SELECT)/gi,
      /(\bOR\s+1\s*=\s*1\b)/gi,
      /(\bAND\s+1\s*=\s*1\b)/gi,
      /(;.*(--))/gi,
      /(\s*'\s*OR\s*'\w*'\s*=\s*'\w*')/gi,
      /(\/\*.*\*\/)/gi,
    ];

    const checkForSQLInjection = (obj: any, path = ''): boolean => {
      if (typeof obj === 'string') {
        return sqlInjectionPatterns.some(pattern => pattern.test(obj));
      }
      
      if (typeof obj === 'object' && obj !== null) {
        for (const [key, value] of Object.entries(obj)) {
          if (checkForSQLInjection(value, `${path}.${key}`)) {
            return true;
          }
        }
      }
      
      return false;
    };

    const inputs = [req.body, req.query, req.params];
    for (const input of inputs) {
      if (checkForSQLInjection(input)) {
        this.logSecurityEvent(req, 'sql_injection_attempt', { 
          suspiciousInput: JSON.stringify(input) 
        });
        return res.status(400).json({ 
          error: 'Invalid input detected',
          code: 'SECURITY_VIOLATION'
        });
      }
    }

    next();
  };

  // Cross-Site Scripting (XSS) prevention
  preventXSS = (req: Request, res: Response, next: NextFunction) => {
    const xssPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /<iframe[^>]*>.*?<\/iframe>/gi,
      /javascript:/gi,
      /vbscript:/gi,
      /onload=/gi,
      /onerror=/gi,
      /onclick=/gi,
      /onmouseover=/gi,
      /<img[^>]*src[^>]*onerror/gi,
      /expression\s*\(/gi,
    ];

    const checkForXSS = (obj: any): boolean => {
      if (typeof obj === 'string') {
        return xssPatterns.some(pattern => pattern.test(obj));
      }
      
      if (typeof obj === 'object' && obj !== null) {
        for (const value of Object.values(obj)) {
          if (checkForXSS(value)) {
            return true;
          }
        }
      }
      
      return false;
    };

    const inputs = [req.body, req.query, req.params];
    for (const input of inputs) {
      if (checkForXSS(input)) {
        this.logSecurityEvent(req, 'xss_attempt', { 
          suspiciousInput: JSON.stringify(input) 
        });
        return res.status(400).json({ 
          error: 'Invalid content detected',
          code: 'SECURITY_VIOLATION'
        });
      }
    }

    next();
  };

  // CSRF protection
  validateCSRFToken = async (req: Request, res: Response, next: NextFunction) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return next(); // Skip for safe methods
    }

    const token = req.headers['x-csrf-token'] as string || req.body._csrf;
    const sessionToken = req.session?.csrfToken;

    if (!token || !sessionToken || token !== sessionToken) {
      await this.logSecurityEvent(req, 'csrf_violation', { 
        hasToken: !!token,
        hasSessionToken: !!sessionToken,
        tokensMatch: token === sessionToken
      });
      return res.status(403).json({ 
        error: 'CSRF token validation failed',
        code: 'CSRF_VIOLATION'
      });
    }

    next();
  };

  // IP-based security checks
  checkSuspiciousIP = async (req: Request, res: Response, next: NextFunction) => {
    const clientIP = this.getClientIP(req);
    
    // Check against known malicious IPs
    if (this.suspiciousIPs.has(clientIP)) {
      await this.logSecurityEvent(req, 'suspicious_ip_access', { ip: clientIP });
      return res.status(403).json({ 
        error: 'Access denied from this IP',
        code: 'IP_BLOCKED'
      });
    }

    // Check for unusual patterns
    const requestCount = await this.redis.incr(`ip_requests:${clientIP}`);
    await this.redis.expire(`ip_requests:${clientIP}`, 60); // 1 minute window

    if (requestCount > 200) { // 200 requests per minute is suspicious
      this.suspiciousIPs.add(clientIP);
      await this.logSecurityEvent(req, 'unusual_traffic_pattern', { 
        ip: clientIP, 
        requestCount 
      });
    }

    next();
  };

  // Threat assessment
  private async assessThreatLevel(req: Request): Promise<ThreatAssessment> {
    let riskScore = 0;
    const anomalies: string[] = [];

    const clientIP = this.getClientIP(req);
    const userAgent = req.headers['user-agent'] || '';
    const userId = req.user?.id;

    // Check for suspicious IP
    if (this.suspiciousIPs.has(clientIP)) {
      riskScore += 30;
      anomalies.push('suspicious_ip');
    }

    // Check for bot-like behavior
    if (this.isBotUserAgent(userAgent)) {
      riskScore += 20;
      anomalies.push('bot_like_user_agent');
    }

    // Check for rapid requests
    const recentRequests = await this.redis.get(`rapid_requests:${clientIP}`);
    if (recentRequests && parseInt(recentRequests) > 50) {
      riskScore += 25;
      anomalies.push('rapid_requests');
    }

    // Check for geographic anomalies (if user is logged in)
    if (userId) {
      const lastLocation = await this.redis.get(`last_location:${userId}`);
      if (lastLocation && this.isGeographicAnomaly(clientIP, lastLocation)) {
        riskScore += 15;
        anomalies.push('geographic_anomaly');
      }
    }

    // Determine recommendation
    let recommendation: 'allow' | 'challenge' | 'block';
    if (riskScore >= 60) {
      recommendation = 'block';
    } else if (riskScore >= 30) {
      recommendation = 'challenge';
    } else {
      recommendation = 'allow';
    }

    return { riskScore, anomalies, recommendation };
  }

  // Helper methods
  private buildSignaturePayload(req: Request, timestamp: string, nonce: string): string {
    const method = req.method;
    const path = req.path;
    const body = req.body ? JSON.stringify(req.body) : '';
    return `${method}${path}${body}${timestamp}${nonce}`;
  }

  private getClientKey(req: Request): string {
    const ip = this.getClientIP(req);
    const userId = req.user?.id || 'anonymous';
    return `${ip}:${userId}`;
  }

  private getClientIP(req: Request): string {
    return (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
           req.headers['x-real-ip'] as string ||
           req.connection.remoteAddress ||
           req.socket.remoteAddress ||
           'unknown';
  }

  private async getUserTier(req: Request): Promise<string> {
    if (!req.user) return 'anonymous';
    const userTier = await this.redis.get(`user_tier:${req.user.id}`);
    return userTier || 'user';
  }

  private isBotUserAgent(userAgent: string): boolean {
    const botPatterns = [
      /bot/i, /crawler/i, /spider/i, /scraper/i,
      /curl/i, /wget/i, /postman/i, /insomnia/i,
    ];
    return botPatterns.some(pattern => pattern.test(userAgent));
  }

  private isGeographicAnomaly(currentIP: string, lastLocation: string): boolean {
    // Simplified geographic check - in production, use proper IP geolocation
    return false; // Placeholder
  }

  private async logSecurityEvent(req: Request, eventType: string, details?: any) {
    const event: SecurityEvent = {
      timestamp: new Date(),
      userId: req.user?.id,
      ipAddress: this.getClientIP(req),
      userAgent: req.headers['user-agent'] || '',
      endpoint: req.originalUrl,
      method: req.method,
    };

    const logEntry = {
      ...event,
      type: eventType,
      details: details || {},
    };

    console.warn('Security event:', logEntry);

    // Store in Redis for analysis
    await this.redis.lpush('security_events', JSON.stringify(logEntry));
    await this.redis.expire('security_events', 86400 * 7); // 7 days
  }

  private cleanupNonces() {
    const fiveMinutesAgo = new Date(Date.now() - 300000);
    for (const [nonce, timestamp] of this.nonceStore.entries()) {
      if (timestamp < fiveMinutesAgo) {
        this.nonceStore.delete(nonce);
      }
    }
  }

  private cleanupSuspiciousIPs() {
    // In production, implement more sophisticated cleanup logic
    // For now, clear all suspicious IPs every hour
    this.suspiciousIPs.clear();
  }
}