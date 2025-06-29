// HotPepper API 詳細調査スクリプト
const axios = require('axios');

async function investigateHotPepperAPI() {
  const apiKey = 'cdfc8dd77824a1cd';
  
  console.log('🔍 HotPepper API 詳細調査開始...\n');
  
  // 1. 基本URLとエンドポイントの確認
  console.log('1. エンドポイント確認');
  const baseUrls = [
    'https://webservice.recruit.co.jp/hotpepper/gourmet/v1/',
    'http://webservice.recruit.co.jp/hotpepper/gourmet/v1/',
    'https://webservice.recruit.co.jp/hotpepper/gourmet/v1',
    'https://webservice.recruit.co.jp/hotpepper/shop/v1/'
  ];
  
  for (const url of baseUrls) {
    try {
      console.log(`Testing: ${url}`);
      const response = await axios.get(url, {
        params: { key: apiKey, format: 'json', count: 1 },
        timeout: 10000
      });
      console.log(`✅ ${url} - Status: ${response.status}, Results: ${response.data.results?.results_available || 'N/A'}`);
    } catch (error) {
      console.log(`❌ ${url} - Error: ${error.response?.status || error.message}`);
    }
  }
  
  // 2. 正しいエンドポイントでの詳細テスト
  console.log('\n2. 正しいエンドポイントでの詳細テスト');
  const correctUrl = 'https://webservice.recruit.co.jp/hotpepper/gourmet/v1/';
  
  const testCases = [
    {
      name: 'APIキーのみ',
      params: { key: apiKey, format: 'json', count: 5 }
    },
    {
      name: '東京大エリア（Z011）のみ',
      params: { key: apiKey, format: 'json', large_area: 'Z011', count: 5 }
    },
    {
      name: '居酒屋ジャンル（G001）のみ',
      params: { key: apiKey, format: 'json', genre: 'G001', count: 5 }
    },
    {
      name: '渋谷エリア（Y003）のみ',
      params: { key: apiKey, format: 'json', large_area: 'Y003', count: 5 }
    },
    {
      name: '渋谷エリア（Y003）+ 居酒屋（G001）',
      params: { key: apiKey, format: 'json', large_area: 'Y003', genre: 'G001', count: 5 }
    },
    {
      name: '中エリア指定（middle_area）テスト',
      params: { key: apiKey, format: 'json', middle_area: 'Y003', count: 5 }
    },
    {
      name: '小エリア指定（small_area）テスト',
      params: { key: apiKey, format: 'json', small_area: 'X001', count: 5 }
    }
  ];
  
  for (const testCase of testCases) {
    try {
      console.log(`\n--- ${testCase.name} ---`);
      console.log('Params:', testCase.params);
      
      const response = await axios.get(correctUrl, {
        params: testCase.params,
        timeout: 15000
      });
      
      const results = response.data.results;
      console.log(`✅ 成功: ${results.results_available}件利用可能, ${results.results_returned}件返却`);
      
      if (results.shop && results.shop.length > 0) {
        const sample = results.shop[0];
        console.log(`   サンプル: ${sample.name}`);
        console.log(`   住所: ${sample.address}`);
      }
      
      if (results.error) {
        console.log(`⚠️  エラー: ${results.error[0].code} - ${results.error[0].message}`);
      }
      
      // レート制限対応
      await new Promise(resolve => setTimeout(resolve, 31000));
      
    } catch (error) {
      console.error(`❌ ${testCase.name} エラー:`, error.response?.status, error.message);
      if (error.response?.data) {
        console.error('Response data:', JSON.stringify(error.response.data, null, 2));
      }
    }
  }
  
  // 3. パラメータ名の確認
  console.log('\n3. パラメータ名の検証');
  const paramTests = [
    { large_area: 'Z011' },
    { large_service_area: 'Z011' },
    { service_area: 'Z011' },
    { area: 'Z011' },
    { middle_area: 'Y003' },
    { small_area: 'X001' }
  ];
  
  for (const paramTest of paramTests) {
    try {
      const params = { key: apiKey, format: 'json', count: 1, ...paramTest };
      console.log(`Testing params:`, paramTest);
      
      const response = await axios.get(correctUrl, { params, timeout: 10000 });
      const results = response.data.results;
      
      if (results.error) {
        console.log(`❌ エラー: ${results.error[0].message}`);
      } else {
        console.log(`✅ OK: ${results.results_available}件`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 31000));
      
    } catch (error) {
      console.error(`❌ パラメータテストエラー:`, error.message);
    }
  }
  
  console.log('\n🎉 調査完了！');
}

investigateHotPepperAPI();