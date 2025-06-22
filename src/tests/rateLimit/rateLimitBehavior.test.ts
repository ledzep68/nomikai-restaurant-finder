import { FreeTierRatingService } from '../../services/freeTierRatingService';

// モック設定
jest.mock('../../services/externalApi/hotpepperApiClient');
jest.mock('../../services/externalApi/tabelogScrapingClient');
jest.mock('../../services/cache/multiPlatformCacheService');

describe('Rate Limit Behavior Tests', () => {
  let service: FreeTierRatingService;

  beforeEach(() => {
    // 環境変数設定
    process.env.ENABLE_FREE_TIER_MODE = 'true';
    process.env.ENABLE_HOTPEPPER = 'true';
    process.env.ENABLE_TABELOG = 'true';
    process.env.HOTPEPPER_FREE_TIER_RPM = '2';
    process.env.HOTPEPPER_FREE_TIER_RPH = '50';
    process.env.HOTPEPPER_FREE_TIER_RPD = '300';
    process.env.TABELOG_FREE_TIER_WEEKLY_LIMIT = '50';

    service = new FreeTierRatingService();
  });

  afterEach(() => {
    service.destroy();
    jest.clearAllMocks();
  });

  describe('HotPepperレート制限テスト', () => {
    beforeEach(() => {
      // レート制限カウンターをリセット
      service['requestCounts'] = {
        hotpepper: { minute: 0, hour: 0, day: 0, lastReset: { minute: 0, hour: 0, day: 0 } },
        tabelog: { week: 0, lastReset: 0 }
      };
    });

    it('分単位制限（2回/分）の動作確認', () => {
      // 初期状態では要求可能
      expect(service['canMakeHotpepperRequest']()).toBe(true);

      // 1回目の要求
      service['incrementHotpepperCount']();
      expect(service['canMakeHotpepperRequest']()).toBe(true);

      // 2回目の要求
      service['incrementHotpepperCount']();
      expect(service['canMakeHotpepperRequest']()).toBe(false); // 制限到達

      // 3回目は拒否される
      expect(service['canMakeHotpepperRequest']()).toBe(false);
    });

    it('時間単位制限（50回/時）の動作確認', () => {
      // 分制限をリセット（時間制限のみテスト）
      service['requestCounts'].hotpepper.minute = 0;
      
      // 49回まで実行
      for (let i = 0; i < 49; i++) {
        service['incrementHotpepperCount']();
      }
      
      expect(service['canMakeHotpepperRequest']()).toBe(true);
      
      // 50回目で制限到達
      service['incrementHotpepperCount']();
      expect(service['canMakeHotpepperRequest']()).toBe(false);
    });

    it('日単位制限（300回/日）の動作確認', () => {
      // 分・時間制限をリセット
      service['requestCounts'].hotpepper.minute = 0;
      service['requestCounts'].hotpepper.hour = 0;
      
      // 299回まで実行
      for (let i = 0; i < 299; i++) {
        service['incrementHotpepperCount']();
      }
      
      expect(service['canMakeHotpepperRequest']()).toBe(true);
      
      // 300回目で制限到達
      service['incrementHotpepperCount']();
      expect(service['canMakeHotpepperRequest']()).toBe(false);
    });

    it('複数制限の組み合わせテスト', () => {
      // 日制限に達している状態
      service['requestCounts'].hotpepper.day = 300;
      
      expect(service['canMakeHotpepperRequest']()).toBe(false);
      
      // 日制限をリセットしても、分制限があれば拒否される
      service['requestCounts'].hotpepper.day = 0;
      service['requestCounts'].hotpepper.minute = 2;
      
      expect(service['canMakeHotpepperRequest']()).toBe(false);
    });

    it('使用状況レポートの正確性', () => {
      // テスト用のカウント設定
      service['requestCounts'].hotpepper.minute = 1;
      service['requestCounts'].hotpepper.hour = 25;
      service['requestCounts'].hotpepper.day = 150;

      const report = service.getUsageReport();

      expect(report.hotpepper.minute).toBe(1);
      expect(report.hotpepper.hour).toBe(25);
      expect(report.hotpepper.day).toBe(150);
      expect(report.limits.hotpepper.requestsPerMinute).toBe(2);
      expect(report.limits.hotpepper.requestsPerHour).toBe(50);
      expect(report.limits.hotpepper.requestsPerDay).toBe(300);
    });
  });

  describe('食べログレート制限テスト', () => {
    beforeEach(() => {
      // カウンターリセット
      service['requestCounts'].tabelog = { week: 0, lastReset: Date.now() };
    });

    it('週単位制限（50回/週）の動作確認', () => {
      // 初期状態では要求可能
      expect(service['canMakeTabelogRequest']()).toBe(true);

      // 49回まで実行
      for (let i = 0; i < 49; i++) {
        service['incrementTabelogCount']();
      }

      expect(service['canMakeTabelogRequest']()).toBe(true);

      // 50回目で制限到達
      service['incrementTabelogCount']();
      expect(service['canMakeTabelogRequest']()).toBe(false);
    });

    it('週次リセットの動作確認', () => {
      // 制限まで使い切る
      service['requestCounts'].tabelog.week = 50;
      expect(service['canMakeTabelogRequest']()).toBe(false);

      // 7日前にリセット時刻を設定（週が経過したことをシミュレート）
      const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000 + 1000);
      service['requestCounts'].tabelog.lastReset = weekAgo;

      // 制限チェック時に自動リセットされる
      expect(service['canMakeTabelogRequest']()).toBe(true);
      expect(service['requestCounts'].tabelog.week).toBe(0);
    });

    it('食べログ使用状況レポート', () => {
      service['requestCounts'].tabelog.week = 30;

      const report = service.getUsageReport();

      expect(report.tabelog.week).toBe(30);
      expect(report.limits.tabelog.weeklyLimit).toBe(50);
    });
  });

  describe('レート制限状況での実際のAPI呼び出しテスト', () => {
    it('HotPepper制限時の統合評価取得', async () => {
      const restaurantId = 'rate-limit-integration-test';

      // キャッシュミスをモック
      service['cacheService'].getUnifiedRating = jest.fn().mockReturnValue(null);
      service['cacheService'].getPlatformRatingData = jest.fn().mockReturnValue(null);

      // レート制限に達している状態
      service['requestCounts'].hotpepper.minute = 2;

      const result = await service.getUnifiedRating(restaurantId);

      expect(result.unifiedRating).toBeNull();
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('RATE_LIMIT_EXCEEDED');
      expect(result.errors[0].platform).toBe('hotpepper');
      expect(result.partialData).toBe(true);
    });

    it('食べログ制限時でもHotPepperで継続動作', async () => {
      const restaurantId = 'tabelog-limit-test';

      // キャッシュミス
      service['cacheService'].getUnifiedRating = jest.fn().mockReturnValue(null);
      service['cacheService'].getPlatformRatingData = jest.fn().mockReturnValue(null);

      // HotPepperは制限内、食べログは制限到達
      service['requestCounts'].hotpepper.minute = 0;
      service['requestCounts'].tabelog.week = 50;

      const mockHotpepperData = {
        platform: 'hotpepper' as const,
        restaurantId,
        rating: 4.0,
        reviewCount: 100,
        confidence: 0.8,
        dataQuality: 0.9,
        lastUpdated: new Date(),
        source: `hotpepper:${restaurantId}`,
      };

      service['hotpepperClient'].getRatingData = jest.fn().mockResolvedValue(mockHotpepperData);

      const result = await service.getUnifiedRating(restaurantId);

      expect(result.unifiedRating).not.toBeNull();
      expect(result.unifiedRating!.platforms).toHaveLength(1);
      expect(result.unifiedRating!.platforms[0].platform).toBe('hotpepper');
      expect(result.errors).toHaveLength(0); // 食べログ制限はエラーにならない
    });

    it('検索時のレート制限動作', async () => {
      const searchQuery = {
        location: '新宿',
        genre: 'イタリアン',
        limit: 10,
      };

      // キャッシュミス
      service['cacheService'].getSearchResults = jest.fn().mockReturnValue(null);
      
      // レート制限到達
      service['requestCounts'].hotpepper.hour = 50;

      const results = await service.searchUnifiedRatings(searchQuery);

      expect(results).toHaveLength(1);
      expect(results[0].unifiedRating).toBeNull();
      expect(results[0].errors[0].code).toBe('RATE_LIMIT_EXCEEDED');
    });
  });

  describe('レート制限回復シナリオテスト', () => {
    it('分単位制限の自動リセット', async () => {
      // 制限到達状態
      service['requestCounts'].hotpepper.minute = 2;
      service['requestCounts'].hotpepper.lastReset.minute = Date.now() - 30000; // 30秒前

      expect(service['canMakeHotpepperRequest']()).toBe(false);

      // 1分経過をシミュレート
      service['requestCounts'].hotpepper.lastReset.minute = Date.now() - 61000; // 61秒前

      // リセットチェックを実行
      service['resetCountersIfNeeded']();

      expect(service['canMakeHotpepperRequest']()).toBe(true);
      expect(service['requestCounts'].hotpepper.minute).toBe(0);
    });

    it('時間単位制限の自動リセット', () => {
      // 制限到達状態
      service['requestCounts'].hotpepper.hour = 50;
      service['requestCounts'].hotpepper.lastReset.hour = Date.now() - 1800000; // 30分前

      expect(service['canMakeHotpepperRequest']()).toBe(false);

      // 1時間経過をシミュレート
      service['requestCounts'].hotpepper.lastReset.hour = Date.now() - 3601000; // 1時間1秒前

      service['resetCountersIfNeeded']();

      expect(service['canMakeHotpepperRequest']()).toBe(true);
      expect(service['requestCounts'].hotpepper.hour).toBe(0);
    });

    it('日単位制限の自動リセット', () => {
      // 制限到達状態
      service['requestCounts'].hotpepper.day = 300;
      service['requestCounts'].hotpepper.lastReset.day = Date.now() - 43200000; // 12時間前

      expect(service['canMakeHotpepperRequest']()).toBe(false);

      // 1日経過をシミュレート
      service['requestCounts'].hotpepper.lastReset.day = Date.now() - 86401000; // 1日1秒前

      service['resetCountersIfNeeded']();

      expect(service['canMakeHotpepperRequest']()).toBe(true);
      expect(service['requestCounts'].hotpepper.day).toBe(0);
    });
  });

  describe('極端な使用パターンテスト', () => {
    it('短時間での大量リクエスト処理', () => {
      // 短時間で10回のリクエスト試行
      const attemptResults: boolean[] = [];

      for (let i = 0; i < 10; i++) {
        const canMake = service['canMakeHotpepperRequest']();
        attemptResults.push(canMake);
        
        if (canMake) {
          service['incrementHotpepperCount']();
        }
      }

      // 最初の2回のみ成功、残りは失敗
      expect(attemptResults[0]).toBe(true);
      expect(attemptResults[1]).toBe(true);
      expect(attemptResults[2]).toBe(false);
      expect(attemptResults[9]).toBe(false);

      // 成功回数の確認
      const successCount = attemptResults.filter(result => result).length;
      expect(successCount).toBe(2);
    });

    it('24時間連続使用シミュレーション', () => {
      let successfulRequests = 0;
      let rejectedRequests = 0;
      
      // 24時間で1440分（1分ごとに1回試行）
      for (let minute = 0; minute < 1440; minute++) {
        // 分単位リセットをシミュレート
        if (minute % 1 === 0) {
          service['requestCounts'].hotpepper.minute = 0;
        }
        
        // 時間単位リセットをシミュレート
        if (minute % 60 === 0) {
          service['requestCounts'].hotpepper.hour = 0;
        }

        if (service['canMakeHotpepperRequest']()) {
          service['incrementHotpepperCount']();
          successfulRequests++;
        } else {
          rejectedRequests++;
        }
      }

      console.log(`24h simulation: ${successfulRequests} successful, ${rejectedRequests} rejected`);
      
      // 1日最大300回の制限内であることを確認
      expect(successfulRequests).toBeLessThanOrEqual(300);
      expect(successfulRequests).toBeGreaterThan(250); // 効率的な利用
    });

    it('混合パターン（バーストとアイドル）', () => {
      let totalRequests = 0;
      
      // パターン1: 朝のバースト（5分で10回試行）
      for (let i = 0; i < 10; i++) {
        if (service['canMakeHotpepperRequest']()) {
          service['incrementHotpepperCount']();
          totalRequests++;
        }
      }
      
      // 最大2回のみ成功（分単位制限）
      expect(totalRequests).toBe(2);
      
      // パターン2: 1分後のリセット後
      service['requestCounts'].hotpepper.minute = 0;
      
      for (let i = 0; i < 5; i++) {
        if (service['canMakeHotpepperRequest']()) {
          service['incrementHotpepperCount']();
          totalRequests++;
        }
      }
      
      // さらに2回成功
      expect(totalRequests).toBe(4);
    });
  });

  describe('エラー・例外ケース', () => {
    it('カウンター操作の整合性確認', () => {
      const initialCount = service['requestCounts'].hotpepper.day;
      
      // 直接カウンターを操作（異常ケース）
      service['requestCounts'].hotpepper.day = -1;
      
      // 負の値でも制限チェックが正常動作することを確認
      expect(service['canMakeHotpepperRequest']()).toBe(true);
      
      // 正常なインクリメント
      service['incrementHotpepperCount']();
      expect(service['requestCounts'].hotpepper.day).toBe(0);
    });

    it('時刻操作に対する耐性', () => {
      // 未来の時刻を設定（システムクロック調整をシミュレート）
      const futureTime = Date.now() + 86400000; // 1日後
      service['requestCounts'].hotpepper.lastReset.day = futureTime;
      
      // リセット処理が正常に動作することを確認
      service['resetCountersIfNeeded']();
      
      expect(service['canMakeHotpepperRequest']()).toBe(true);
    });

    it('極端に大きなカウンター値の処理', () => {
      // 異常に大きな値を設定
      service['requestCounts'].hotpepper.day = Number.MAX_SAFE_INTEGER;
      
      expect(service['canMakeHotpepperRequest']()).toBe(false);
      
      // リセットが正常に動作することを確認
      service['requestCounts'].hotpepper.lastReset.day = 0;
      service['resetCountersIfNeeded']();
      
      expect(service['requestCounts'].hotpepper.day).toBe(0);
    });
  });
});