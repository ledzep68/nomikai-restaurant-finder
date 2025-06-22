import { Request, Response } from 'express';
import { ApiUsageMonitor } from '@/services/apiUsageMonitor';
import { RateLimitService } from '@/services/rateLimitService';
import { createError } from '@/middleware/errorHandler';

export class MonitoringController {
  private usageMonitor: ApiUsageMonitor;
  private rateLimitService: RateLimitService;

  constructor() {
    this.usageMonitor = new ApiUsageMonitor();
    this.rateLimitService = new RateLimitService();
  }

  /**
   * API使用量統計を取得
   */
  public async getUsageStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await this.usageMonitor.getUsageStats();
      
      res.json({
        status: 'success',
        data: {
          systemStatus: stats.systemStatus,
          platforms: stats.platforms,
          alerts: stats.alerts,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error fetching usage stats:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch usage statistics'
      });
    }
  }

  /**
   * レート制限サマリーを取得
   */
  public async getRateLimitSummary(req: Request, res: Response): Promise<void> {
    try {
      const summary = await this.rateLimitService.getRateLimitSummary();
      
      res.json({
        status: 'success',
        data: summary
      });
    } catch (error) {
      console.error('Error fetching rate limit summary:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch rate limit summary'
      });
    }
  }

  /**
   * 特定プラットフォームのレート制限状況を取得
   */
  public async getPlatformRateLimit(req: Request, res: Response): Promise<void> {
    try {
      const { platform } = req.params;
      
      if (!['hotpepper', 'google', 'tabelog'].includes(platform)) {
        throw createError('Invalid platform specified', 400);
      }

      const rateLimitCheck = await this.rateLimitService.checkRateLimit(
        platform as 'hotpepper' | 'google' | 'tabelog'
      );
      
      res.json({
        status: 'success',
        data: {
          platform,
          ...rateLimitCheck
        }
      });
    } catch (error) {
      console.error('Error checking platform rate limit:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to check platform rate limit'
      });
    }
  }

  /**
   * システム全体のヘルスチェック（レート制限含む）
   */
  public async getSystemHealth(req: Request, res: Response): Promise<void> {
    try {
      const [usageStats, rateLimitSummary] = await Promise.all([
        this.usageMonitor.getUsageStats(),
        this.rateLimitService.getRateLimitSummary()
      ]);

      // 全体的なヘルススコアを計算
      const healthScore = this.calculateHealthScore(usageStats, rateLimitSummary);
      
      res.json({
        status: 'success',
        data: {
          overall: {
            status: rateLimitSummary.overall,
            healthScore,
            message: this.getHealthMessage(rateLimitSummary.overall, healthScore)
          },
          apis: {
            usage: usageStats,
            rateLimit: rateLimitSummary
          },
          recommendations: this.getRecommendations(usageStats, rateLimitSummary),
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error fetching system health:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch system health'
      });
    }
  }

  /**
   * アラート履歴を取得
   */
  public async getAlertHistory(req: Request, res: Response): Promise<void> {
    try {
      const { platform, level, limit = 50 } = req.query;
      
      const stats = await this.usageMonitor.getUsageStats();
      let alerts = stats.alerts;

      // フィルタリング
      if (platform) {
        alerts = alerts.filter(alert => alert.platform === platform);
      }
      if (level) {
        alerts = alerts.filter(alert => alert.level === level);
      }

      // 制限
      alerts = alerts.slice(0, parseInt(limit as string, 10));

      res.json({
        status: 'success',
        data: {
          alerts,
          total: alerts.length,
          filters: { platform, level, limit }
        }
      });
    } catch (error) {
      console.error('Error fetching alert history:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to fetch alert history'
      });
    }
  }

  /**
   * 使用量予測を取得
   */
  public async getUsageForecast(req: Request, res: Response): Promise<void> {
    try {
      const { platform } = req.params;
      const { hours = 24 } = req.query;
      
      if (!['hotpepper', 'google', 'tabelog'].includes(platform)) {
        throw createError('Invalid platform specified', 400);
      }

      const forecast = await this.calculateUsageForecast(
        platform as 'hotpepper' | 'google' | 'tabelog',
        parseInt(hours as string, 10)
      );
      
      res.json({
        status: 'success',
        data: forecast
      });
    } catch (error) {
      console.error('Error calculating usage forecast:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to calculate usage forecast'
      });
    }
  }

  /**
   * ヘルススコアを計算
   */
  private calculateHealthScore(usageStats: any, rateLimitSummary: any): number {
    const platforms = Object.keys(rateLimitSummary.platforms);
    let totalScore = 0;

    for (const platform of platforms) {
      const platformData = rateLimitSummary.platforms[platform];
      const maxPercentage = Math.max(
        platformData.percentage.minute || 0,
        platformData.percentage.hour || 0,
        platformData.percentage.day || 0,
        platformData.percentage.week || 0
      );

      // 使用率に基づくスコア（100 - 使用率）
      const platformScore = Math.max(0, 100 - maxPercentage);
      totalScore += platformScore;
    }

    return Math.round(totalScore / platforms.length);
  }

  /**
   * ヘルスメッセージを生成
   */
  private getHealthMessage(status: string, score: number): string {
    switch (status) {
      case 'healthy':
        return `System is operating normally (Health Score: ${score}/100)`;
      case 'warning':
        return `Some APIs approaching limits (Health Score: ${score}/100)`;
      case 'critical':
        return `Critical API usage detected (Health Score: ${score}/100)`;
      case 'degraded':
        return `Service degraded due to API limits (Health Score: ${score}/100)`;
      default:
        return `System status unknown (Health Score: ${score}/100)`;
    }
  }

  /**
   * 推奨事項を生成
   */
  private getRecommendations(usageStats: any, rateLimitSummary: any): string[] {
    const recommendations: string[] = [];
    
    for (const [platform, data] of Object.entries(rateLimitSummary.platforms)) {
      const platformData = data as any;
      
      if (platformData.status === 'blocked') {
        recommendations.push(`${platform} API is blocked. Use alternative data sources.`);
      } else if (platformData.status === 'limited') {
        recommendations.push(`${platform} API approaching limits. Consider reducing request frequency.`);
      }
      
      const dayPercentage = platformData.percentage.day || 0;
      if (dayPercentage > 80) {
        recommendations.push(`${platform} daily limit at ${Math.round(dayPercentage)}%. Plan usage carefully.`);
      }
    }

    if (rateLimitSummary.overall === 'critical') {
      recommendations.push('Enable aggressive caching to reduce API calls.');
      recommendations.push('Consider upgrading to paid API tiers for critical services.');
    }

    if (recommendations.length === 0) {
      recommendations.push('System is healthy. Continue monitoring usage patterns.');
    }

    return recommendations;
  }

  /**
   * 使用量予測を計算
   */
  private async calculateUsageForecast(
    platform: 'hotpepper' | 'google' | 'tabelog',
    hours: number
  ): Promise<{
    platform: string;
    currentUsage: any;
    forecast: {
      hours: number;
      estimatedRequests: number;
      limitExceeded: boolean;
      timeToLimit?: number;
    };
    recommendations: string[];
  }> {
    // 現在の使用量を取得
    const rateLimitCheck = await this.rateLimitService.checkRateLimit(platform);
    const usageData = await this.usageMonitor['getUsageData'](platform);
    
    // 1時間あたりの平均使用率を計算
    const hourlyAverage = usageData.requests.hour; // 現在の1時間使用量をベースに
    const estimatedRequests = hourlyAverage * hours;
    
    // 予測期間内で制限に達するかチェック
    const dailyLimit = usageData.limits.day;
    const currentDailyUsage = usageData.requests.day;
    const limitExceeded = (currentDailyUsage + estimatedRequests) > dailyLimit;
    
    // 制限到達予測時間
    let timeToLimit: number | undefined;
    if (hourlyAverage > 0) {
      const remainingRequests = dailyLimit - currentDailyUsage;
      timeToLimit = Math.ceil(remainingRequests / hourlyAverage);
    }

    // 推奨事項
    const recommendations: string[] = [];
    if (limitExceeded) {
      recommendations.push('Reduce request frequency to avoid hitting daily limit');
      recommendations.push('Enable more aggressive caching');
      recommendations.push('Consider using alternative data sources');
    }

    return {
      platform,
      currentUsage: {
        minute: usageData.requests.minute,
        hour: usageData.requests.hour,
        day: usageData.requests.day,
        limits: usageData.limits
      },
      forecast: {
        hours,
        estimatedRequests,
        limitExceeded,
        timeToLimit
      },
      recommendations
    };
  }
}