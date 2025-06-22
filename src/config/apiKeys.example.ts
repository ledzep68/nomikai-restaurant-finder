/**
 * API Keys Configuration Template
 * 
 * 本番環境では .env ファイルまたは環境変数を使用してください
 * このファイルはサンプルであり、実際のAPIキーは含めないでください
 */

export const API_KEYS_EXAMPLE = {
  // HotPepper API (リクルートWebサービス)
  // 取得方法: https://webservice.recruit.co.jp/register/
  hotpepper: {
    // 例: 'abcd1234efgh5678ijkl9012mnop3456'
    apiKey: process.env.HOTPEPPER_API_KEY || 'your_hotpepper_api_key_here',
    endpoint: 'https://webservice.recruit.co.jp/hotpepper',
    
    // レート制限設定（無料版推奨）
    rateLimit: {
      requestsPerMinute: 2,
      requestsPerHour: 50,
      requestsPerDay: 300,
    }
  },

  // Google Places API (無料版では無効)
  googlePlaces: {
    // 例: 'AIzaSyD1234567890abcdefghijklmnopqrstuvw'
    apiKey: process.env.GOOGLE_PLACES_API_KEY || 'disabled_in_free_tier',
    endpoint: 'https://maps.googleapis.com/maps/api/place',
    enabled: process.env.ENABLE_GOOGLE_PLACES === 'true',
  },

  // 食べログ (スクレイピング - APIキー不要)
  tabelog: {
    baseUrl: 'https://tabelog.com',
    enabled: process.env.ENABLE_TABELOG === 'true',
    personalUseOnly: true,
    
    // アクセス制限設定
    accessSettings: {
      requestInterval: 30000, // 30秒間隔
      weeklyLimit: 50,        // 週50回まで
      respectfulAccess: true,
    }
  }
};

// 設定バリデーション
export const validateApiConfig = () => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // HotPepper API設定チェック
  if (!API_KEYS_EXAMPLE.hotpepper.apiKey || API_KEYS_EXAMPLE.hotpepper.apiKey === 'your_hotpepper_api_key_here') {
    errors.push('HotPepper API key is required for free tier operation');
  }

  // Google Places API警告（無料版では無効）
  if (API_KEYS_EXAMPLE.googlePlaces.enabled && process.env.ENABLE_FREE_TIER_MODE === 'true') {
    warnings.push('Google Places API is enabled but not recommended in free tier mode due to costs');
  }

  // 食べログ設定チェック
  if (API_KEYS_EXAMPLE.tabelog.enabled && !API_KEYS_EXAMPLE.tabelog.personalUseOnly) {
    errors.push('Tabelog scraping must be configured for personal use only');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
};

// 開発環境用のモック設定
export const MOCK_API_CONFIG = {
  hotpepper: {
    apiKey: 'mock_hotpepper_key_for_development',
    useMockData: true,
  },
  tabelog: {
    useMockData: true,
    enabled: false, // 開発環境では無効
  },
  googlePlaces: {
    useMockData: true,
    enabled: false, // 無料版では無効
  }
};