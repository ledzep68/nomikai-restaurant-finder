import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UnifiedRatingDisplay } from '../UnifiedRatingDisplay';
import { UnifiedRating, PlatformRatingData } from '@/types/platformAggregation';

describe('UnifiedRatingDisplay', () => {
  const mockHotpepperData: PlatformRatingData = {
    platform: 'hotpepper',
    restaurantId: 'test-restaurant',
    rating: 4.2,
    reviewCount: 150,
    confidence: 0.9,
    dataQuality: 0.95,
    lastUpdated: new Date('2025-06-21T10:00:00Z'),
    source: 'hotpepper:test-restaurant',
    priceInfo: {
      min: 2000,
      max: 4000,
    },
    location: {
      latitude: 35.6812,
      longitude: 139.7671,
    }
  };

  const mockTabelogData: PlatformRatingData = {
    platform: 'tabelog',
    restaurantId: 'test-restaurant',
    rating: 3.8,
    reviewCount: 89,
    confidence: 0.75,
    dataQuality: 0.8,
    lastUpdated: new Date('2025-06-21T09:00:00Z'),
    source: 'tabelog:test-restaurant',
    priceInfo: {
      dinner: '¥3,000~¥3,999',
      lunch: '¥1,000~¥1,999',
    }
  };

  const mockUnifiedRating: UnifiedRating = {
    restaurantId: 'test-restaurant',
    aggregatedScore: 4.1,
    confidence: 0.85,
    platforms: [mockHotpepperData, mockTabelogData],
    totalReviews: 239,
    dataCompleteness: 1.0,
    reliabilityScore: 0.9,
    aggregationMetadata: {
      algorithm: 'hotpepper_centric_weighted_average',
      weights: { hotpepper: 0.7, tabelog: 0.2, google: 0.1 },
      timestamp: new Date('2025-06-21T10:00:00Z'),
      version: '1.0.0-free-tier',
    },
    lastUpdated: new Date('2025-06-21T10:00:00Z'),
  };

  describe('コンパクト表示モード', () => {
    const compactOptions = {
      showPlatformBreakdown: false,
      showConfidenceScore: false,
      showDataQuality: false,
      showProcessingTime: false,
      format: 'compact' as const,
    };

    it('コンパクトモードで基本情報が表示される', () => {
      render(
        <UnifiedRatingDisplay 
          unifiedRating={mockUnifiedRating} 
          options={compactOptions}
        />
      );

      expect(screen.getByText('4.1')).toBeInTheDocument();
      expect(screen.getByText('(239件)')).toBeInTheDocument();
      
      // 星の表示確認（4つの満点星と1つの半星）
      const stars = screen.container.querySelectorAll('svg');
      expect(stars.length).toBeGreaterThan(0);
    });

    it('HotPepper単体データでコンパクト表示', () => {
      const hotpepperOnlyRating = {
        ...mockUnifiedRating,
        platforms: [mockHotpepperData],
        aggregatedScore: 4.2,
        totalReviews: 150,
      };

      render(
        <UnifiedRatingDisplay 
          unifiedRating={hotpepperOnlyRating} 
          options={compactOptions}
        />
      );

      expect(screen.getByText('4.2')).toBeInTheDocument();
      expect(screen.getByText('(150件)')).toBeInTheDocument();
    });
  });

  describe('詳細表示モード（デフォルト）', () => {
    it('詳細モードで全情報が表示される', () => {
      render(<UnifiedRatingDisplay unifiedRating={mockUnifiedRating} />);

      expect(screen.getByText('4.1')).toBeInTheDocument();
      expect(screen.getByText('統合評価')).toBeInTheDocument();
      expect(screen.getByText('239件')).toBeInTheDocument();
      expect(screen.getByText('レビュー総数')).toBeInTheDocument();
      
      // 最終更新時間の表示
      expect(screen.getByText(/最終更新:/)).toBeInTheDocument();
    });

    it('プラットフォーム別内訳が表示される', () => {
      render(<UnifiedRatingDisplay unifiedRating={mockUnifiedRating} />);

      expect(screen.getByText('プラットフォーム別評価')).toBeInTheDocument();
      expect(screen.getByText('ホットペッパー')).toBeInTheDocument();
      expect(screen.getByText('食べログ')).toBeInTheDocument();
      expect(screen.getByText('4.2')).toBeInTheDocument(); // HotPepper評価
      expect(screen.getByText('3.8')).toBeInTheDocument(); // 食べログ評価
      expect(screen.getByText('(150件)')).toBeInTheDocument(); // HotPepperレビュー数
      expect(screen.getByText('(89件)')).toBeInTheDocument(); // 食べログレビュー数
    });

    it('HotPepper優先順序で表示される', () => {
      render(<UnifiedRatingDisplay unifiedRating={mockUnifiedRating} />);

      const platformElements = screen.getAllByText(/ホットペッパー|食べログ/);
      
      // HotPepperが最初に表示されることを確認
      expect(platformElements[0]).toHaveTextContent('ホットペッパー');
    });

    it('Googleが無効表示される', () => {
      const withGoogleData = {
        ...mockUnifiedRating,
        platforms: [
          mockHotpepperData,
          mockTabelogData,
          {
            platform: 'google' as const,
            restaurantId: 'test-restaurant',
            rating: 4.5,
            reviewCount: 200,
            confidence: 0.9,
            dataQuality: 0.95,
            lastUpdated: new Date(),
            source: 'google:test-restaurant',
          }
        ]
      };

      render(<UnifiedRatingDisplay unifiedRating={withGoogleData} />);

      expect(screen.getByText('Google (無効)')).toBeInTheDocument();
      
      // Google のアイコンがグレー表示されることを確認
      const googleIcon = screen.getByText('Google (無効)').parentElement?.querySelector('.bg-gray-400');
      expect(googleIcon).toBeInTheDocument();
    });
  });

  describe('比較表示モード', () => {
    const comparisonOptions = {
      showPlatformBreakdown: true,
      showConfidenceScore: false,
      showDataQuality: false,
      showProcessingTime: false,
      format: 'comparison' as const,
    };

    it('比較モードで3列表示される', () => {
      render(
        <UnifiedRatingDisplay 
          unifiedRating={mockUnifiedRating} 
          options={comparisonOptions}
        />
      );

      expect(screen.getByText('統合評価 (239件のレビュー)')).toBeInTheDocument();
      
      // 大きな統合スコア表示
      expect(screen.getByText('4.1')).toBeInTheDocument();
      
      // プラットフォーム別の列表示
      expect(screen.getByText('4.2')).toBeInTheDocument(); // HotPepper
      expect(screen.getByText('3.8')).toBeInTheDocument(); // 食べログ
      expect(screen.getByText('150件')).toBeInTheDocument(); // HotPepperレビュー数
      expect(screen.getByText('89件')).toBeInTheDocument(); // 食べログレビュー数
    });

    it('HotPepper単体での比較表示', () => {
      const hotpepperOnlyRating = {
        ...mockUnifiedRating,
        platforms: [mockHotpepperData],
        aggregatedScore: 4.2,
        totalReviews: 150,
      };

      render(
        <UnifiedRatingDisplay 
          unifiedRating={hotpepperOnlyRating} 
          options={comparisonOptions}
        />
      );

      expect(screen.getByText('統合評価 (150件のレビュー)')).toBeInTheDocument();
      
      // 1つのプラットフォームのみ表示
      const platformColumns = screen.container.querySelectorAll('.border-l');
      expect(platformColumns.length).toBe(0); // border-lは2番目以降に適用されるため
    });
  });

  describe('追加オプション表示', () => {
    const detailedOptions = {
      showPlatformBreakdown: true,
      showConfidenceScore: true,
      showDataQuality: true,
      showProcessingTime: false,
      format: 'detailed' as const,
    };

    it('信頼度とデータ品質が表示される', () => {
      render(
        <UnifiedRatingDisplay 
          unifiedRating={mockUnifiedRating} 
          options={detailedOptions}
        />
      );

      expect(screen.getByText('信頼度')).toBeInTheDocument();
      expect(screen.getByText('85%')).toBeInTheDocument(); // confidence: 0.85
      expect(screen.getByText('データ完全性')).toBeInTheDocument();
      expect(screen.getByText('100%')).toBeInTheDocument(); // dataCompleteness: 1.0
    });

    it('オプション無効時は追加情報が表示されない', () => {
      const minimalOptions = {
        showPlatformBreakdown: false,
        showConfidenceScore: false,
        showDataQuality: false,
        showProcessingTime: false,
        format: 'detailed' as const,
      };

      render(
        <UnifiedRatingDisplay 
          unifiedRating={mockUnifiedRating} 
          options={minimalOptions}
        />
      );

      expect(screen.queryByText('プラットフォーム別評価')).not.toBeInTheDocument();
      expect(screen.queryByText('信頼度')).not.toBeInTheDocument();
      expect(screen.queryByText('データ完全性')).not.toBeInTheDocument();
    });
  });

  describe('星評価表示', () => {
    it('4.1の評価で適切な星が表示される', () => {
      render(<UnifiedRatingDisplay unifiedRating={mockUnifiedRating} />);

      // SVG星アイコンの存在確認
      const stars = screen.container.querySelectorAll('svg');
      expect(stars.length).toBeGreaterThanOrEqual(5); // 5つ星 + その他のアイコン
    });

    it('5.0の評価で満点星が表示される', () => {
      const perfectRating = {
        ...mockUnifiedRating,
        aggregatedScore: 5.0,
      };

      render(<UnifiedRatingDisplay unifiedRating={perfectRating} />);

      expect(screen.getByText('5.0')).toBeInTheDocument();
    });

    it('1.0の評価で最低星が表示される', () => {
      const lowRating = {
        ...mockUnifiedRating,
        aggregatedScore: 1.0,
      };

      render(<UnifiedRatingDisplay unifiedRating={lowRating} />);

      expect(screen.getByText('1.0')).toBeInTheDocument();
    });
  });

  describe('プラットフォームアイコンとラベル', () => {
    it('HotPepperアイコンが正しく表示される', () => {
      render(<UnifiedRatingDisplay unifiedRating={mockUnifiedRating} />);

      const hotpepperIcon = screen.getByText('ホットペッパー').parentElement?.querySelector('.bg-orange-500');
      expect(hotpepperIcon).toBeInTheDocument();
      expect(hotpepperIcon).toHaveTextContent('H');
    });

    it('食べログアイコンが正しく表示される', () => {
      render(<UnifiedRatingDisplay unifiedRating={mockUnifiedRating} />);

      const tabelogIcon = screen.getByText('食べログ').parentElement?.querySelector('.bg-red-500');
      expect(tabelogIcon).toBeInTheDocument();
      expect(tabelogIcon).toHaveTextContent('T');
    });

    it('Googleアイコンがグレー表示される', () => {
      const withGoogleData = {
        ...mockUnifiedRating,
        platforms: [
          ...mockUnifiedRating.platforms,
          {
            platform: 'google' as const,
            restaurantId: 'test-restaurant',
            rating: 4.5,
            reviewCount: 200,
            confidence: 0.9,
            dataQuality: 0.95,
            lastUpdated: new Date(),
            source: 'google:test-restaurant',
          }
        ]
      };

      render(<UnifiedRatingDisplay unifiedRating={withGoogleData} />);

      const googleIcon = screen.getByText('Google (無効)').parentElement?.querySelector('.bg-gray-400');
      expect(googleIcon).toBeInTheDocument();
      expect(googleIcon).toHaveTextContent('G');
    });
  });

  describe('エラー・エッジケース', () => {
    it('レビュー数0の場合の表示', () => {
      const noReviewsRating = {
        ...mockUnifiedRating,
        totalReviews: 0,
        platforms: [
          {
            ...mockHotpepperData,
            reviewCount: 0,
          }
        ]
      };

      render(<UnifiedRatingDisplay unifiedRating={noReviewsRating} />);

      expect(screen.getByText('0件')).toBeInTheDocument();
    });

    it('信頼度0%の場合の表示', () => {
      const lowConfidenceRating = {
        ...mockUnifiedRating,
        confidence: 0,
      };

      const options = {
        showPlatformBreakdown: true,
        showConfidenceScore: true,
        showDataQuality: false,
        showProcessingTime: false,
        format: 'detailed' as const,
      };

      render(
        <UnifiedRatingDisplay 
          unifiedRating={lowConfidenceRating} 
          options={options}
        />
      );

      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('プラットフォームが1つのみの場合', () => {
      const singlePlatformRating = {
        ...mockUnifiedRating,
        platforms: [mockHotpepperData],
        dataCompleteness: 0.5,
      };

      render(<UnifiedRatingDisplay unifiedRating={singlePlatformRating} />);

      expect(screen.getByText('ホットペッパー')).toBeInTheDocument();
      expect(screen.queryByText('食べログ')).not.toBeInTheDocument();
    });
  });

  describe('アクセシビリティ', () => {
    it('適切なセマンティック構造がある', () => {
      render(<UnifiedRatingDisplay unifiedRating={mockUnifiedRating} />);

      // 見出し構造の確認
      expect(screen.getByText('統合評価')).toBeInTheDocument();
      expect(screen.getByText('プラットフォーム別評価')).toBeInTheDocument();
    });

    it('スクリーンリーダー向けの情報が適切', () => {
      render(<UnifiedRatingDisplay unifiedRating={mockUnifiedRating} />);

      // 評価数値が明確に示されている
      expect(screen.getByText('4.1')).toBeInTheDocument();
      expect(screen.getByText('239件')).toBeInTheDocument();
    });
  });

  describe('レスポンシブ対応', () => {
    it('モバイル環境での表示確認', () => {
      // モバイル環境をシミュレート
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<UnifiedRatingDisplay unifiedRating={mockUnifiedRating} />);

      expect(screen.getByText('統合評価')).toBeInTheDocument();
      expect(screen.getByText('4.1')).toBeInTheDocument();
    });
  });
});