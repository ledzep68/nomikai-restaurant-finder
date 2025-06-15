import request from 'supertest';
import { App } from '@/app';
import { TestUtils } from '@/test/testUtils';

describe('Auth Controller', () => {
  let app: App;
  let server: Express.Application;

  beforeAll(async () => {
    await TestUtils.setupTestDatabase();
    app = new App();
    server = app.getApp();
  });

  afterAll(async () => {
    await TestUtils.teardownTestDatabase();
  });

  beforeEach(async () => {
    await TestUtils.setupTestDatabase();
  });

  describe('POST /api/auth/register', () => {
    test('正常な登録リクエストで成功レスポンスを返す', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'TestPass123',
      };

      const response = await request(server)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data.user.email).toBe(userData.email);
    });

    test('無効なメールアドレスでバリデーションエラーを返す', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'TestPass123',
      };

      const response = await request(server)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.status).toBe('error');
      expect(response.body.message).toBe('Validation failed');
    });

    test('短すぎるパスワードでバリデーションエラーを返す', async () => {
      const userData = {
        email: 'test@example.com',
        password: '123',
      };

      const response = await request(server)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.status).toBe('error');
    });
  });

  describe('POST /api/auth/login', () => {
    test('正常なログインリクエストで成功レスポンスを返す', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'TestPass123',
      };

      await request(server)
        .post('/api/auth/register')
        .send(userData);

      const response = await request(server)
        .post('/api/auth/login')
        .send(userData)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('token');
    });

    test('存在しないユーザーで401エラーを返す', async () => {
      const userData = {
        email: 'nonexistent@example.com',
        password: 'TestPass123',
      };

      const response = await request(server)
        .post('/api/auth/login')
        .send(userData)
        .expect(401);

      expect(response.body.status).toBe('error');
    });

    test('間違ったパスワードで401エラーを返す', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'TestPass123',
      };

      await request(server)
        .post('/api/auth/register')
        .send(userData);

      const response = await request(server)
        .post('/api/auth/login')
        .send({ ...userData, password: 'WrongPass123' })
        .expect(401);

      expect(response.body.status).toBe('error');
    });
  });
});