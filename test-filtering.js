// フィルタリングテスト
const HotPepperApiClient = require('./hotpepper-api-client');

async function testFiltering() {
  console.log('🧪 フィルタリングテスト...\n');
  
  const apiKey = 'cdfc8dd77824a1cd';
  const client = new HotPepperApiClient(apiKey);
  
  try {
    // 1. 池袋で検索（実際に池袋の店舗があることを確認済み）
    console.log('--- 池袋で検索 ---');
    const ikebukuroResults = await client.searchRestaurants({
      location: '池袋',
      genre: '居酒屋',
      count: 10
    });
    
    console.log(`池袋検索結果: ${ikebukuroResults.length}件`);
    ikebukuroResults.forEach((shop, index) => {
      console.log(`${index + 1}. ${shop.name}`);
      console.log(`   住所: ${shop.address}`);
    });
    
    // 2. 吉祥寺で検索
    console.log('\n--- 吉祥寺で検索 ---');
    await new Promise(resolve => setTimeout(resolve, 31000)); // レート制限
    
    const kichijojiResults = await client.searchRestaurants({
      location: '吉祥寺',
      genre: '居酒屋',
      count: 10
    });
    
    console.log(`吉祥寺検索結果: ${kichijojiResults.length}件`);
    kichijojiResults.forEach((shop, index) => {
      console.log(`${index + 1}. ${shop.name}`);
      console.log(`   住所: ${shop.address}`);
    });
    
  } catch (error) {
    console.error('❌ エラー:', error.message);
  }
}

testFiltering();