/**
 * Performance Monitoring Hook
 * Phase 9: Real-time performance data collection and management
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { applicationLogger } from '../utils/monitoring/applicationLogger';

interface PerformanceData {
  responseTime: number;
  memoryUsage: number;
  cacheHitRate: number;
  apiCallCount: number;
  errorRate: number;
  timestamp: Date;
}

interface SystemStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
    heapUsedMB: number;
    heapTotalMB: number;
  };
  checks: Record<string, boolean>;
}

interface AlertCondition {
  id: string;
  name: string;
  condition: (data: PerformanceData) => boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
}

interface Alert {
  id: string;
  condition: AlertCondition;
  triggeredAt: Date;
  acknowledged: boolean;
  data: PerformanceData;
}

interface UsePerformanceMonitoringOptions {
  enabled?: boolean;
  interval?: number;
  historySize?: number;
  alertThresholds?: Partial<AlertCondition>[];
}

export const usePerformanceMonitoring = (options: UsePerformanceMonitoringOptions = {}) => {
  const {
    enabled = true,
    interval = 30000, // 30秒
    historySize = 50,
    alertThresholds = [],
  } = options;

  const [isMonitoring, setIsMonitoring] = useState(false);
  const [currentData, setCurrentData] = useState<PerformanceData | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [performanceHistory, setPerformanceHistory] = useState<PerformanceData[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [error, setError] = useState<string | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<Date>(new Date());

  // デフォルトアラート条件
  const defaultAlertConditions: AlertCondition[] = [
    {
      id: 'high_response_time',
      name: 'High Response Time',
      condition: (data) => data.responseTime > 3000,
      severity: 'high',
      message: 'API response time exceeds 3 seconds',
    },
    {
      id: 'low_cache_hit_rate',
      name: 'Low Cache Hit Rate',
      condition: (data) => data.cacheHitRate < 0.5,
      severity: 'medium',
      message: 'Cache hit rate below 50%',
    },
    {
      id: 'high_error_rate',
      name: 'High Error Rate',
      condition: (data) => data.errorRate > 0.1,
      severity: 'critical',
      message: 'Error rate exceeds 10%',
    },
    {
      id: 'memory_usage_high',
      name: 'High Memory Usage',
      condition: (data) => data.memoryUsage > 200 * 1024 * 1024, // 200MB
      severity: 'high',
      message: 'Memory usage exceeds 200MB',
    },
  ];

  const alertConditions = [...defaultAlertConditions, ...alertThresholds] as AlertCondition[];

  // パフォーマンスデータ収集
  const collectPerformanceData = useCallback(async (): Promise<PerformanceData> => {
    try {
      const healthStatus = applicationLogger.getHealthStatus();
      const performanceReport = applicationLogger.getPerformanceReport();
      
      const apiCallMetrics = performanceReport.api_call || {
        responseTime: 0,
        memoryUsage: 0,
        cacheHitRate: 0,
        apiCallCount: 0,
        errorRate: 0,
      };

      const data: PerformanceData = {
        responseTime: apiCallMetrics.responseTime,
        memoryUsage: healthStatus.metrics.memoryUsage.heapUsed,
        cacheHitRate: apiCallMetrics.cacheHitRate,
        apiCallCount: apiCallMetrics.apiCallCount,
        errorRate: apiCallMetrics.errorRate,
        timestamp: new Date(),
      };

      // システムヘルス情報も更新
      setSystemStatus({
        status: healthStatus.status,
        uptime: healthStatus.metrics.uptime,
        memoryUsage: healthStatus.metrics.memoryUsage,
        checks: healthStatus.checks,
      });

      return data;
    } catch (err) {
      const errorMessage = `Performance data collection failed: ${err instanceof Error ? err.message : 'Unknown error'}`;
      setError(errorMessage);
      applicationLogger.logError(err as Error, {
        operation: 'performance_data_collection',
      });
      throw err;
    }
  }, []);

  // アラートチェック
  const checkAlerts = useCallback((data: PerformanceData) => {
    const newAlerts: Alert[] = [];

    alertConditions.forEach(condition => {
      try {
        if (condition.condition(data)) {
          // 既存のアラートがない場合のみ新規作成
          const existingAlert = alerts.find(
            alert => alert.condition.id === condition.id && !alert.acknowledged
          );

          if (!existingAlert) {
            const alert: Alert = {
              id: `${condition.id}_${Date.now()}`,
              condition,
              triggeredAt: new Date(),
              acknowledged: false,
              data,
            };

            newAlerts.push(alert);

            // ログに記録
            applicationLogger.logSecurityEvent('suspicious_activity', {
              alertId: alert.id,
              alertName: condition.name,
              severity: condition.severity,
              message: condition.message,
              metrics: data,
            });
          }
        }
      } catch (err) {
        applicationLogger.logError(err as Error, {
          operation: 'alert_check',
          condition: condition.id,
        });
      }
    });

    if (newAlerts.length > 0) {
      setAlerts(prev => [...prev, ...newAlerts]);
    }
  }, [alerts, alertConditions]);

  // 監視開始
  const startMonitoring = useCallback(async () => {
    if (!enabled || isMonitoring) return;

    try {
      setIsMonitoring(true);
      setError(null);
      startTimeRef.current = new Date();

      // 初回データ収集
      const initialData = await collectPerformanceData();
      setCurrentData(initialData);
      setPerformanceHistory([initialData]);

      // 定期的なデータ収集開始
      intervalRef.current = setInterval(async () => {
        try {
          const data = await collectPerformanceData();
          setCurrentData(data);
          
          // 履歴更新
          setPerformanceHistory(prev => {
            const newHistory = [...prev, data];
            return newHistory.slice(-historySize);
          });

          // アラートチェック
          checkAlerts(data);

          // パフォーマンスログ記録
          applicationLogger.logPerformanceMetrics('monitoring_collection', {
            responseTime: data.responseTime,
            memoryUsage: data.memoryUsage,
            cacheHitRate: data.cacheHitRate,
            errorRate: data.errorRate,
          });

        } catch (err) {
          console.error('Performance monitoring error:', err);
        }
      }, interval);

      applicationLogger.logSystemHealth();
      console.log('Performance monitoring started');

    } catch (err) {
      setError(`Failed to start monitoring: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setIsMonitoring(false);
    }
  }, [enabled, isMonitoring, interval, historySize, collectPerformanceData, checkAlerts]);

  // 監視停止
  const stopMonitoring = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsMonitoring(false);
    console.log('Performance monitoring stopped');
  }, []);

  // アラート確認
  const acknowledgeAlert = useCallback((alertId: string) => {
    setAlerts(prev => 
      prev.map(alert => 
        alert.id === alertId 
          ? { ...alert, acknowledged: true }
          : alert
      )
    );

    applicationLogger.logUserAction('alert_acknowledged', { alertId });
  }, []);

  // 全アラートクリア
  const clearAllAlerts = useCallback(() => {
    setAlerts([]);
    applicationLogger.logUserAction('alerts_cleared');
  }, []);

  // 統計計算
  const getStatistics = useCallback(() => {
    if (performanceHistory.length === 0) return null;

    const responseTimesMs = performanceHistory.map(d => d.responseTime);
    const cacheHitRates = performanceHistory.map(d => d.cacheHitRate);
    const errorRates = performanceHistory.map(d => d.errorRate);

    return {
      averageResponseTime: responseTimesMs.reduce((a, b) => a + b, 0) / responseTimesMs.length,
      maxResponseTime: Math.max(...responseTimesMs),
      minResponseTime: Math.min(...responseTimesMs),
      averageCacheHitRate: cacheHitRates.reduce((a, b) => a + b, 0) / cacheHitRates.length,
      averageErrorRate: errorRates.reduce((a, b) => a + b, 0) / errorRates.length,
      dataPoints: performanceHistory.length,
      monitoringUptime: Date.now() - startTimeRef.current.getTime(),
    };
  }, [performanceHistory]);

  // 手動リフレッシュ
  const refresh = useCallback(async () => {
    try {
      const data = await collectPerformanceData();
      setCurrentData(data);
      setError(null);
    } catch (err) {
      // エラーは既にcollectPerformanceData内で処理済み
    }
  }, [collectPerformanceData]);

  // 自動開始/停止
  useEffect(() => {
    if (enabled) {
      startMonitoring();
    } else {
      stopMonitoring();
    }

    return () => {
      stopMonitoring();
    };
  }, [enabled, startMonitoring, stopMonitoring]);

  return {
    // 状態
    isMonitoring,
    currentData,
    systemStatus,
    performanceHistory,
    alerts: alerts.filter(alert => !alert.acknowledged),
    allAlerts: alerts,
    error,

    // 統計
    statistics: getStatistics(),

    // アクション
    startMonitoring,
    stopMonitoring,
    refresh,
    acknowledgeAlert,
    clearAllAlerts,

    // ヘルパー
    getActiveAlertsCount: () => alerts.filter(alert => !alert.acknowledged).length,
    getCriticalAlertsCount: () => alerts.filter(
      alert => !alert.acknowledged && alert.condition.severity === 'critical'
    ).length,
    getUptimeFormatted: () => {
      const uptimeMs = Date.now() - startTimeRef.current.getTime();
      const hours = Math.floor(uptimeMs / (1000 * 60 * 60));
      const minutes = Math.floor((uptimeMs % (1000 * 60 * 60)) / (1000 * 60));
      return `${hours}h ${minutes}m`;
    },
  };
};

export default usePerformanceMonitoring;