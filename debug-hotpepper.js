// HotPepper APIクライアント単体テスト
const HotPepperApiClient = require('./hotpepper-api-client');

async function debugHotPepper() {
  console.log('🔍 HotPepper APIクライアント単体テスト...\n');
  
  const apiKey = 'cdfc8dd77824a1cd';
  const client = new HotPepperApiClient(apiKey);
  
  try {
    console.log('1. エリアコード検索テスト');
    const areaCode = await client.getAreaCode('渋谷');
    console.log(`渋谷 -> ${areaCode}`);
    
    console.log('\n2. ジャンルコード検索テスト');
    const genreCode = client.getGenreCode('居酒屋');
    console.log(`居酒屋 -> ${genreCode}`);
    
    console.log('\n3. 実API検索テスト');
    
    // テストケース1: 渋谷・居酒屋
    console.log('--- 渋谷・居酒屋 ---');
    let results = await client.searchRestaurants({
      location: '渋谷',
      genre: '居酒屋',
      count: 5
    });
    console.log(`渋谷・居酒屋: ${results.length}件`);
    
    // テストケース2: 東京・居酒屋（大エリアで検索）
    console.log('\n--- 東京・居酒屋 ---');
    results = await client.searchRestaurants({
      location: '東京',
      genre: '居酒屋',
      count: 5
    });
    console.log(`東京・居酒屋: ${results.length}件`);
    
    // テストケース3: 新宿・居酒屋
    console.log('\n--- 新宿・居酒屋 ---');
    results = await client.searchRestaurants({
      location: '新宿',
      genre: '居酒屋',
      count: 5
    });
    console.log(`新宿・居酒屋: ${results.length}件`);
    
    console.log(`検索結果: ${results.length}件`);
    
    if (results.length > 0) {
      console.log('サンプル店舗:', {
        name: results[0].name,
        address: results[0].address,
        genre: results[0].genre
      });
    }
    
  } catch (error) {
    console.error('❌ エラー:', error.message);
    console.error('Stack:', error.stack);
  }
}

debugHotPepper();