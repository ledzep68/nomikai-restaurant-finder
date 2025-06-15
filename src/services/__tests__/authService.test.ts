import { AuthService } from '../authService';
import { TestUtils } from '@/test/testUtils';

describe('AuthService', () => {
  let authService: AuthService;

  beforeAll(async () => {
    await TestUtils.setupTestDatabase();
    authService = new AuthService();
  });

  afterAll(async () => {
    await TestUtils.teardownTestDatabase();
  });

  beforeEach(async () => {
    await TestUtils.setupTestDatabase();
  });

  describe('register', () => {
    test('正常なユーザー登録が成功する', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'TestPass123',
      };

      const result = await authService.register(userData);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('token');
      expect(result.user.email).toBe(userData.email);
      expect(typeof result.token).toBe('string');
    });

    test('重複メールアドレスでエラーを返す', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'TestPass123',
      };

      await authService.register(userData);

      await expect(authService.register(userData)).rejects.toThrow(
        'User with this email already exists'
      );
    });
  });

  describe('login', () => {
    test('正常なログインが成功する', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'TestPass123',
      };

      await authService.register(userData);
      const result = await authService.login(userData);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('token');
      expect(result.user.email).toBe(userData.email);
    });

    test('存在しないメールアドレスでエラーを返す', async () => {
      const userData = {
        email: 'nonexistent@example.com',
        password: 'TestPass123',
      };

      await expect(authService.login(userData)).rejects.toThrow(
        'Invalid email or password'
      );
    });

    test('間違ったパスワードでエラーを返す', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'TestPass123',
      };

      await authService.register(userData);

      await expect(
        authService.login({ ...userData, password: 'WrongPass123' })
      ).rejects.toThrow('Invalid email or password');
    });
  });

  describe('validateUser', () => {
    test('有効なユーザーIDで正常にユーザーを取得', async () => {
      const testUser = await TestUtils.createTestUser();
      const user = await authService.validateUser(testUser.id);

      expect(user).toBeTruthy();
      expect(user?.email).toBe(testUser.email);
    });

    test('存在しないユーザーIDでnullを返す', async () => {
      const user = await authService.validateUser(99999);
      expect(user).toBeNull();
    });
  });
});