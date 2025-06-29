// 実APIテスト（エリアコードDB対応版）
const axios = require('axios');

async function testRealApiWithAreaCodes() {
  try {
    console.log('🧪 実API統合テスト（エリアコードDB対応）...\n');
    
    const testCases = [
      { location: '渋谷', genre: '居酒屋', expectedArea: 'Y003' },
      { location: '新宿', genre: 'イタリアン', expectedArea: 'Y002' },
      { location: '銀座', genre: 'フレンチ', expectedArea: 'Y005' },
      { location: 'shibuya', genre: 'italian', expectedArea: 'Y003' },
      { location: '池袋', genre: '焼肉', expectedArea: 'Y004' }
    ];
    
    for (const testCase of testCases) {
      console.log(`--- ${testCase.location} / ${testCase.genre} ---`);
      
      try {
        const response = await axios.get('http://localhost:3003/api/restaurants/integrated-search', {
          params: {
            location: testCase.location,
            genre: testCase.genre,
            limit: 3
          },
          timeout: 45000
        });
        
        const data = response.data.data;
        console.log(`✅ 結果: ${data.restaurants.length}件`);
        console.log(`   プラットフォーム: ${data.meta.platformsUsed.join(', ')}`);
        console.log(`   検索時間: ${data.meta.searchTime}ms`);
        
        if (data.restaurants.length > 0) {
          const sample = data.restaurants[0].restaurant;
          console.log(`   サンプル: ${sample.name}`);
          console.log(`   住所: ${sample.address}`);
          console.log(`   ジャンル: ${sample.genre}`);
        }
        
      } catch (error) {
        console.error(`❌ エラー: ${error.message}`);
        if (error.response) {
          console.error(`   ステータス: ${error.response.status}`);
        }
      }
      
      console.log('');
    }
    
    console.log('🎉 テスト完了！');
    
  } catch (error) {
    console.error('❌ テスト失敗:', error.message);
  }
}

testRealApiWithAreaCodes();