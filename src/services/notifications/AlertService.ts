/**
 * Alert and Notification Service
 * Phase 9: Comprehensive alerting system for system monitoring
 */

import { applicationLogger } from '../../utils/monitoring/applicationLogger';

export interface Alert {
  id: string;
  type: 'performance' | 'security' | 'system' | 'api' | 'compliance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  details?: Record<string, any>;
  timestamp: Date;
  source: string;
  acknowledged: boolean;
  resolved: boolean;
  escalated: boolean;
  escalationLevel: number;
  actions?: AlertAction[];
}

export interface AlertAction {
  id: string;
  label: string;
  type: 'acknowledge' | 'resolve' | 'escalate' | 'investigate' | 'custom';
  handler: (alert: Alert) => Promise<void>;
}

export interface AlertRule {
  id: string;
  name: string;
  type: Alert['type'];
  condition: (data: any) => boolean;
  severity: Alert['severity'];
  cooldownPeriod: number; // ミリ秒
  escalationRules?: EscalationRule[];
  enabled: boolean;
}

export interface EscalationRule {
  afterMinutes: number;
  action: 'email' | 'slack' | 'webhook' | 'log';
  target: string;
  message?: string;
}

export interface NotificationChannel {
  id: string;
  type: 'console' | 'email' | 'slack' | 'webhook' | 'browser';
  enabled: boolean;
  config: Record<string, any>;
}

export interface AlertStats {
  total: number;
  active: number;
  critical: number;
  byType: Record<Alert['type'], number>;
  bySeverity: Record<Alert['severity'], number>;
  recentCount: number;
  averageResolutionTime: number;
}

class AlertService {
  private alerts: Map<string, Alert> = new Map();
  private rules: Map<string, AlertRule> = new Map();
  private channels: Map<string, NotificationChannel> = new Map();
  private lastTriggered: Map<string, number> = new Map();
  private escalationTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.initializeDefaultRules();
    this.initializeDefaultChannels();
  }

  private initializeDefaultRules() {
    const defaultRules: AlertRule[] = [
      {
        id: 'high_response_time',
        name: 'High API Response Time',
        type: 'performance',
        condition: (data) => data.responseTime > 3000,
        severity: 'high',
        cooldownPeriod: 300000, // 5分
        escalationRules: [
          {
            afterMinutes: 10,
            action: 'log',
            target: 'system',
            message: 'Response time remains high after 10 minutes',
          },
        ],
        enabled: true,
      },
      {
        id: 'memory_usage_critical',
        name: 'Critical Memory Usage',
        type: 'system',
        condition: (data) => data.memoryUsage > 500 * 1024 * 1024, // 500MB
        severity: 'critical',
        cooldownPeriod: 60000, // 1分
        escalationRules: [
          {
            afterMinutes: 5,
            action: 'log',
            target: 'system',
            message: 'Memory usage critical for 5+ minutes',
          },
        ],
        enabled: true,
      },
      {
        id: 'rate_limit_exceeded',
        name: 'API Rate Limit Exceeded',
        type: 'api',
        condition: (data) => data.rateLimitExceeded === true,
        severity: 'medium',
        cooldownPeriod: 600000, // 10分
        enabled: true,
      },
      {
        id: 'high_error_rate',
        name: 'High Error Rate',
        type: 'system',
        condition: (data) => data.errorRate > 0.1, // 10%
        severity: 'critical',
        cooldownPeriod: 300000, // 5分
        escalationRules: [
          {
            afterMinutes: 15,
            action: 'log',
            target: 'system',
            message: 'Error rate remains high after 15 minutes',
          },
        ],
        enabled: true,
      },
      {
        id: 'cache_hit_rate_low',
        name: 'Low Cache Hit Rate',
        type: 'performance',
        condition: (data) => data.cacheHitRate < 0.3, // 30%未満
        severity: 'medium',
        cooldownPeriod: 900000, // 15分
        enabled: true,
      },
      {
        id: 'personal_use_compliance',
        name: 'Personal Use Compliance Alert',
        type: 'compliance',
        condition: (data) => data.suspiciousActivity === true,
        severity: 'high',
        cooldownPeriod: 3600000, // 1時間
        enabled: true,
      },
    ];

    defaultRules.forEach(rule => this.rules.set(rule.id, rule));
  }

  private initializeDefaultChannels() {
    const defaultChannels: NotificationChannel[] = [
      {
        id: 'console',
        type: 'console',
        enabled: true,
        config: {},
      },
      {
        id: 'browser_notification',
        type: 'browser',
        enabled: true,
        config: {
          permission: 'default', // 'default', 'granted', 'denied'
        },
      },
    ];

    defaultChannels.forEach(channel => this.channels.set(channel.id, channel));
  }

  // アラート評価とトリガー
  public evaluateConditions(data: any): Alert[] {
    const triggeredAlerts: Alert[] = [];

    for (const rule of this.rules.values()) {
      if (!rule.enabled) continue;

      try {
        if (rule.condition(data)) {
          const now = Date.now();
          const lastTrigger = this.lastTriggered.get(rule.id) || 0;

          // クールダウン期間チェック
          if (now - lastTrigger < rule.cooldownPeriod) {
            continue;
          }

          const alert = this.createAlert(rule, data);
          this.alerts.set(alert.id, alert);
          triggeredAlerts.push(alert);

          this.lastTriggered.set(rule.id, now);
          this.setupEscalation(alert);

          applicationLogger.logSecurityEvent('suspicious_activity', {
            alertId: alert.id,
            alertType: alert.type,
            severity: alert.severity,
            ruleId: rule.id,
            ruleName: rule.name,
          });
        }
      } catch (error) {
        applicationLogger.logError(error as Error, {
          operation: 'alert_condition_evaluation',
          ruleId: rule.id,
        });
      }
    }

    // 通知送信
    if (triggeredAlerts.length > 0) {
      this.sendNotifications(triggeredAlerts);
    }

    return triggeredAlerts;
  }

  private createAlert(rule: AlertRule, data: any): Alert {
    const alertId = `${rule.id}_${Date.now()}`;
    
    return {
      id: alertId,
      type: rule.type,
      severity: rule.severity,
      title: rule.name,
      message: this.generateAlertMessage(rule, data),
      details: data,
      timestamp: new Date(),
      source: 'AlertService',
      acknowledged: false,
      resolved: false,
      escalated: false,
      escalationLevel: 0,
      actions: this.generateAlertActions(rule.type),
    };
  }

  private generateAlertMessage(rule: AlertRule, data: any): string {
    switch (rule.id) {
      case 'high_response_time':
        return `API response time is ${data.responseTime}ms (threshold: 3000ms)`;
      case 'memory_usage_critical':
        return `Memory usage is ${Math.round(data.memoryUsage / 1024 / 1024)}MB (threshold: 500MB)`;
      case 'rate_limit_exceeded':
        return `Rate limit exceeded for ${data.platform || 'unknown platform'}`;
      case 'high_error_rate':
        return `Error rate is ${(data.errorRate * 100).toFixed(1)}% (threshold: 10%)`;
      case 'cache_hit_rate_low':
        return `Cache hit rate is ${(data.cacheHitRate * 100).toFixed(1)}% (threshold: 30%)`;
      case 'personal_use_compliance':
        return `Potential violation of personal use policy detected`;
      default:
        return `Alert condition met for rule: ${rule.name}`;
    }
  }

  private generateAlertActions(type: Alert['type']): AlertAction[] {
    const commonActions: AlertAction[] = [
      {
        id: 'acknowledge',
        label: 'Acknowledge',
        type: 'acknowledge',
        handler: async (alert) => this.acknowledgeAlert(alert.id),
      },
      {
        id: 'resolve',
        label: 'Resolve',
        type: 'resolve',
        handler: async (alert) => this.resolveAlert(alert.id),
      },
    ];

    const typeSpecificActions: Record<Alert['type'], AlertAction[]> = {
      performance: [
        {
          id: 'investigate_performance',
          label: 'Investigate Performance',
          type: 'investigate',
          handler: async (alert) => {
            applicationLogger.logUserAction('performance_investigation_started', {
              alertId: alert.id,
            });
          },
        },
      ],
      system: [
        {
          id: 'check_system_health',
          label: 'Check System Health',
          type: 'investigate',
          handler: async (alert) => {
            applicationLogger.logSystemHealth();
          },
        },
      ],
      api: [
        {
          id: 'check_api_status',
          label: 'Check API Status',
          type: 'investigate',
          handler: async (alert) => {
            applicationLogger.logUserAction('api_status_check', {
              alertId: alert.id,
            });
          },
        },
      ],
      security: [
        {
          id: 'security_review',
          label: 'Security Review',
          type: 'escalate',
          handler: async (alert) => {
            applicationLogger.logSecurityEvent('suspicious_activity', {
              alertId: alert.id,
              action: 'security_review_initiated',
            });
          },
        },
      ],
      compliance: [
        {
          id: 'compliance_audit',
          label: 'Compliance Audit',
          type: 'escalate',
          handler: async (alert) => {
            applicationLogger.logComplianceEvent('personal_use_validation', {
              alertId: alert.id,
              action: 'compliance_audit_initiated',
            });
          },
        },
      ],
    };

    return [...commonActions, ...(typeSpecificActions[type] || [])];
  }

  private setupEscalation(alert: Alert) {
    const rule = this.rules.get(alert.id.split('_')[0]);
    if (!rule?.escalationRules) return;

    rule.escalationRules.forEach(escalationRule => {
      const timer = setTimeout(() => {
        this.executeEscalation(alert, escalationRule);
      }, escalationRule.afterMinutes * 60 * 1000);

      this.escalationTimers.set(`${alert.id}_${escalationRule.afterMinutes}`, timer);
    });
  }

  private executeEscalation(alert: Alert, escalationRule: EscalationRule) {
    if (alert.acknowledged || alert.resolved) return;

    alert.escalated = true;
    alert.escalationLevel++;

    const escalationMessage = escalationRule.message || 
      `Alert ${alert.title} escalated after ${escalationRule.afterMinutes} minutes`;

    applicationLogger.logSecurityEvent('suspicious_activity', {
      alertId: alert.id,
      escalationLevel: alert.escalationLevel,
      escalationAction: escalationRule.action,
      message: escalationMessage,
    });

    // エスカレーション通知送信
    this.sendEscalationNotification(alert, escalationRule, escalationMessage);
  }

  // 通知送信
  private async sendNotifications(alerts: Alert[]) {
    for (const channel of this.channels.values()) {
      if (!channel.enabled) continue;

      try {
        await this.sendToChannel(channel, alerts);
      } catch (error) {
        applicationLogger.logError(error as Error, {
          operation: 'notification_send',
          channel: channel.id,
        });
      }
    }
  }

  private async sendToChannel(channel: NotificationChannel, alerts: Alert[]) {
    switch (channel.type) {
      case 'console':
        alerts.forEach(alert => {
          const emoji = this.getSeverityEmoji(alert.severity);
          console.log(`${emoji} [${alert.severity.toUpperCase()}] ${alert.title}: ${alert.message}`);
        });
        break;

      case 'browser':
        if (typeof window !== 'undefined' && 'Notification' in window) {
          await this.sendBrowserNotifications(alerts);
        }
        break;

      default:
        // 他のチャンネルタイプは将来実装
        break;
    }
  }

  private async sendBrowserNotifications(alerts: Alert[]) {
    if (Notification.permission === 'granted') {
      alerts.forEach(alert => {
        new Notification(alert.title, {
          body: alert.message,
          icon: this.getSeverityIcon(alert.severity),
          tag: alert.id,
        });
      });
    } else if (Notification.permission === 'default') {
      // 権限要求
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        await this.sendBrowserNotifications(alerts);
      }
    }
  }

  private sendEscalationNotification(
    alert: Alert, 
    escalationRule: EscalationRule, 
    message: string
  ) {
    const escalationChannel = this.channels.get('console');
    if (escalationChannel) {
      console.log(`🚨 ESCALATION: ${message}`);
    }
  }

  // アラート管理
  public acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert) return false;

    alert.acknowledged = true;
    this.clearEscalationTimers(alertId);

    applicationLogger.logUserAction('alert_acknowledged', {
      alertId,
      alertType: alert.type,
      severity: alert.severity,
    });

    return true;
  }

  public resolveAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert) return false;

    alert.resolved = true;
    alert.acknowledged = true;
    this.clearEscalationTimers(alertId);

    applicationLogger.logUserAction('alert_resolved', {
      alertId,
      alertType: alert.type,
      severity: alert.severity,
      resolutionTime: Date.now() - alert.timestamp.getTime(),
    });

    return true;
  }

  private clearEscalationTimers(alertId: string) {
    for (const [timerKey, timer] of this.escalationTimers.entries()) {
      if (timerKey.startsWith(alertId)) {
        clearTimeout(timer);
        this.escalationTimers.delete(timerKey);
      }
    }
  }

  // クエリメソッド
  public getActiveAlerts(): Alert[] {
    return Array.from(this.alerts.values())
      .filter(alert => !alert.resolved)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  public getAlertsByType(type: Alert['type']): Alert[] {
    return Array.from(this.alerts.values())
      .filter(alert => alert.type === type);
  }

  public getAlertsBySeverity(severity: Alert['severity']): Alert[] {
    return Array.from(this.alerts.values())
      .filter(alert => alert.severity === severity);
  }

  public getAlertStats(): AlertStats {
    const allAlerts = Array.from(this.alerts.values());
    const activeAlerts = allAlerts.filter(alert => !alert.resolved);
    const criticalAlerts = activeAlerts.filter(alert => alert.severity === 'critical');
    
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    const recentAlerts = allAlerts.filter(alert => alert.timestamp.getTime() > oneHourAgo);

    const resolvedAlerts = allAlerts.filter(alert => alert.resolved);
    const avgResolutionTime = resolvedAlerts.length > 0
      ? resolvedAlerts.reduce((sum, alert) => {
          return sum + (alert.timestamp.getTime() - alert.timestamp.getTime());
        }, 0) / resolvedAlerts.length
      : 0;

    return {
      total: allAlerts.length,
      active: activeAlerts.length,
      critical: criticalAlerts.length,
      byType: {
        performance: allAlerts.filter(a => a.type === 'performance').length,
        security: allAlerts.filter(a => a.type === 'security').length,
        system: allAlerts.filter(a => a.type === 'system').length,
        api: allAlerts.filter(a => a.type === 'api').length,
        compliance: allAlerts.filter(a => a.type === 'compliance').length,
      },
      bySeverity: {
        low: allAlerts.filter(a => a.severity === 'low').length,
        medium: allAlerts.filter(a => a.severity === 'medium').length,
        high: allAlerts.filter(a => a.severity === 'high').length,
        critical: allAlerts.filter(a => a.severity === 'critical').length,
      },
      recentCount: recentAlerts.length,
      averageResolutionTime: avgResolutionTime,
    };
  }

  // ルール管理
  public addRule(rule: AlertRule): void {
    this.rules.set(rule.id, rule);
  }

  public removeRule(ruleId: string): boolean {
    return this.rules.delete(ruleId);
  }

  public enableRule(ruleId: string): boolean {
    const rule = this.rules.get(ruleId);
    if (rule) {
      rule.enabled = true;
      return true;
    }
    return false;
  }

  public disableRule(ruleId: string): boolean {
    const rule = this.rules.get(ruleId);
    if (rule) {
      rule.enabled = false;
      return true;
    }
    return false;
  }

  // ユーティリティ
  private getSeverityEmoji(severity: Alert['severity']): string {
    switch (severity) {
      case 'critical': return '🔴';
      case 'high': return '🟠';
      case 'medium': return '🟡';
      case 'low': return '🔵';
      default: return '⚪';
    }
  }

  private getSeverityIcon(severity: Alert['severity']): string {
    switch (severity) {
      case 'critical': return '/icons/alert-critical.png';
      case 'high': return '/icons/alert-high.png';
      case 'medium': return '/icons/alert-medium.png';
      case 'low': return '/icons/alert-low.png';
      default: return '/icons/alert-default.png';
    }
  }

  // 破棄
  public destroy(): void {
    // 全てのエスカレーションタイマーをクリア
    for (const timer of this.escalationTimers.values()) {
      clearTimeout(timer);
    }
    this.escalationTimers.clear();
    this.alerts.clear();
  }
}

// シングルトンインスタンス
export const alertService = new AlertService();
export default alertService;