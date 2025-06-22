import { CacheService } from './cacheService';
import { config } from '@/utils/config';
import { AlertNotificationService } from './alertNotificationService';

export interface ApiUsageData {
  platform: 'hotpepper' | 'google' | 'tabelog';
  requests: {
    minute: number;
    hour: number;
    day: number;
    week?: number;
  };
  limits: {
    minute: number;
    hour: number;
    day: number;
    week?: number;
  };
  lastReset: {
    minute: Date;
    hour: Date;
    day: Date;
    week?: Date;
  };
}

export interface ApiUsageAlert {
  platform: string;
  level: 'warning' | 'critical' | 'blocked';
  message: string;
  percentage: number;
  timestamp: Date;
  action: 'throttle' | 'disable' | 'fallback';
}

export class ApiUsageMonitor {
  private cache: CacheService;
  private alertNotificationService: AlertNotificationService;
  private alertThresholds = {
    warning: 0.75,  // 75%使用で警告
    critical: 0.90, // 90%使用で重大警告
    blocked: 1.0    // 100%使用で機能停止
  };

  constructor() {
    this.cache = new CacheService();
    this.alertNotificationService = new AlertNotificationService();
  }

  /**
   * API使用量を記録
   */
  public async recordApiUsage(platform: 'hotpepper' | 'google' | 'tabelog'): Promise<void> {
    const now = new Date();
    const usage = await this.getUsageData(platform);

    // 時間窓のリセット処理
    this.resetExpiredWindows(usage, now);

    // 使用量をインクリメント
    usage.requests.minute++;
    usage.requests.hour++;
    usage.requests.day++;
    if (usage.requests.week !== undefined) {
      usage.requests.week++;
    }

    // キャッシュに保存
    await this.saveUsageData(platform, usage);

    // 制限チェックとアラート
    await this.checkLimitsAndAlert(platform, usage);
  }

  /**
   * API使用可能性をチェック
   */
  public async canUseApi(platform: 'hotpepper' | 'google' | 'tabelog'): Promise<{
    allowed: boolean;
    reason?: string;
    alternatives?: string[];
  }> {
    const usage = await this.getUsageData(platform);
    const now = new Date();

    // 時間窓のリセット処理
    this.resetExpiredWindows(usage, now);

    // 各制限をチェック
    const checks = [
      { 
        type: 'minute', 
        current: usage.requests.minute, 
        limit: usage.limits.minute 
      },
      { 
        type: 'hour', 
        current: usage.requests.hour, 
        limit: usage.limits.hour 
      },
      { 
        type: 'day', 
        current: usage.requests.day, 
        limit: usage.limits.day 
      }
    ];

    if (platform === 'tabelog' && usage.requests.week !== undefined) {
      checks.push({
        type: 'week',
        current: usage.requests.week,
        limit: usage.limits.week!
      });
    }

    for (const check of checks) {
      if (check.current >= check.limit) {
        return {
          allowed: false,
          reason: `${platform} API ${check.type}ly limit exceeded (${check.current}/${check.limit})`,
          alternatives: this.getAlternatives(platform)
        };
      }
    }

    return { allowed: true };
  }

  /**
   * 使用量データを取得
   */
  private async getUsageData(platform: 'hotpepper' | 'google' | 'tabelog'): Promise<ApiUsageData> {
    const cacheKey = `api_usage:${platform}`;
    const cached = await this.cache.get<ApiUsageData>(cacheKey);

    if (cached) {
      return cached;
    }

    // 初期データを作成
    const now = new Date();
    const initialData: ApiUsageData = {
      platform,
      requests: {
        minute: 0,
        hour: 0,
        day: 0,
        ...(platform === 'tabelog' && { week: 0 })
      },
      limits: this.getLimitsForPlatform(platform),
      lastReset: {
        minute: now,
        hour: now,
        day: now,
        ...(platform === 'tabelog' && { week: now })
      }
    };

    await this.saveUsageData(platform, initialData);
    return initialData;
  }

  /**
   * プラットフォーム別制限値を取得
   */
  private getLimitsForPlatform(platform: 'hotpepper' | 'google' | 'tabelog') {
    switch (platform) {
      case 'hotpepper':
        return {
          minute: parseInt(process.env.HOTPEPPER_FREE_TIER_RPM || '2', 10),
          hour: parseInt(process.env.HOTPEPPER_FREE_TIER_RPH || '50', 10),
          day: parseInt(process.env.HOTPEPPER_FREE_TIER_RPD || '300', 10)
        };
      case 'google':
        return {
          minute: 60,
          hour: 3600,
          day: parseInt(process.env.GOOGLE_PLACES_REQUESTS_PER_DAY || '1000', 10)
        };
      case 'tabelog':
        return {
          minute: 1,
          hour: 5,
          day: 10,
          week: parseInt(process.env.TABELOG_FREE_TIER_WEEKLY_LIMIT || '50', 10)
        };
      default:
        throw new Error(`Unknown platform: ${platform}`);
    }
  }

  /**
   * 期限切れの時間窓をリセット
   */
  private resetExpiredWindows(usage: ApiUsageData, now: Date): void {
    // 分単位リセット
    if (now.getTime() - usage.lastReset.minute.getTime() >= 60000) {
      usage.requests.minute = 0;
      usage.lastReset.minute = now;
    }

    // 時間単位リセット
    if (now.getTime() - usage.lastReset.hour.getTime() >= 3600000) {
      usage.requests.hour = 0;
      usage.lastReset.hour = now;
    }

    // 日単位リセット
    if (now.getTime() - usage.lastReset.day.getTime() >= 86400000) {
      usage.requests.day = 0;
      usage.lastReset.day = now;
    }

    // 週単位リセット（Tabelogのみ）
    if (usage.lastReset.week && now.getTime() - usage.lastReset.week.getTime() >= 604800000) {
      usage.requests.week = 0;
      usage.lastReset.week = now;
    }
  }

  /**
   * 使用量データを保存
   */
  private async saveUsageData(platform: string, data: ApiUsageData): Promise<void> {
    const cacheKey = `api_usage:${platform}`;
    // 24時間のTTLで保存
    await this.cache.set(cacheKey, data, 86400);
  }

  /**
   * 制限チェックとアラート送信
   */
  private async checkLimitsAndAlert(platform: string, usage: ApiUsageData): Promise<void> {
    const checks = [
      { type: 'minute', current: usage.requests.minute, limit: usage.limits.minute },
      { type: 'hour', current: usage.requests.hour, limit: usage.limits.hour },
      { type: 'day', current: usage.requests.day, limit: usage.limits.day }
    ];

    if (usage.requests.week !== undefined) {
      checks.push({ 
        type: 'week', 
        current: usage.requests.week, 
        limit: usage.limits.week! 
      });
    }

    for (const check of checks) {
      const percentage = check.current / check.limit;
      
      if (percentage >= this.alertThresholds.blocked) {
        await this.sendAlert({
          platform,
          level: 'blocked',
          message: `${platform} API ${check.type}ly limit exceeded (${check.current}/${check.limit})`,
          percentage,
          timestamp: new Date(),
          action: 'disable'
        });
      } else if (percentage >= this.alertThresholds.critical) {
        await this.sendAlert({
          platform,
          level: 'critical',
          message: `${platform} API ${check.type}ly usage critical (${check.current}/${check.limit})`,
          percentage,
          timestamp: new Date(),
          action: 'throttle'
        });
      } else if (percentage >= this.alertThresholds.warning) {
        await this.sendAlert({
          platform,
          level: 'warning',
          message: `${platform} API ${check.type}ly usage warning (${check.current}/${check.limit})`,
          percentage,
          timestamp: new Date(),
          action: 'fallback'
        });
      }
    }
  }

  /**
   * アラート送信
   */
  private async sendAlert(alert: ApiUsageAlert): Promise<void> {
    // アラート履歴をキャッシュに保存
    const alertKey = `alerts:${alert.platform}:${alert.level}`;
    await this.cache.set(alertKey, alert, 3600); // 1時間保持

    // アラート通知サービスを使用してアラートを送信
    await this.alertNotificationService.sendAlert(alert);

    // 重大アラートの場合は追加の通知処理
    if (alert.level === 'critical' || alert.level === 'blocked') {
      await this.handleCriticalAlert(alert);
    }
  }

  /**
   * 重大アラートの処理
   */
  private async handleCriticalAlert(alert: ApiUsageAlert): Promise<void> {
    // システム設定を更新して一時的にAPIを無効化
    if (alert.action === 'disable') {
      const configKey = `temp_disable:${alert.platform}`;
      await this.cache.set(configKey, { 
        disabled: true, 
        reason: alert.message,
        until: new Date(Date.now() + 3600000) // 1時間後まで
      }, 3600);
    }

    // 管理者通知（実装例）
    // await this.notifyAdministrators(alert);
  }

  /**
   * 代替手段を取得
   */
  private getAlternatives(platform: string): string[] {
    switch (platform) {
      case 'hotpepper':
        return ['tabelog_scraping', 'local_database', 'cached_data'];
      case 'google':
        return ['hotpepper', 'tabelog_scraping', 'local_database'];
      case 'tabelog':
        return ['hotpepper', 'local_database', 'cached_data'];
      default:
        return ['local_database', 'cached_data'];
    }
  }

  /**
   * 使用量統計を取得
   */
  public async getUsageStats(): Promise<{
    platforms: Record<string, ApiUsageData>;
    alerts: ApiUsageAlert[];
    systemStatus: 'healthy' | 'warning' | 'critical' | 'degraded';
  }> {
    const platforms: Record<string, ApiUsageData> = {};
    const alerts: ApiUsageAlert[] = [];

    // 各プラットフォームの使用量を取得
    for (const platform of ['hotpepper', 'google', 'tabelog'] as const) {
      platforms[platform] = await this.getUsageData(platform);
      
      // アラート履歴を取得
      for (const level of ['warning', 'critical', 'blocked'] as const) {
        const alertKey = `alerts:${platform}:${level}`;
        const alert = await this.cache.get<ApiUsageAlert>(alertKey);
        if (alert) {
          alerts.push(alert);
        }
      }
    }

    // システム全体のステータスを判定
    const systemStatus = this.determineSystemStatus(platforms, alerts);

    return {
      platforms,
      alerts: alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()),
      systemStatus
    };
  }

  /**
   * システム全体のステータスを判定
   */
  private determineSystemStatus(
    platforms: Record<string, ApiUsageData>,
    alerts: ApiUsageAlert[]
  ): 'healthy' | 'warning' | 'critical' | 'degraded' {
    const recentAlerts = alerts.filter(
      alert => Date.now() - alert.timestamp.getTime() < 3600000 // 1時間以内
    );

    const blockedAlerts = recentAlerts.filter(alert => alert.level === 'blocked');
    const criticalAlerts = recentAlerts.filter(alert => alert.level === 'critical');
    const warningAlerts = recentAlerts.filter(alert => alert.level === 'warning');

    if (blockedAlerts.length > 0) {
      return 'degraded';
    } else if (criticalAlerts.length > 0) {
      return 'critical';
    } else if (warningAlerts.length > 0) {
      return 'warning';
    } else {
      return 'healthy';
    }
  }

  /**
   * 制限リセット時間を取得
   */
  public async getNextResetTimes(platform: 'hotpepper' | 'google' | 'tabelog'): Promise<{
    minute: Date;
    hour: Date;
    day: Date;
    week?: Date;
  }> {
    const usage = await this.getUsageData(platform);
    
    return {
      minute: new Date(usage.lastReset.minute.getTime() + 60000),
      hour: new Date(usage.lastReset.hour.getTime() + 3600000),
      day: new Date(usage.lastReset.day.getTime() + 86400000),
      ...(usage.lastReset.week && {
        week: new Date(usage.lastReset.week.getTime() + 604800000)
      })
    };
  }
}