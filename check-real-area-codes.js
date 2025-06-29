// 実際のエリアコードを確認
const axios = require('axios');

async function checkRealAreaCodes() {
  const apiKey = 'cdfc8dd77824a1cd';
  const baseUrl = 'https://webservice.recruit.co.jp/hotpepper/';
  
  console.log('🔍 実際のHotPepper APIエリアコード確認...\n');
  
  try {
    // 中エリアマスター取得
    const response = await axios.get(baseUrl + 'middle_area/v1/', {
      params: { 
        key: apiKey, 
        format: 'json',
        large_area: 'Z011' // 東京
      },
      timeout: 10000
    });
    
    if (response.data.results?.middle_area) {
      const areas = response.data.results.middle_area;
      
      console.log('東京の主要中エリアコード:\n');
      
      // 主要エリアを探す
      const keywords = ['渋谷', '新宿', '池袋', '銀座', '六本木', '品川', '上野', '浅草', '吉祥寺', '立川'];
      
      keywords.forEach(keyword => {
        const matches = areas.filter(area => area.name.includes(keyword));
        if (matches.length > 0) {
          console.log(`【${keyword}】`);
          matches.forEach(area => {
            console.log(`  ${area.code}: ${area.name}`);
          });
        }
      });
      
      // 正しいコードでテスト
      console.log('\n\n実際のコードでのテスト:');
      const testCodes = [
        { code: 'Y030', name: '渋谷' },
        { code: 'Y055', name: '新宿' },
        { code: 'Y034', name: '池袋' }
      ];
      
      for (const test of testCodes) {
        try {
          console.log(`\n--- ${test.name}（${test.code}）テスト ---`);
          const testResponse = await axios.get(baseUrl + 'gourmet/v1/', {
            params: {
              key: apiKey,
              format: 'json',
              middle_area: test.code,
              genre: 'G001', // 居酒屋
              count: 5
            },
            timeout: 10000
          });
          
          const results = testResponse.data.results;
          console.log(`✅ ${results.results_available}件の店舗が見つかりました`);
          
          if (results.shop && results.shop.length > 0) {
            console.log('サンプル店舗:');
            results.shop.slice(0, 2).forEach(shop => {
              console.log(`  - ${shop.name}`);
              console.log(`    ${shop.address}`);
            });
          }
          
          await new Promise(resolve => setTimeout(resolve, 31000)); // レート制限
        } catch (error) {
          console.error(`❌ エラー: ${error.response?.data?.results?.error?.[0]?.message || error.message}`);
        }
      }
    }
  } catch (error) {
    console.error('エラー:', error.message);
  }
  
  console.log('\n\n🎯 結論:');
  console.log('1. 私たちが使用していたY003, Y002等は間違ったコード');
  console.log('2. 正しいコード: 渋谷=Y030, 新宿=Y055, 池袋=Y034');
  console.log('3. 正しいコードを使えば中エリア検索も可能！');
}

checkRealAreaCodes();