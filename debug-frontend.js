// フロントエンド問題の全可能性を網羅的にチェック
const axios = require('axios');

async function comprehensiveDebug() {
  console.log('🔍 フロントエンド問題の全可能性チェック開始\n');

  // 1. バックエンドAPI直接テスト
  console.log('1️⃣ バックエンドAPI直接テスト');
  try {
    const directResult = await axios.get('http://localhost:3003/api/restaurants/integrated-search', {
      params: { location: '渋谷', genre: '居酒屋', limit: 3 },
      timeout: 30000
    });
    console.log('✅ 直接API:', directResult.data.data.restaurants.length, '件');
  } catch (error) {
    console.log('❌ 直接API失敗:', error.message);
    return; // バックエンドが動いていない場合はここで終了
  }

  // 2. Viteプロキシ経由テスト
  console.log('\n2️⃣ Viteプロキシ経由テスト');
  try {
    const proxyResult = await axios.get('http://localhost:5175/api/restaurants/integrated-search', {
      params: { location: '渋谷', genre: '居酒屋', limit: 3 },
      timeout: 30000
    });
    console.log('✅ プロキシAPI:', proxyResult.data.data.restaurants.length, '件');
  } catch (error) {
    console.log('❌ プロキシAPI失敗:', error.message);
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Headers:', error.response.headers);
    }
  }

  // 3. フロントエンドの基本ページアクセステスト
  console.log('\n3️⃣ フロントエンドページアクセステスト');
  try {
    const pageResult = await axios.get('http://localhost:5175/', { timeout: 10000 });
    console.log('✅ フロントエンドページ:', pageResult.status);
  } catch (error) {
    console.log('❌ フロントエンドページ失敗:', error.message);
  }

  // 4. CORS設定確認
  console.log('\n4️⃣ CORS設定確認');
  try {
    const corsResult = await axios.options('http://localhost:3003/api/restaurants/integrated-search', {
      headers: {
        'Origin': 'http://localhost:5175',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    });
    console.log('✅ CORS プリフライト:', corsResult.status);
    console.log('CORS Headers:', corsResult.headers['access-control-allow-origin']);
  } catch (error) {
    console.log('❌ CORS失敗:', error.message);
  }

  // 5. 異なるパラメータでのテスト
  console.log('\n5️⃣ 異なるパラメータでのテスト');
  const testCases = [
    { location: '渋谷', genre: undefined, name: 'ジャンルなし' },
    { location: '渋谷', genre: '', name: 'ジャンル空文字' },
    { location: '渋谷', genre: 'izakaya', name: '英語ジャンル' },
    { location: '東京駅', genre: '居酒屋', name: '東京駅・居酒屋' },
  ];

  for (const testCase of testCases) {
    try {
      const params = { location: testCase.location, limit: 1 };
      if (testCase.genre !== undefined) {
        params.genre = testCase.genre;
      }
      
      const result = await axios.get('http://localhost:3003/api/restaurants/integrated-search', {
        params,
        timeout: 30000
      });
      console.log(`✅ ${testCase.name}:`, result.data.data.restaurants.length, '件');
    } catch (error) {
      console.log(`❌ ${testCase.name}:`, error.message);
    }
  }

  // 6. フロントエンド環境変数シミュレーション
  console.log('\n6️⃣ フロントエンド環境変数問題シミュレーション');
  console.log('これらの可能性もチェックしてください:');
  console.log('- ブラウザのDevToolsでコンソールエラー確認');
  console.log('- ブラウザのNetworkタブでAPI呼び出し確認');
  console.log('- フロントエンドコードで環境変数が正しく読み込まれているか');
  console.log('- Redux DevToolsでstateの変化確認');
  console.log('- ブラウザキャッシュの影響');

  // 7. レート制限の影響確認
  console.log('\n7️⃣ レート制限テスト');
  try {
    console.log('連続リクエストを送信...');
    const promises = [];
    for (let i = 0; i < 3; i++) {
      promises.push(
        axios.get('http://localhost:3003/api/restaurants/integrated-search', {
          params: { location: '新宿', genre: '居酒屋', limit: 1 },
          timeout: 30000
        })
      );
    }
    const results = await Promise.allSettled(promises);
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        console.log(`✅ リクエスト${index + 1}:`, result.value.data.data.restaurants.length, '件');
      } else {
        console.log(`❌ リクエスト${index + 1}:`, result.reason.message);
      }
    });
  } catch (error) {
    console.log('❌ レート制限テスト失敗:', error.message);
  }

  console.log('\n🔍 全テスト完了');
}

comprehensiveDebug().catch(console.error);