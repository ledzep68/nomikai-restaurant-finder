// HotPepper API データの住所確認
const HotPepperApiClient = require('./hotpepper-api-client');

async function debugAddresses() {
  console.log('🔍 HotPepper API 住所データ確認...\n');
  
  const apiKey = 'cdfc8dd77824a1cd';
  const client = new HotPepperApiClient(apiKey);
  
  try {
    // フィルタリングを無効化してデータを取得
    client.requestedLocation = null; // フィルタリング無効化
    
    const results = await client.searchRestaurants({
      location: '東京',
      genre: '居酒屋',
      count: 10
    });
    
    console.log(`取得した店舗数: ${results.length}件\n`);
    
    results.forEach((shop, index) => {
      console.log(`${index + 1}. ${shop.name}`);
      console.log(`   住所: ${shop.address}`);
      console.log(`   ジャンル: ${shop.genre}`);
      
      // 渋谷関連キーワードをチェック
      const address = shop.address || '';
      const name = shop.name || '';
      const hasShibuya = address.includes('渋谷') || address.includes('shibuya') || 
                        address.includes('渋谷区') || name.includes('渋谷');
      const hasShinjuku = address.includes('新宿') || address.includes('shinjuku') || 
                         address.includes('新宿区') || name.includes('新宿');
      
      if (hasShibuya) console.log('   ✅ 渋谷関連');
      if (hasShinjuku) console.log('   ✅ 新宿関連');
      
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ エラー:', error.message);
  }
}

debugAddresses();