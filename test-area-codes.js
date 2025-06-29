// エリアコード検索テスト
const AreaCodeService = require('./services/areaCodeService');

async function testAreaCodes() {
  const areaService = new AreaCodeService();
  
  console.log('🧪 エリアコード検索テスト開始...\n');
  
  const testLocations = [
    '渋谷',
    'shibuya', 
    '新宿',
    'shinjuku',
    '池袋',
    'ikebukuro',
    '銀座',
    'ginza',
    '六本木',
    'roppongi',
    '東京',
    'tokyo',
    '上野',
    '品川',
    '恵比寿',
    'ebisu',
    '表参道',
    'omotesando',
    '吉祥寺',
    'kichijoji',
    '存在しない地名'
  ];
  
  for (const location of testLocations) {
    try {
      const result = await areaService.getAreaCode(location);
      console.log(`📍 "${location}" -> ${result.area_code} (${result.area_name}) [${result.match_type}]`);
    } catch (error) {
      console.error(`❌ "${location}" -> Error: ${error.message}`);
    }
  }
  
  console.log('\n🎉 テスト完了！');
  areaService.close();
}

testAreaCodes();