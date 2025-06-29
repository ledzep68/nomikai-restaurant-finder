// HotPepper API詳細デバッグ用スクリプト
const axios = require('axios');

async function debugApiCall() {
  try {
    console.log('🔍 HotPepper API詳細デバッグ開始...');
    
    // APIキーの存在確認
    console.log('\n1. 環境変数確認');
    console.log('HOTPEPPER_API_KEY:', process.env.HOTPEPPER_API_KEY ? '設定済み' : '未設定');
    console.log('USE_MOCK_API:', process.env.USE_MOCK_API);
    
    // ヘルスチェック
    console.log('\n2. ヘルスチェック');
    const healthResponse = await axios.get('http://localhost:3003/api/health');
    console.log('Health Status:', healthResponse.data);
    
    // HotPepper API直接テスト
    console.log('\n3. HotPepper API直接テスト');
    const directApiUrl = 'https://webservice.recruit.co.jp/hotpepper/gourmet/v1/';
    // より幅広い検索条件でテスト
    const testCases = [
      {
        name: '渋谷・居酒屋',
        params: {
          key: process.env.HOTPEPPER_API_KEY,
          format: 'json',
          large_area: 'Y003', // 渋谷
          genre: 'G001', // 居酒屋
          count: 5
        }
      },
      {
        name: '東京・全ジャンル',
        params: {
          key: process.env.HOTPEPPER_API_KEY,
          format: 'json',
          large_area: 'Z011', // 東京
          count: 5
        }
      },
      {
        name: '新宿・居酒屋',
        params: {
          key: process.env.HOTPEPPER_API_KEY,
          format: 'json',
          large_area: 'Y002', // 新宿
          genre: 'G001', // 居酒屋
          count: 5
        }
      }
    ];
    
    for (const testCase of testCases) {
      console.log(`\n--- ${testCase.name} ---`);
      console.log('Params:', testCase.params);
    
      try {
        const directResponse = await axios.get(directApiUrl, { 
          params: testCase.params,
          timeout: 30000 
        });
        console.log('Response:', {
          shopCount: directResponse.data.results?.shop?.length || 0,
          resultsAvailable: directResponse.data.results?.results_available,
          errorCode: directResponse.data.results?.error?.[0]?.code,
          errorMessage: directResponse.data.results?.error?.[0]?.message
        });
        
        if (directResponse.data.results?.shop?.length > 0) {
          console.log('Sample Shop:', {
            name: directResponse.data.results.shop[0].name,
            address: directResponse.data.results.shop[0].address
          });
        }
      } catch (directError) {
        console.error('Error:', directError.response?.status, directError.message);
      }
    }
    
    // 統合API検索テスト
    console.log('\n4. 統合API検索テスト（詳細ログ付き）');
    const searchResponse = await axios.get('http://localhost:3003/api/restaurants/integrated-search', {
      params: {
        location: '渋谷',
        genre: '居酒屋',
        limit: 5
      },
      timeout: 60000
    });
    
    console.log('統合API結果:', {
      totalCount: searchResponse.data.data?.meta?.totalCount,
      restaurantsFound: searchResponse.data.data?.restaurants?.length,
      platformsUsed: searchResponse.data.data?.meta?.platformsUsed,
      searchTime: searchResponse.data.data?.meta?.searchTime,
      cached: searchResponse.data.data?.meta?.cached
    });
    
    console.log('\n🎉 デバッグ完了！');
    
  } catch (error) {
    console.error('❌ デバッグエラー:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

debugApiCall();