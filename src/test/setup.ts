import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

beforeAll(async () => {
  console.log('🧪 Test environment setup');
});

afterAll(async () => {
  console.log('🧪 Test environment cleanup');
});

jest.setTimeout(30000);