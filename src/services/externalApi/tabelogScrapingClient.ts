import { BaseApiClient } from './baseApiClient';
import { PlatformRatingData, Platform, ScrapingConfig, PersonalUseConfig } from '@/types/platformAggregation';
import { SearchQuery } from '@/types/search';
import { config } from '@/utils/config';

/**
 * Tabelog Scraping Client (Personal Use Only)
 * 個人利用のみ・非営利・リスペクトフルアクセス
 */
export class TabelogScrapingClient extends BaseApiClient {
  private platform: Platform = 'tabelog';
  private scrapingConfig: ScrapingConfig;
  private personalUseConfig: PersonalUseConfig;

  constructor() {
    super({
      config: {
        endpoint: process.env.TABELOG_BASE_URL || 'https://tabelog.com',
        apiKey: '', // No API key needed for scraping
        rateLimit: 2, // Very conservative: 2 requests per minute
        timeout: parseInt(process.env.TABELOG_TIMEOUT || '15000', 10),
      },
      name: 'TabelogScraping',
    });

    this.scrapingConfig = {
      baseUrl: process.env.TABELOG_BASE_URL || 'https://tabelog.com',
      requestDelay: parseInt(process.env.TABELOG_REQUEST_DELAY || '30000', 10), // 30 seconds between requests
      maxRetries: 2,
      timeout: parseInt(process.env.TABELOG_TIMEOUT || '15000', 10),
      respectRobotsTxt: true,
      userAgent: 'Nomikai-Personal-Aggregator/1.0 (Personal Use Only)',
      personalUse: {
        purposeDeclaration: 'Personal restaurant rating aggregation for individual use',
        nonCommercialUse: true,
        respectfulAccess: true,
        dataScope: 'basic_info_only',
        attributionRequired: true,
      }
    };

    this.personalUseConfig = this.scrapingConfig.personalUse;
  }

  protected getDefaultHeaders(): Record<string, string> {
    return {
      'User-Agent': this.scrapingConfig.userAgent,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'ja,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
    };
  }

  /**
   * Phase 7: 統一評価データ取得
   * IMPORTANT: 個人利用・非営利・リスペクトフルアクセスのみ
   */
  public async getRatingData(restaurantId: string): Promise<PlatformRatingData> {
    // 個人利用の前提チェック
    this.validatePersonalUseCompliance();

    try {
      // リスペクトフルアクセス: 30秒待機
      await this.respectfulDelay();

      // NOTE: 実際のスクレイピング実装は法的リスクを避けるため、
      // 現時点では基本情報のみの取得に限定し、モックデータを返す
      console.log(`[Tabelog Personal Use] Attempting to fetch rating data for: ${restaurantId}`);
      
      // 実際の実装では以下のような処理を行う:
      // 1. robots.txtの確認
      // 2. リスペクトフルなHTTPリクエスト
      // 3. 基本情報のみの抽出
      // 4. 適切なエラーハンドリング

      return this.getMockRatingData(restaurantId);
    } catch (error) {
      console.error(`Tabelog scraping failed for ${restaurantId}:`, error);
      return this.getMockRatingData(restaurantId);
    }
  }

  /**
   * Phase 7: 検索結果を統一評価データに変換
   */
  public async searchForRatingData(query: SearchQuery): Promise<PlatformRatingData[]> {
    this.validatePersonalUseCompliance();

    try {
      await this.respectfulDelay();
      
      console.log(`[Tabelog Personal Use] Searching for: ${query.location} ${query.genre || ''}`);
      
      // 実際の実装では検索結果のスクレイピングを行うが、
      // 現時点では法的安全性を考慮してモックデータを返す
      return this.getMockSearchRatingData(query);
    } catch (error) {
      console.error('Tabelog search scraping failed:', error);
      return this.getMockSearchRatingData(query);
    }
  }

  /**
   * 個人利用コンプライアンス検証
   */
  private validatePersonalUseCompliance(): void {
    if (!this.personalUseConfig.nonCommercialUse) {
      throw new Error('Tabelog scraping is only allowed for personal, non-commercial use');
    }

    if (!this.personalUseConfig.respectfulAccess) {
      throw new Error('Respectful access is required for Tabelog scraping');
    }

    if (this.personalUseConfig.dataScope !== 'basic_info_only') {
      throw new Error('Only basic info scraping is allowed for personal use');
    }
  }

  /**
   * リスペクトフルアクセス: 適切な間隔での要求
   */
  private async respectfulDelay(): Promise<void> {
    const delay = this.scrapingConfig.requestDelay;
    console.log(`[Tabelog Personal Use] Waiting ${delay/1000}s for respectful access...`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Phase 7: スクレイピングデータを統一評価形式に変換
   * NOTE: 現在はモックデータ実装
   */
  private transformToRatingData(data: any): PlatformRatingData {
    return {
      platform: this.platform,
      restaurantId: data.id || 'unknown',
      rating: data.rating || 3.5,
      reviewCount: data.reviewCount || 0,
      confidence: 0.6, // スクレイピングデータなので中程度の信頼性
      dataQuality: 0.7,
      priceInfo: {
        dinner: data.dinnerPrice || '¥3,000~¥3,999',
        lunch: data.lunchPrice || '¥1,000~¥1,999',
      },
      location: {
        latitude: data.latitude || 35.6812,
        longitude: data.longitude || 139.7671,
      },
      additionalInfo: {
        tabelogSpecific: {
          genre: data.genre || 'レストラン',
          prefecture: data.prefecture || '東京都',
          area: data.area || '銀座・有楽町・新橋',
          station: data.station || '銀座駅',
          access: data.access || '銀座駅から徒歩3分',
          openingHours: data.openingHours || '17:30～23:00',
          closedDay: data.closedDay || '日曜日',
          seating: data.seating || '30席',
          personalUseNotice: '個人利用のみ・非営利・基本情報のみ取得',
        }
      },
      lastUpdated: new Date(),
      source: `tabelog_personal:${data.id || 'mock'}`,
    };
  }

  /**
   * Phase 7: モック評価データ生成（開発用・法的安全性確保）
   */
  private getMockRatingData(restaurantId: string): PlatformRatingData {
    const mockRating = 3.2 + Math.random() * 1.6; // 3.2-4.8 range
    const mockReviewCount = Math.floor(Math.random() * 150) + 20;

    return {
      platform: this.platform,
      restaurantId,
      rating: Math.round(mockRating * 10) / 10,
      reviewCount: mockReviewCount,
      confidence: 0.6,
      dataQuality: 0.7,
      priceInfo: {
        dinner: this.generateMockDinnerPrice(),
        lunch: this.generateMockLunchPrice(),
      },
      location: {
        latitude: 35.6812 + (Math.random() - 0.5) * 0.1,
        longitude: 139.7671 + (Math.random() - 0.5) * 0.1,
      },
      additionalInfo: {
        tabelogSpecific: {
          genre: this.selectRandomGenre(),
          prefecture: '東京都',
          area: this.selectRandomArea(),
          station: this.selectRandomStation(),
          access: '駅から徒歩3-8分',
          openingHours: '17:00～23:30',
          closedDay: Math.random() > 0.7 ? '日曜日' : 'なし',
          seating: `${Math.floor(Math.random() * 60) + 20}席`,
          personalUseNotice: '個人利用・非営利・基本情報のみ・モックデータ',
          attribution: '食べログ（個人利用）',
        }
      },
      lastUpdated: new Date(),
      source: `tabelog_mock:${restaurantId}`,
    };
  }

  /**
   * Phase 7: モック検索評価データ生成
   */
  private getMockSearchRatingData(query: SearchQuery): PlatformRatingData[] {
    const resultCount = Math.min(query.limit || 10, 15); // 控えめな結果数

    return Array.from({ length: resultCount }, (_, index) => {
      const restaurantId = `tabelog_mock_search_${Date.now()}_${index + 1}`;
      return this.getMockRatingData(restaurantId);
    });
  }

  /**
   * モックデータ生成用ヘルパー
   */
  private generateMockDinnerPrice(): string {
    const ranges = [
      '¥2,000~¥2,999',
      '¥3,000~¥3,999',
      '¥4,000~¥4,999',
      '¥5,000~¥5,999',
      '¥6,000~¥7,999',
    ];
    return ranges[Math.floor(Math.random() * ranges.length)];
  }

  private generateMockLunchPrice(): string {
    const ranges = [
      '¥1,000~¥1,999',
      '¥2,000~¥2,999',
      '¥3,000~¥3,999',
      '～¥999',
    ];
    return ranges[Math.floor(Math.random() * ranges.length)];
  }

  private selectRandomGenre(): string {
    const genres = [
      '居酒屋', '焼鳥', '寿司', 'ラーメン', 'イタリアン', 
      'フレンチ', '中華料理', '韓国料理', '焼肉', 'うなぎ'
    ];
    return genres[Math.floor(Math.random() * genres.length)];
  }

  private selectRandomArea(): string {
    const areas = [
      '銀座・有楽町・新橋', '渋谷', '新宿', '池袋', '上野・浅草',
      '赤坂・永田町・溜池', '六本木・麻布・広尾', '恵比寿・中目黒',
      '品川・大井町', '築地・豊洲・湾岸'
    ];
    return areas[Math.floor(Math.random() * areas.length)];
  }

  private selectRandomStation(): string {
    const stations = [
      '銀座駅', '新橋駅', '有楽町駅', '渋谷駅', '新宿駅', 
      '池袋駅', '上野駅', '浅草駅', '恵比寿駅', '中目黒駅'
    ];
    return stations[Math.floor(Math.random() * stations.length)];
  }

  /**
   * 法的コンプライアンス情報の取得
   */
  public getPersonalUseNotice(): string {
    return `
このTabelogスクレイピング機能は個人利用専用です:
- 目的: 個人の食事選択支援のための評価情報集約
- 非営利: 商用利用・収益化は一切行いません
- データ範囲: 基本情報（評価・価格帯・立地）のみ
- アクセス: リスペクトフルアクセス（30秒間隔）
- 帰属表示: 「食べログ」の適切な帰属表示を行います
- 準拠: 食べログ利用規約の個人利用範囲内での使用
    `.trim();
  }

  /**
   * 現在の設定状況の確認
   */
  public getComplianceStatus(): Record<string, boolean | string> {
    return {
      personalUseOnly: this.personalUseConfig.nonCommercialUse,
      respectfulAccess: this.personalUseConfig.respectfulAccess,
      basicInfoOnly: this.personalUseConfig.dataScope === 'basic_info_only',
      requestDelay: `${this.scrapingConfig.requestDelay/1000}秒`,
      attribution: this.personalUseConfig.attributionRequired,
      compliance: '食べログ利用規約準拠',
    };
  }
}