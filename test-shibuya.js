// 渋谷・居酒屋検索テスト
const HotPepperApiClient = require('./hotpepper-api-client');

async function testShibuya() {
  console.log('🍺 渋谷・居酒屋検索テスト...\n');
  
  const apiKey = 'cdfc8dd77824a1cd';
  const client = new HotPepperApiClient(apiKey);
  
  try {
    const results = await client.searchRestaurants({
      location: '渋谷',
      genre: '居酒屋',
      count: 10
    });
    
    console.log(`✅ 検索結果: ${results.length}件\n`);
    
    results.forEach((shop, index) => {
      console.log(`${index + 1}. ${shop.name}`);
      console.log(`   📍 ${shop.address}`);
      console.log(`   💰 ${shop.priceRange.min}円 ~ ${shop.priceRange.max}円`);
      console.log(`   📞 ${shop.phone || '電話番号なし'}`);
      console.log(`   ⭐ ${shop.rating.toFixed(1)} (推定評価)`);
      console.log('');
    });
    
    // APIエンドポイント経由でもテスト
    console.log('\n--- 統合APIサーバー経由でのテスト ---');
    const axios = require('axios');
    const apiResponse = await axios.get('http://localhost:3003/api/restaurants/integrated-search', {
      params: {
        location: '渋谷',
        genre: '居酒屋',
        limit: 5
      },
      timeout: 30000
    });
    
    console.log(`\n統合API結果: ${apiResponse.data.data.restaurants.length}件`);
    console.log(`使用プラットフォーム: ${apiResponse.data.data.meta.platformsUsed.join(', ')}`);
    console.log(`検索時間: ${apiResponse.data.data.meta.searchTime}ms`);
    
  } catch (error) {
    console.error('❌ エラー:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

testShibuya();