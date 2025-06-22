import { ApiUsageAlert } from './apiUsageMonitor';
import { config } from '@/utils/config';

export interface NotificationChannel {
  type: 'console' | 'file' | 'webhook' | 'email';
  enabled: boolean;
  config?: any;
}

export interface AlertRule {
  platforms: string[];
  levels: ('warning' | 'critical' | 'blocked')[];
  channels: string[];
  throttleMinutes?: number;
}

export class AlertNotificationService {
  private channels: Map<string, NotificationChannel>;
  private alertRules: AlertRule[];
  private lastNotificationTimes: Map<string, Date>;

  constructor() {
    this.channels = new Map();
    this.alertRules = [];
    this.lastNotificationTimes = new Map();
    this.initializeChannels();
    this.initializeRules();
  }

  /**
   * 通知チャンネルを初期化
   */
  private initializeChannels(): void {
    // コンソール通知
    this.channels.set('console', {
      type: 'console',
      enabled: true
    });

    // ファイル通知
    this.channels.set('file', {
      type: 'file',
      enabled: true,
      config: {
        path: './logs/alerts.log'
      }
    });

    // Webhook通知（Slack、Discord等）
    if (process.env.ALERT_WEBHOOK_URL) {
      this.channels.set('webhook', {
        type: 'webhook',
        enabled: true,
        config: {
          url: process.env.ALERT_WEBHOOK_URL,
          timeout: 5000
        }
      });
    }

    // Email通知（将来の拡張用）
    if (process.env.ALERT_EMAIL_SMTP_HOST) {
      this.channels.set('email', {
        type: 'email',
        enabled: true,
        config: {
          smtp: {
            host: process.env.ALERT_EMAIL_SMTP_HOST,
            port: parseInt(process.env.ALERT_EMAIL_SMTP_PORT || '587', 10),
            user: process.env.ALERT_EMAIL_USER,
            password: process.env.ALERT_EMAIL_PASSWORD
          },
          from: process.env.ALERT_EMAIL_FROM || 'noreply@nomikai-finder.local',
          to: process.env.ALERT_EMAIL_TO?.split(',') || []
        }
      });
    }
  }

  /**
   * アラートルールを初期化
   */
  private initializeRules(): void {
    // 重要なアラートは全チャンネルに送信
    this.alertRules.push({
      platforms: ['hotpepper', 'google', 'tabelog'],
      levels: ['critical', 'blocked'],
      channels: Array.from(this.channels.keys()),
      throttleMinutes: 5 // 5分間の重複防止
    });

    // 警告レベルはコンソールとファイルのみ
    this.alertRules.push({
      platforms: ['hotpepper', 'google', 'tabelog'],
      levels: ['warning'],
      channels: ['console', 'file'],
      throttleMinutes: 15 // 15分間の重複防止
    });

    // HotPepper専用の重要アラート
    this.alertRules.push({
      platforms: ['hotpepper'],
      levels: ['blocked'],
      channels: Array.from(this.channels.keys()),
      throttleMinutes: 1 // 即座に通知
    });
  }

  /**
   * アラート送信
   */
  public async sendAlert(alert: ApiUsageAlert): Promise<void> {
    const applicableRules = this.getApplicableRules(alert);
    
    for (const rule of applicableRules) {
      // スロットル制御チェック
      if (this.isThrottled(alert, rule)) {
        continue;
      }

      // 各チャンネルに送信
      for (const channelName of rule.channels) {
        const channel = this.channels.get(channelName);
        if (channel?.enabled) {
          try {
            await this.sendToChannel(alert, channel);
            this.updateThrottleTime(alert, rule);
          } catch (error) {
            console.error(`Failed to send alert to ${channelName}:`, error);
          }
        }
      }
    }
  }

  /**
   * 適用可能なルールを取得
   */
  private getApplicableRules(alert: ApiUsageAlert): AlertRule[] {
    return this.alertRules.filter(rule => 
      rule.platforms.includes(alert.platform) &&
      rule.levels.includes(alert.level)
    );
  }

  /**
   * スロットル制御チェック
   */
  private isThrottled(alert: ApiUsageAlert, rule: AlertRule): boolean {
    if (!rule.throttleMinutes) {
      return false;
    }

    const throttleKey = `${alert.platform}:${alert.level}:${rule.channels.join(',')}`;
    const lastTime = this.lastNotificationTimes.get(throttleKey);
    
    if (!lastTime) {
      return false;
    }

    const throttleMs = rule.throttleMinutes * 60 * 1000;
    return (Date.now() - lastTime.getTime()) < throttleMs;
  }

  /**
   * スロットル時間を更新
   */
  private updateThrottleTime(alert: ApiUsageAlert, rule: AlertRule): void {
    const throttleKey = `${alert.platform}:${alert.level}:${rule.channels.join(',')}`;
    this.lastNotificationTimes.set(throttleKey, new Date());
  }

  /**
   * チャンネルに送信
   */
  private async sendToChannel(alert: ApiUsageAlert, channel: NotificationChannel): Promise<void> {
    switch (channel.type) {
      case 'console':
        await this.sendConsoleNotification(alert);
        break;
      case 'file':
        await this.sendFileNotification(alert, channel.config);
        break;
      case 'webhook':
        await this.sendWebhookNotification(alert, channel.config);
        break;
      case 'email':
        await this.sendEmailNotification(alert, channel.config);
        break;
    }
  }

  /**
   * コンソール通知
   */
  private async sendConsoleNotification(alert: ApiUsageAlert): Promise<void> {
    const emoji = this.getAlertEmoji(alert.level);
    const color = this.getAlertColor(alert.level);
    
    console.log(`\n${emoji} API USAGE ALERT ${emoji}`);
    console.log(`Platform: ${alert.platform.toUpperCase()}`);
    console.log(`Level: ${color}${alert.level.toUpperCase()}\x1b[0m`);
    console.log(`Message: ${alert.message}`);
    console.log(`Usage: ${Math.round(alert.percentage * 100)}%`);
    console.log(`Action: ${alert.action}`);
    console.log(`Time: ${alert.timestamp.toISOString()}`);
    console.log(`${'='.repeat(50)}\n`);
  }

  /**
   * ファイル通知
   */
  private async sendFileNotification(alert: ApiUsageAlert, config: any): Promise<void> {
    const fs = await import('fs');
    const path = await import('path');
    
    const logEntry = {
      timestamp: alert.timestamp.toISOString(),
      platform: alert.platform,
      level: alert.level,
      message: alert.message,
      percentage: Math.round(alert.percentage * 100),
      action: alert.action
    };

    const logLine = JSON.stringify(logEntry) + '\n';
    
    // ログディレクトリを作成
    const logDir = path.dirname(config.path);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    // ファイルに追記
    fs.appendFileSync(config.path, logLine);
  }

  /**
   * Webhook通知（Slack、Discord等）
   */
  private async sendWebhookNotification(alert: ApiUsageAlert, config: any): Promise<void> {
    const emoji = this.getAlertEmoji(alert.level);
    const color = this.getWebhookColor(alert.level);
    
    const payload = {
      embeds: [{
        title: `${emoji} API Usage Alert - ${alert.platform.toUpperCase()}`,
        description: alert.message,
        color: color,
        fields: [
          {
            name: 'Level',
            value: alert.level.toUpperCase(),
            inline: true
          },
          {
            name: 'Usage',
            value: `${Math.round(alert.percentage * 100)}%`,
            inline: true
          },
          {
            name: 'Action',
            value: alert.action,
            inline: true
          }
        ],
        timestamp: alert.timestamp.toISOString(),
        footer: {
          text: 'Nomikai Restaurant Finder API Monitor'
        }
      }]
    };

    try {
      const response = await fetch(config.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(config.timeout || 5000)
      });

      if (!response.ok) {
        throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Webhook notification failed:', error);
      throw error;
    }
  }

  /**
   * Email通知
   */
  private async sendEmailNotification(alert: ApiUsageAlert, config: any): Promise<void> {
    // 簡単なメール通知の実装
    // 実際の本番環境では nodemailer 等のライブラリを使用
    console.log('📧 Email notification would be sent:', {
      from: config.from,
      to: config.to,
      subject: `API Alert: ${alert.platform} ${alert.level}`,
      body: `
API Usage Alert

Platform: ${alert.platform}
Level: ${alert.level}
Message: ${alert.message}
Usage: ${Math.round(alert.percentage * 100)}%
Action: ${alert.action}
Time: ${alert.timestamp.toISOString()}

Please check the system immediately.
      `
    });
  }

  /**
   * アラートレベル別絵文字
   */
  private getAlertEmoji(level: string): string {
    switch (level) {
      case 'warning': return '⚠️';
      case 'critical': return '🚨';
      case 'blocked': return '🛑';
      default: return '📊';
    }
  }

  /**
   * アラートレベル別コンソール色
   */
  private getAlertColor(level: string): string {
    switch (level) {
      case 'warning': return '\x1b[33m'; // Yellow
      case 'critical': return '\x1b[31m'; // Red
      case 'blocked': return '\x1b[41m'; // Red background
      default: return '\x1b[0m'; // Reset
    }
  }

  /**
   * Webhook用カラーコード
   */
  private getWebhookColor(level: string): number {
    switch (level) {
      case 'warning': return 0xFFFF00; // Yellow
      case 'critical': return 0xFF4500; // Orange Red
      case 'blocked': return 0xFF0000; // Red
      default: return 0x0099FF; // Blue
    }
  }

  /**
   * 通知チャンネルの設定更新
   */
  public updateChannelConfig(channelName: string, config: Partial<NotificationChannel>): void {
    const existing = this.channels.get(channelName);
    if (existing) {
      this.channels.set(channelName, { ...existing, ...config });
    }
  }

  /**
   * アラートルールの追加
   */
  public addAlertRule(rule: AlertRule): void {
    this.alertRules.push(rule);
  }

  /**
   * 通知統計を取得
   */
  public getNotificationStats(): {
    channels: Array<{ name: string; enabled: boolean; type: string }>;
    rules: AlertRule[];
    recentThrottles: Array<{ key: string; lastTime: Date }>;
  } {
    return {
      channels: Array.from(this.channels.entries()).map(([name, channel]) => ({
        name,
        enabled: channel.enabled,
        type: channel.type
      })),
      rules: this.alertRules,
      recentThrottles: Array.from(this.lastNotificationTimes.entries()).map(([key, lastTime]) => ({
        key,
        lastTime
      }))
    };
  }
}