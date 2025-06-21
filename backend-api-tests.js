const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Backend API Integration Tests
const API_BASE = 'http://localhost:3002/api';
const TEST_RESULTS = [];

async function runAPITest(name, testFn) {
  console.log(`\n🧪 Testing: ${name}`);
  try {
    const result = await testFn();
    TEST_RESULTS.push({ name, status: 'PASS', result });
    console.log(`✅ PASS: ${name}`);
    return result;
  } catch (error) {
    TEST_RESULTS.push({ name, status: 'FAIL', error: error.message });
    console.log(`❌ FAIL: ${name} - ${error.message}`);
    throw error;
  }
}

async function curlTest(endpoint, expectedStatus = 200) {
  const { stdout, stderr } = await execAsync(`curl -s -w "%{http_code}" "${API_BASE}${endpoint}"`);
  const httpCode = stdout.slice(-3);
  const response = stdout.slice(0, -3);
  
  if (parseInt(httpCode) !== expectedStatus) {
    throw new Error(`Expected ${expectedStatus}, got ${httpCode}`);
  }
  
  try {
    return JSON.parse(response);
  } catch (e) {
    return response;
  }
}

async function main() {
  console.log('🚀 Starting Backend API Integration Tests');
  console.log(`📡 Testing against: ${API_BASE}`);
  
  try {
    // Test 1: Health Check
    await runAPITest('Health Check Endpoint', async () => {
      const result = await curlTest('/health');
      if (!result.status || result.status !== 'ok') {
        throw new Error('Health check failed');
      }
      return result;
    });

    // Test 2: Restaurant Search - All Restaurants
    await runAPITest('Restaurant Search - All', async () => {
      const result = await curlTest('/restaurants/search');
      if (!result.data || !result.data.restaurants) {
        throw new Error('Invalid search response structure');
      }
      if (!Array.isArray(result.data.restaurants)) {
        throw new Error('Restaurants should be an array');
      }
      return { count: result.data.restaurants.length };
    });

    // Test 3: Restaurant Search - Korean Cuisine
    await runAPITest('Restaurant Search - Korean Cuisine', async () => {
      const result = await curlTest('/restaurants/search?genre=korean');
      if (!result.data || !result.data.restaurants) {
        throw new Error('Invalid search response structure');
      }
      const koreanRestaurants = result.data.restaurants.filter(r => 
        r.restaurant.genre === 'korean'
      );
      if (koreanRestaurants.length === 0) {
        throw new Error('No Korean restaurants found');
      }
      return { count: koreanRestaurants.length, restaurants: koreanRestaurants };
    });

    // Test 4: Restaurant Search - Location Filter
    await runAPITest('Restaurant Search - Location Filter', async () => {
      const result = await curlTest('/restaurants/search?location=' + encodeURIComponent('新宿'));
      if (!result.data || !result.data.restaurants) {
        throw new Error('Invalid search response structure');
      }
      return { count: result.data.restaurants.length };
    });

    // Test 5: Restaurant Search - Price Range
    await runAPITest('Restaurant Search - Price Range', async () => {
      const result = await curlTest('/restaurants/search?priceMin=2000&priceMax=4000');
      if (!result.data || !result.data.restaurants) {
        throw new Error('Invalid search response structure');
      }
      return { count: result.data.restaurants.length };
    });

    // Test 6: Authentication - Valid Login
    await runAPITest('Authentication - Valid Login', async () => {
      const { stdout } = await execAsync(`curl -s -w "%{http_code}" -X POST \\
        -H "Content-Type: application/json" \\
        -d '{"email":"test@example.com","password":"password"}' \\
        "${API_BASE}/auth/login"`);
      
      const httpCode = stdout.slice(-3);
      const response = JSON.parse(stdout.slice(0, -3));
      
      if (parseInt(httpCode) !== 200) {
        throw new Error(`Expected 200, got ${httpCode}`);
      }
      
      if (!response.success || !response.data.token) {
        throw new Error('Invalid login response');
      }
      
      return { token: response.data.token };
    });

    // Test 7: Authentication - Invalid Login
    await runAPITest('Authentication - Invalid Login', async () => {
      const { stdout } = await execAsync(`curl -s -w "%{http_code}" -X POST \\
        -H "Content-Type: application/json" \\
        -d '{"email":"wrong@example.com","password":"wrong"}' \\
        "${API_BASE}/auth/login"`);
      
      const httpCode = stdout.slice(-3);
      
      if (parseInt(httpCode) !== 401) {
        throw new Error(`Expected 401, got ${httpCode}`);
      }
      
      return { expectedError: true };
    });

    // Test Summary
    console.log('\n📊 Test Summary:');
    console.log('================');
    
    const passCount = TEST_RESULTS.filter(r => r.status === 'PASS').length;
    const failCount = TEST_RESULTS.filter(r => r.status === 'FAIL').length;
    
    TEST_RESULTS.forEach(test => {
      const icon = test.status === 'PASS' ? '✅' : '❌';
      console.log(`${icon} ${test.name}: ${test.status}`);
    });
    
    console.log(`\n🎯 Results: ${passCount} passed, ${failCount} failed`);
    
    if (failCount === 0) {
      console.log('🎉 All API integration tests passed!');
      process.exit(0);
    } else {
      console.log('⚠️ Some tests failed. Check logs above.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n💥 Test suite failed:', error.message);
    process.exit(1);
  }
}

// Run tests
main();