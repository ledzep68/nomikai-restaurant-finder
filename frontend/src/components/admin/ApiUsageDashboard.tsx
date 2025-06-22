import React, { useState, useEffect } from 'react';

interface ApiUsageData {
  platform: string;
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
  percentage: {
    minute: number;
    hour: number;
    day: number;
    week?: number;
  };
  status: 'available' | 'limited' | 'blocked';
  nextReset: string;
}

interface Alert {
  platform: string;
  level: 'warning' | 'critical' | 'blocked';
  message: string;
  percentage: number;
  timestamp: string;
  action: string;
}

interface SystemHealth {
  overall: 'healthy' | 'warning' | 'critical' | 'degraded';
  platforms: Record<string, ApiUsageData>;
  alerts: Alert[];
  recommendations: string[];
}

export const ApiUsageDashboard: React.FC = () => {
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    fetchSystemHealth();
    
    if (autoRefresh) {
      const interval = setInterval(fetchSystemHealth, 30000); // 30秒ごと
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const fetchSystemHealth = async () => {
    try {
      const response = await fetch('/api/monitoring/system-health');
      if (!response.ok) {
        throw new Error('Failed to fetch system health');
      }
      const data = await response.json();
      setSystemHealth(data.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      case 'critical': return 'text-red-600 bg-red-100';
      case 'degraded': return 'text-purple-600 bg-purple-100';
      case 'available': return 'text-green-600 bg-green-100';
      case 'limited': return 'text-yellow-600 bg-yellow-100';
      case 'blocked': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getProgressBarColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('ja-JP');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">API使用状況を読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-red-800 font-medium">エラーが発生しました</h3>
        <p className="text-red-600 mt-2">{error}</p>
        <button
          onClick={fetchSystemHealth}
          className="mt-4 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
        >
          再試行
        </button>
      </div>
    );
  }

  if (!systemHealth) {
    return <div>データがありません</div>;
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">API使用量監視ダッシュボード</h2>
        <div className="flex items-center space-x-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="mr-2"
            />
            自動更新
          </label>
          <button
            onClick={fetchSystemHealth}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            手動更新
          </button>
        </div>
      </div>

      {/* システム全体のステータス */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">システム全体のステータス</h3>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(systemHealth.overall)}`}>
            {systemHealth.overall.toUpperCase()}
          </span>
        </div>
        
        {systemHealth.recommendations.length > 0 && (
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-blue-800 font-medium mb-2">推奨事項</h4>
            <ul className="text-blue-700 space-y-1">
              {systemHealth.recommendations.map((rec, index) => (
                <li key={index} className="text-sm">• {rec}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* プラットフォーム別使用状況 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.entries(systemHealth.platforms).map(([platform, data]) => (
          <div key={platform} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 capitalize">{platform}</h3>
              <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(data.status)}`}>
                {data.status}
              </span>
            </div>

            <div className="space-y-3">
              {/* 分間制限 */}
              <div>
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>分間</span>
                  <span>{data.requests.minute}/{data.limits.minute}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${getProgressBarColor(data.percentage.minute)}`}
                    style={{ width: `${Math.min(data.percentage.minute, 100)}%` }}
                  ></div>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {Math.round(data.percentage.minute)}%
                </div>
              </div>

              {/* 時間制限 */}
              <div>
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>時間</span>
                  <span>{data.requests.hour}/{data.limits.hour}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${getProgressBarColor(data.percentage.hour)}`}
                    style={{ width: `${Math.min(data.percentage.hour, 100)}%` }}
                  ></div>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {Math.round(data.percentage.hour)}%
                </div>
              </div>

              {/* 日間制限 */}
              <div>
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>日間</span>
                  <span>{data.requests.day}/{data.limits.day}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${getProgressBarColor(data.percentage.day)}`}
                    style={{ width: `${Math.min(data.percentage.day, 100)}%` }}
                  ></div>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {Math.round(data.percentage.day)}%
                </div>
              </div>

              {/* 週間制限（Tabelogのみ） */}
              {data.requests.week !== undefined && (
                <div>
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>週間</span>
                    <span>{data.requests.week}/{data.limits.week}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${getProgressBarColor(data.percentage.week!)}`}
                      style={{ width: `${Math.min(data.percentage.week!, 100)}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {Math.round(data.percentage.week!)}%
                  </div>
                </div>
              )}

              <div className="text-xs text-gray-500 pt-2 border-t">
                次回リセット: {formatTime(data.nextReset)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* アラート履歴 */}
      {systemHealth.alerts.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">最近のアラート</h3>
          <div className="space-y-3">
            {systemHealth.alerts.slice(0, 10).map((alert, index) => (
              <div
                key={index}
                className={`border-l-4 p-4 ${
                  alert.level === 'critical' || alert.level === 'blocked'
                    ? 'border-red-400 bg-red-50'
                    : 'border-yellow-400 bg-yellow-50'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium text-gray-900">
                      {alert.platform.toUpperCase()} - {alert.level.toUpperCase()}
                    </p>
                    <p className="text-gray-700">{alert.message}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      アクション: {alert.action} | 使用率: {Math.round(alert.percentage * 100)}%
                    </p>
                  </div>
                  <span className="text-xs text-gray-500">
                    {formatTime(alert.timestamp)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};