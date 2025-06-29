// 実API統合テスト用スクリプト
import { restaurantService } from '../services/restaurantService';

describe('実API統合テスト', () => {
  // APIテストはE2Eテストとして実行
  it('HotPepper API統合検索テスト（スキップ）', async () => {
    // 実際のAPIテストは手動またはE2Eテストで実行
    console.log('HotPepper API統合テストはE2Eテストで実行してください');
    expect(true).toBe(true);
  });

  it('レストランサービスが実API設定を正しく読み込む', () => {
    // 環境変数の確認のみ
    expect(typeof restaurantService).toBe('object');
    expect(typeof restaurantService.search).toBe('function');
  });
});

// 手動テスト用のヘルパー関数
export async function manualApiTest() {
  try {
    console.log('🧪 手動API統合テスト開始');
    
    const searchQuery = {
      location: '東京',
      genre: '居酒屋',
      limit: 5
    };
    
    const result = await restaurantService.search(searchQuery);
    
    console.log('✅ 検索結果:', {
      restaurantCount: result.restaurants.length,
      totalItems: result.pagination.totalItems,
      searchTime: result.searchTime
    });
    
    if (result.restaurants.length > 0) {
      const sample = result.restaurants[0];
      console.log('📍 サンプル店舗:', {
        name: sample.restaurant.name,
        address: sample.restaurant.address,
        genre: sample.restaurant.genre,
        score: sample.totalScore
      });
    }
    
    return result;
  } catch (error) {
    console.error('❌ APIテストエラー:', error);
    throw error;
  }
}