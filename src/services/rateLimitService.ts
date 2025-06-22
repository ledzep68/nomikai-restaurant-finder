import { ApiUsageMonitor } from './apiUsageMonitor';
import { CacheService } from './cacheService';

export interface RateLimitResult {
  allowed: boolean;
  remaining: {
    minute: number;
    hour: number;
    day: number;
    week?: number;
  };
  resetTimes: {
    minute: Date;
    hour: Date;
    day: Date;
    week?: Date;
  };
  reason?: string;
  alternatives?: string[];
  retryAfter?: number; // seconds
}

export class RateLimitService {
  private monitor: ApiUsageMonitor;
  private cache: CacheService;

  constructor() {
    this.monitor = new ApiUsageMonitor();
    this.cache = new CacheService();
  }

  /**
   * API呼び出し前のレート制限チェック
   */
  public async checkRateLimit(platform: 'hotpepper' | 'google' | 'tabelog'): Promise<RateLimitResult> {
    // 一時的無効化チェック
    const tempDisabled = await this.checkTemporaryDisable(platform);
    if (tempDisabled.disabled) {
      return {
        allowed: false,
        remaining: { minute: 0, hour: 0, day: 0 },
        resetTimes: await this.monitor.getNextResetTimes(platform),
        reason: tempDisabled.reason,
        alternatives: this.getAlternativePlatforms(platform),
        retryAfter: Math.ceil((tempDisabled.until.getTime() - Date.now()) / 1000)
      };
    }

    // 使用量制限チェック
    const canUse = await this.monitor.canUseApi(platform);
    if (!canUse.allowed) {
      const resetTimes = await this.monitor.getNextResetTimes(platform);
      const nextReset = this.getNextResetTime(resetTimes);
      
      return {
        allowed: false,
        remaining: { minute: 0, hour: 0, day: 0 },
        resetTimes,
        reason: canUse.reason,
        alternatives: canUse.alternatives,
        retryAfter: Math.ceil((nextReset.getTime() - Date.now()) / 1000)
      };
    }

    // 残り使用可能回数を計算
    const remaining = await this.calculateRemaining(platform);
    const resetTimes = await this.monitor.getNextResetTimes(platform);

    return {
      allowed: true,
      remaining,
      resetTimes
    };
  }

  /**
   * API呼び出し実行とレート制限更新
   */
  public async executeWithRateLimit<T>(
    platform: 'hotpepper' | 'google' | 'tabelog',
    apiCall: () => Promise<T>
  ): Promise<{
    success: boolean;
    data?: T;
    error?: Error;
    rateLimitInfo: RateLimitResult;
  }> {
    // レート制限チェック
    const rateLimitCheck = await this.checkRateLimit(platform);
    
    if (!rateLimitCheck.allowed) {
      return {
        success: false,
        error: new Error(`Rate limit exceeded: ${rateLimitCheck.reason}`),
        rateLimitInfo: rateLimitCheck
      };
    }

    try {
      // 使用量を記録
      await this.monitor.recordApiUsage(platform);
      
      // API呼び出し実行
      const data = await apiCall();
      
      // 成功後の制限情報を再取得
      const updatedRateLimit = await this.checkRateLimit(platform);
      
      return {
        success: true,
        data,
        rateLimitInfo: updatedRateLimit
      };
    } catch (error) {
      // エラー時も制限情報を返す
      const updatedRateLimit = await this.checkRateLimit(platform);
      
      return {
        success: false,
        error: error as Error,
        rateLimitInfo: updatedRateLimit
      };
    }
  }

  /**
   * 一時的無効化チェック
   */
  private async checkTemporaryDisable(platform: string): Promise<{
    disabled: boolean;
    reason?: string;
    until?: Date;
  }> {
    const configKey = `temp_disable:${platform}`;
    const disableInfo = await this.cache.get<{
      disabled: boolean;
      reason: string;
      until: Date;
    }>(configKey);

    if (!disableInfo) {
      return { disabled: false };
    }

    // 期限切れチェック
    if (new Date(disableInfo.until).getTime() <= Date.now()) {
      await this.cache.delete(configKey);
      return { disabled: false };
    }

    return {
      disabled: true,
      reason: disableInfo.reason,
      until: new Date(disableInfo.until)
    };
  }

  /**
   * 残り使用可能回数を計算
   */
  private async calculateRemaining(platform: 'hotpepper' | 'google' | 'tabelog'): Promise<{
    minute: number;
    hour: number;
    day: number;
    week?: number;
  }> {
    const usage = await this.monitor['getUsageData'](platform);
    
    return {
      minute: Math.max(0, usage.limits.minute - usage.requests.minute),
      hour: Math.max(0, usage.limits.hour - usage.requests.hour),
      day: Math.max(0, usage.limits.day - usage.requests.day),
      ...(usage.limits.week && {
        week: Math.max(0, usage.limits.week - (usage.requests.week || 0))
      })
    };
  }

  /**
   * 次のリセット時間を取得
   */
  private getNextResetTime(resetTimes: {
    minute: Date;
    hour: Date;
    day: Date;
    week?: Date;
  }): Date {
    const times = [resetTimes.minute, resetTimes.hour, resetTimes.day];
    if (resetTimes.week) {
      times.push(resetTimes.week);
    }
    
    // 最も近い未来の時間を返す
    return times
      .filter(time => time.getTime() > Date.now())
      .sort((a, b) => a.getTime() - b.getTime())[0] || resetTimes.minute;
  }

  /**
   * 代替プラットフォームを取得
   */
  private getAlternativePlatforms(platform: string): string[] {
    switch (platform) {
      case 'hotpepper':
        return ['tabelog', 'local_cache'];
      case 'google':
        return ['hotpepper', 'tabelog', 'local_cache'];
      case 'tabelog':
        return ['hotpepper', 'local_cache'];
      default:
        return ['local_cache'];
    }
  }

  /**
   * プラットフォーム優先度付きでAPI実行
   */
  public async executeWithFallback<T>(
    platforms: ('hotpepper' | 'google' | 'tabelog')[],
    apiCalls: Record<string, () => Promise<T>>
  ): Promise<{
    success: boolean;
    data?: T;
    usedPlatform?: string;
    errors: Record<string, Error>;
    rateLimitInfo: Record<string, RateLimitResult>;
  }> {
    const errors: Record<string, Error> = {};
    const rateLimitInfo: Record<string, RateLimitResult> = {};

    for (const platform of platforms) {
      if (!apiCalls[platform]) {
        continue;
      }

      const result = await this.executeWithRateLimit(platform, apiCalls[platform]);
      rateLimitInfo[platform] = result.rateLimitInfo;

      if (result.success && result.data) {
        return {
          success: true,
          data: result.data,
          usedPlatform: platform,
          errors,
          rateLimitInfo
        };
      }

      if (result.error) {
        errors[platform] = result.error;
      }
    }

    return {
      success: false,
      errors,
      rateLimitInfo
    };
  }

  /**
   * 現在のレート制限状況をサマリー形式で取得
   */
  public async getRateLimitSummary(): Promise<{
    overall: 'healthy' | 'warning' | 'critical' | 'degraded';
    platforms: Record<string, {
      status: 'available' | 'limited' | 'blocked';
      remaining: { minute: number; hour: number; day: number; week?: number };
      nextReset: Date;
      percentage: { minute: number; hour: number; day: number; week?: number };
    }>;
  }> {
    const platforms = ['hotpepper', 'google', 'tabelog'] as const;
    const summary: any = {
      overall: 'healthy',
      platforms: {}
    };

    let criticalCount = 0;
    let warningCount = 0;

    for (const platform of platforms) {
      const rateLimitCheck = await this.checkRateLimit(platform);
      const usage = await this.monitor['getUsageData'](platform);
      
      // パーセンテージ計算
      const percentages = {
        minute: (usage.requests.minute / usage.limits.minute) * 100,
        hour: (usage.requests.hour / usage.limits.hour) * 100,
        day: (usage.requests.day / usage.limits.day) * 100,
        ...(usage.limits.week && {
          week: ((usage.requests.week || 0) / usage.limits.week) * 100
        })
      };

      // ステータス判定
      let status: 'available' | 'limited' | 'blocked' = 'available';
      const maxPercentage = Math.max(
        percentages.minute, 
        percentages.hour, 
        percentages.day,
        percentages.week || 0
      );

      if (!rateLimitCheck.allowed) {
        status = 'blocked';
        criticalCount++;
      } else if (maxPercentage >= 75) {
        status = 'limited';
        warningCount++;
      }

      summary.platforms[platform] = {
        status,
        remaining: rateLimitCheck.remaining,
        nextReset: rateLimitCheck.resetTimes.minute,
        percentage: percentages
      };
    }

    // 全体ステータス判定
    if (criticalCount > 1) {
      summary.overall = 'critical';
    } else if (criticalCount > 0) {
      summary.overall = 'degraded';
    } else if (warningCount > 0) {
      summary.overall = 'warning';
    }

    return summary;
  }
}