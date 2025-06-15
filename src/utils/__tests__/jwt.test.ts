import { JwtService } from '../jwt';

describe('JwtService', () => {
  const testPayload = {
    userId: 1,
    email: 'test@example.com',
  };

  describe('generateToken', () => {
    test('有効なトークンを生成する', () => {
      const token = JwtService.generateToken(testPayload);
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });
  });

  describe('verifyToken', () => {
    test('有効なトークンを検証する', () => {
      const token = JwtService.generateToken(testPayload);
      const decoded = JwtService.verifyToken(token);

      expect(decoded.userId).toBe(testPayload.userId);
      expect(decoded.email).toBe(testPayload.email);
      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeDefined();
    });

    test('無効なトークンでエラーを投げる', () => {
      const invalidToken = 'invalid.token.here';
      
      expect(() => {
        JwtService.verifyToken(invalidToken);
      }).toThrow('Invalid token');
    });

    test('改ざんされたトークンでエラーを投げる', () => {
      const token = JwtService.generateToken(testPayload);
      const tamperedToken = token.slice(0, -1) + 'x';
      
      expect(() => {
        JwtService.verifyToken(tamperedToken);
      }).toThrow('Invalid token');
    });
  });

  describe('decodeToken', () => {
    test('有効なトークンをデコードする', () => {
      const token = JwtService.generateToken(testPayload);
      const decoded = JwtService.decodeToken(token);

      expect(decoded).toBeTruthy();
      expect(decoded?.userId).toBe(testPayload.userId);
      expect(decoded?.email).toBe(testPayload.email);
    });

    test('無効なトークンでnullを返す', () => {
      const invalidToken = 'invalid.token';
      const decoded = JwtService.decodeToken(invalidToken);

      expect(decoded).toBeNull();
    });
  });
});