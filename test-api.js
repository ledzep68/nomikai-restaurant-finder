// HotPepper API テスト用スクリプト
const axios = require('axios');

async function testApi() {
  try {
    console.log('🧪 HotPepper API テスト開始...');
    
    // ヘルスチェック
    console.log('\n1. ヘルスチェック');
    const healthResponse = await axios.get('http://localhost:3003/api/health');
    console.log('✅ ヘルスチェック:', healthResponse.data);
    
    // 実API検索テスト
    console.log('\n2. 実API検索テスト');
    const searchResponse = await axios.get('http://localhost:3003/api/restaurants/integrated-search', {
      params: {
        location: '東京',
        genre: '居酒屋',
        limit: 2
      },
      timeout: 60000 // 60秒タイムアウト
    });
    
    console.log('✅ 検索結果:', {
      totalCount: searchResponse.data.data?.meta?.totalCount,
      restaurantsFound: searchResponse.data.data?.restaurants?.length,
      platformsUsed: searchResponse.data.data?.meta?.platformsUsed,
      searchTime: searchResponse.data.data?.meta?.searchTime + 'ms'
    });
    
    if (searchResponse.data.data?.restaurants?.length > 0) {
      console.log('\n📍 サンプル店舗:');
      const restaurant = searchResponse.data.data.restaurants[0].restaurant;
      console.log(`- 店名: ${restaurant.name}`);
      console.log(`- 住所: ${restaurant.address}`);
      console.log(`- ジャンル: ${restaurant.genre}`);
      console.log(`- 評価: ${searchResponse.data.data.restaurants[0].totalScore}/100`);
    }
    
    console.log('\n🎉 APIテスト完了！');
    
  } catch (error) {
    console.error('❌ APIテストエラー:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testApi();