import React from 'react';

interface FreeTierBadgeProps {
  className?: string;
  compact?: boolean;
  showUsage?: boolean;
  usageData?: {
    hotpepperRequests: number;
    hotpepperLimit: number;
    tabelogRequests: number;
    tabelogLimit: number;
  };
}

export const FreeTierBadge: React.FC<FreeTierBadgeProps> = ({
  className = '',
  compact = false,
  showUsage = false,
  usageData,
}) => {
  if (compact) {
    return (
      <div className={`inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 text-xs rounded-full border border-green-200 ${className}`}>
        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
        <span className="font-medium">無料版</span>
      </div>
    );
  }

  return (
    <div className={`bg-green-50 border border-green-200 rounded-lg p-3 ${className}`}>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
        <span className="text-green-800 font-medium text-sm">無料版で運用中</span>
      </div>
      
      <div className="text-xs text-green-700 space-y-1">
        <div className="flex items-center gap-1">
          <span className="w-1 h-1 bg-orange-500 rounded-full"></span>
          <span>ホットペッパーAPI: メイン情報源（完全無料）</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-1 h-1 bg-red-500 rounded-full"></span>
          <span>食べログ: 補助情報（週50件まで）</span>
        </div>
      </div>

      {showUsage && usageData && (
        <div className="mt-3 pt-2 border-t border-green-200">
          <div className="text-xs text-green-600 space-y-1">
            <div className="flex justify-between">
              <span>ホットペッパー (今日):</span>
              <span className={usageData.hotpepperRequests > usageData.hotpepperLimit * 0.8 ? 'text-orange-600 font-medium' : ''}>
                {usageData.hotpepperRequests}/{usageData.hotpepperLimit}
              </span>
            </div>
            <div className="flex justify-between">
              <span>食べログ (今週):</span>
              <span className={usageData.tabelogRequests > usageData.tabelogLimit * 0.8 ? 'text-orange-600 font-medium' : ''}>
                {usageData.tabelogRequests}/{usageData.tabelogLimit}
              </span>
            </div>
          </div>
          
          {/* 使用量インジケーター */}
          <div className="mt-2 space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs text-green-600 w-16">HP:</span>
              <div className="flex-1 bg-green-200 rounded-full h-1">
                <div 
                  className={`h-1 rounded-full ${
                    usageData.hotpepperRequests / usageData.hotpepperLimit > 0.8 
                      ? 'bg-orange-500' 
                      : 'bg-green-500'
                  }`}
                  style={{ 
                    width: `${Math.min(100, (usageData.hotpepperRequests / usageData.hotpepperLimit) * 100)}%` 
                  }}
                ></div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-green-600 w-16">食べログ:</span>
              <div className="flex-1 bg-green-200 rounded-full h-1">
                <div 
                  className={`h-1 rounded-full ${
                    usageData.tabelogRequests / usageData.tabelogLimit > 0.8 
                      ? 'bg-orange-500' 
                      : 'bg-green-500'
                  }`}
                  style={{ 
                    width: `${Math.min(100, (usageData.tabelogRequests / usageData.tabelogLimit) * 100)}%` 
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const FreeTierWarning: React.FC<{ 
  platform: 'hotpepper' | 'tabelog';
  className?: string;
}> = ({ platform, className = '' }) => {
  const warnings = {
    hotpepper: {
      title: 'ホットペッパー制限中',
      message: '1日の利用制限に達しました。明日リセットされます。',
      color: 'orange',
    },
    tabelog: {
      title: '食べログ制限中', 
      message: '週の利用制限に達しました。来週リセットされます。',
      color: 'red',
    }
  };

  const warning = warnings[platform];
  const colorClasses = {
    orange: 'bg-orange-50 border-orange-200 text-orange-800',
    red: 'bg-red-50 border-red-200 text-red-800',
  };

  return (
    <div className={`border rounded-lg p-3 ${colorClasses[warning.color]} ${className}`}>
      <div className="flex items-center gap-2">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        <span className="font-medium text-sm">{warning.title}</span>
      </div>
      <p className="text-xs mt-1">{warning.message}</p>
    </div>
  );
};