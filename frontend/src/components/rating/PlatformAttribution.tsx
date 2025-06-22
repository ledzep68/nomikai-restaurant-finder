import React from 'react';
import { PlatformAttribution as PlatformAttributionType } from '@/types/platformAggregation';

interface PlatformAttributionProps {
  attributions: PlatformAttributionType[];
  className?: string;
  compact?: boolean;
}

export const PlatformAttribution: React.FC<PlatformAttributionProps> = ({
  attributions,
  className = '',
  compact = false,
}) => {
  const getPlatformInfo = (platform: string) => {
    switch (platform) {
      case 'google':
        return {
          name: 'Google',
          logo: '🔍',
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
        };
      case 'tabelog':
        return {
          name: '食べログ',
          logo: '🍽️',
          color: 'text-red-600',
          bgColor: 'bg-red-50',
        };
      case 'hotpepper':
        return {
          name: 'ホットペッパーグルメ',
          logo: '🌶️',
          color: 'text-orange-600',
          bgColor: 'bg-orange-50',
        };
      default:
        return {
          name: platform,
          logo: '📊',
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
        };
    }
  };

  if (compact) {
    return (
      <div className={`text-xs text-gray-500 ${className}`}>
        <div className="flex items-center gap-1 flex-wrap">
          <span>データ提供:</span>
          {attributions.map((attribution, index) => {
            const info = getPlatformInfo(attribution.platform);
            return (
              <span key={attribution.platform} className="flex items-center gap-1">
                {index > 0 && <span>•</span>}
                <span className={info.color}>{info.name}</span>
              </span>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-50 border rounded-lg p-4 ${className}`}>
      <h3 className="text-sm font-medium text-gray-900 mb-3">データ提供元</h3>
      
      <div className="space-y-3">
        {attributions.map((attribution) => {
          const info = getPlatformInfo(attribution.platform);
          
          return (
            <div
              key={attribution.platform}
              className={`${info.bgColor} rounded-lg p-3 border border-gray-200`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{info.logo}</span>
                <span className={`font-medium ${info.color}`}>
                  {info.name}
                </span>
              </div>
              
              <div className="text-xs text-gray-600 space-y-1">
                <div>{attribution.attribution}</div>
                
                {attribution.legalNotice && (
                  <div className="text-gray-500">
                    <strong>利用規約:</strong> {attribution.legalNotice}
                  </div>
                )}
                
                {attribution.dataUsagePolicy && (
                  <div className="text-gray-500">
                    <strong>データ利用:</strong> {attribution.dataUsagePolicy}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
        <div className="text-xs text-blue-800">
          <div className="font-medium mb-1">📋 個人利用について</div>
          <div className="space-y-1">
            <div>• このサービスは個人の食事選択支援を目的としています</div>
            <div>• 商用利用・収益化は行っておりません</div>
            <div>• 各プラットフォームの利用規約を遵守しています</div>
            <div>• データは評価情報の集約・比較のみに使用されます</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// デフォルトの帰属情報を提供するヘルパー関数
export const getDefaultAttributions = (): PlatformAttributionType[] => {
  return [
    {
      platform: 'google',
      attribution: 'Google Places API',
      legalNotice: 'Google Places API Terms of Service に従い、個人利用の範囲で利用',
      dataUsagePolicy: '基本的な店舗情報・評価データのみを取得・表示',
    },
    {
      platform: 'tabelog',
      attribution: '食べログ',
      legalNotice: '食べログ利用規約 に従い、個人利用・非営利目的でのみ利用',
      dataUsagePolicy: '基本情報（評価・価格帯・立地）のみを尊重あるアクセスで取得',
    },
    {
      platform: 'hotpepper',
      attribution: 'ホットペッパーグルメ API',
      legalNotice: 'リクルートWebサービス利用規約 に従い、個人利用の範囲で利用',
      dataUsagePolicy: '公開されている店舗情報・基本データのみを取得・表示',
    },
  ];
};