import { Request, Response, NextFunction } from 'express';
import { authenticate, optionalAuth, AuthenticatedRequest } from '../auth';
import { JwtService } from '@/utils/jwt';

describe('Auth Middleware', () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
  });

  describe('authenticate', () => {
    test('有効なトークンで認証を通す', () => {
      const token = JwtService.generateToken({
        userId: 1,
        email: 'test@example.com',
      });

      mockRequest.headers = {
        authorization: `Bearer ${token}`,
      };

      authenticate(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequest.user).toBeDefined();
      expect(mockRequest.user?.userId).toBe(1);
      expect(mockNext).toHaveBeenCalled();
    });

    test('Authorizationヘッダーなしでエラーを返す', () => {
      authenticate(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          message: 'Authorization header is required',
        })
      );
    });

    test('無効なトークンでエラーを返す', () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid-token',
      };

      authenticate(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
        })
      );
    });

    test('Bearer形式でないトークンでエラーを返す', () => {
      mockRequest.headers = {
        authorization: 'InvalidFormat',
      };

      authenticate(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401,
          message: 'Token is required',
        })
      );
    });
  });

  describe('optionalAuth', () => {
    test('有効なトークンでユーザー情報を設定する', () => {
      const token = JwtService.generateToken({
        userId: 1,
        email: 'test@example.com',
      });

      mockRequest.headers = {
        authorization: `Bearer ${token}`,
      };

      optionalAuth(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequest.user).toBeDefined();
      expect(mockRequest.user?.userId).toBe(1);
      expect(mockNext).toHaveBeenCalled();
    });

    test('トークンなしでも処理を続行する', () => {
      optionalAuth(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequest.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });

    test('無効なトークンでも処理を続行する', () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid-token',
      };

      optionalAuth(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
        mockNext
      );

      expect(mockRequest.user).toBeUndefined();
      expect(mockNext).toHaveBeenCalled();
    });
  });
});