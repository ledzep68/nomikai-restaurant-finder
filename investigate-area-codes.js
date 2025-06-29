// HotPepper API エリアコード制限の詳細調査
const axios = require('axios');

async function investigateAreaCodes() {
  const apiKey = 'cdfc8dd77824a1cd';
  const baseUrl = 'https://webservice.recruit.co.jp/hotpepper/';
  
  console.log('🔍 HotPepper API エリアコード制限調査...\n');
  
  // 1. マスターデータ取得エンドポイントの確認
  console.log('1. 利用可能なマスターデータエンドポイント確認');
  const masterEndpoints = [
    'large_area/v1/',
    'middle_area/v1/', 
    'small_area/v1/',
    'large_service_area/v1/',
    'service_area/v1/',
    'genre/v1/',
    'budget/v1/'
  ];
  
  for (const endpoint of masterEndpoints) {
    try {
      const url = baseUrl + endpoint;
      console.log(`\nChecking: ${url}`);
      const response = await axios.get(url, {
        params: { key: apiKey, format: 'json' },
        timeout: 10000
      });
      
      if (response.data.results) {
        const results = response.data.results;
        const items = results.large_area || results.middle_area || results.small_area || 
                     results.large_service_area || results.service_area || 
                     results.genre || results.budget || [];
        
        console.log(`✅ ${endpoint} - ${items.length}件のデータ取得可能`);
        
        // エリア系のエンドポイントの場合、一部表示
        if (endpoint.includes('area') && items.length > 0) {
          console.log('サンプル:');
          items.slice(0, 3).forEach(item => {
            console.log(`  - ${item.code}: ${item.name}`);
          });
        }
      }
    } catch (error) {
      console.log(`❌ ${endpoint} - エラー: ${error.response?.status || error.message}`);
    }
  }
  
  // 2. 大エリアマスターの詳細確認
  console.log('\n\n2. 大エリア（large_area）マスターの詳細確認');
  try {
    const largeAreaResponse = await axios.get(baseUrl + 'large_area/v1/', {
      params: { key: apiKey, format: 'json' },
      timeout: 10000
    });
    
    if (largeAreaResponse.data.results?.large_area) {
      const areas = largeAreaResponse.data.results.large_area;
      console.log(`全${areas.length}件の大エリア:\n`);
      
      // 東京周辺を探す
      const tokyoAreas = areas.filter(area => 
        area.name.includes('東京') || area.code.startsWith('Z01')
      );
      
      console.log('東京関連エリア:');
      tokyoAreas.forEach(area => {
        console.log(`  ${area.code}: ${area.name}`);
      });
    }
  } catch (error) {
    console.error('大エリア取得エラー:', error.message);
  }
  
  // 3. 中エリアの妥当性チェック
  console.log('\n\n3. 問題のエリアコード（Y003等）の調査');
  
  // 中エリアマスター取得を試みる
  try {
    console.log('\n中エリア（middle_area）マスター取得試行...');
    const middleAreaResponse = await axios.get(baseUrl + 'middle_area/v1/', {
      params: { 
        key: apiKey, 
        format: 'json',
        large_area: 'Z011' // 東京を指定
      },
      timeout: 10000
    });
    
    if (middleAreaResponse.data.results?.middle_area) {
      const middleAreas = middleAreaResponse.data.results.middle_area;
      console.log(`東京の中エリア: ${middleAreas.length}件`);
      
      // Y003が存在するか確認
      const y003 = middleAreas.find(area => area.code === 'Y003');
      if (y003) {
        console.log(`✅ Y003は存在します: ${y003.name}`);
      } else {
        console.log('❌ Y003は中エリアマスターに存在しません');
        
        // 実際のコードを表示
        console.log('\n実際の渋谷関連エリア:');
        middleAreas.filter(area => area.name.includes('渋谷')).forEach(area => {
          console.log(`  ${area.code}: ${area.name}`);
        });
      }
    }
  } catch (error) {
    console.error('中エリア取得エラー:', error.response?.data?.results?.error?.[0]?.message || error.message);
  }
  
  // 4. グルメサーチAPIでの実際の使用可能パラメータ確認
  console.log('\n\n4. グルメサーチAPIでの実際の使用可能エリアコード確認');
  
  const testAreaCodes = [
    { type: 'large_area', code: 'Z011', name: '東京（大エリア）' },
    { type: 'large_area', code: 'Y003', name: 'Y003を大エリアとして' },
    { type: 'middle_area', code: 'Y003', name: 'Y003を中エリアとして' },
    { type: 'service_area', code: 'SA11', name: '関東サービスエリア' },
    { type: 'large_service_area', code: 'SS10', name: '関東' }
  ];
  
  for (const test of testAreaCodes) {
    try {
      console.log(`\nテスト: ${test.name}`);
      const params = {
        key: apiKey,
        format: 'json',
        count: 1,
        [test.type]: test.code
      };
      
      const response = await axios.get(baseUrl + 'gourmet/v1/', {
        params,
        timeout: 10000
      });
      
      const results = response.data.results;
      console.log(`  結果: ${results.results_available}件`);
      
      await new Promise(resolve => setTimeout(resolve, 31000)); // レート制限
    } catch (error) {
      console.error(`  エラー: ${error.response?.data?.results?.error?.[0]?.message || error.message}`);
    }
  }
  
  console.log('\n\n🎯 調査結果まとめ');
  console.log('1. Y003等は中エリア（middle_area）コードと思われる');
  console.log('2. 無料APIキーでは中エリアでの検索が制限されている可能性');
  console.log('3. 大エリア（Z011等）のみが使用可能');
  console.log('4. 解決策: 大エリアで検索 → フロントエンドフィルタリング');
}

investigateAreaCodes();