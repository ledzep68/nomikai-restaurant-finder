import request from 'supertest';
import { App } from '@/app';
import { TestUtils } from '@/test/testUtils';

describe('Restaurant Controller', () => {
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

  describe('GET /api/restaurants/search', () => {
    test('認証なしでアクセス可能', async () => {
      const restaurant = await TestUtils.createTestRestaurant({
        name: 'Test Restaurant',
        genre: 'Japanese',
      });

      const response = await request(server)
        .get('/api/restaurants/search')
        .query({ genre: 'Japanese' })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.restaurants).toHaveLength(1);
      expect(response.body.data.restaurants[0].name).toBe('Test Restaurant');
    });

    test('不正なパラメータでエラーを返す', async () => {
      const response = await request(server)
        .get('/api/restaurants/search')
        .query({ limit: -1 })
        .expect(400);

      expect(response.body.status).toBe('error');
    });

    test('認証ありでアクセス可能', async () => {
      const testUser = await TestUtils.createTestUser();
      await TestUtils.createTestRestaurant({
        name: 'Auth Test Restaurant',
        genre: 'Italian',
      });

      const response = await request(server)
        .get('/api/restaurants/search')
        .set(TestUtils.getAuthHeader(testUser.token))
        .query({ genre: 'Italian' })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.restaurants).toHaveLength(1);
    });
  });

  describe('GET /api/restaurants/:id', () => {
    test('有効なIDでレストラン詳細を取得', async () => {
      const restaurant = await TestUtils.createTestRestaurant({
        name: 'Detailed Restaurant',
      });

      const response = await request(server)
        .get(`/api/restaurants/${restaurant.id}`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.name).toBe('Detailed Restaurant');
    });

    test('存在しないIDで404エラーを返す', async () => {
      const response = await request(server)
        .get('/api/restaurants/99999')
        .expect(404);

      expect(response.body.status).toBe('error');
    });

    test('無効なIDでバリデーションエラーを返す', async () => {
      const response = await request(server)
        .get('/api/restaurants/invalid')
        .expect(400);

      expect(response.body.status).toBe('error');
    });
  });

  describe('POST /api/restaurants/:id/evaluate', () => {
    test('有効なレストランIDで評価を返す', async () => {
      const restaurant = await TestUtils.createTestRestaurant();
      await TestUtils.createTestReview(restaurant.id);

      const response = await request(server)
        .post(`/api/restaurants/${restaurant.id}/evaluate`)
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('restaurantId', restaurant.id);
      expect(response.body.data).toHaveProperty('evaluationScore');
    });

    test('存在しないレストランIDで404エラーを返す', async () => {
      const response = await request(server)
        .post('/api/restaurants/99999/evaluate')
        .expect(404);

      expect(response.body.status).toBe('error');
    });

    test('認証ありでアクセス可能', async () => {
      const testUser = await TestUtils.createTestUser();
      const restaurant = await TestUtils.createTestRestaurant();

      const response = await request(server)
        .post(`/api/restaurants/${restaurant.id}/evaluate`)
        .set(TestUtils.getAuthHeader(testUser.token))
        .expect(200);

      expect(response.body.status).toBe('success');
    });
  });
});