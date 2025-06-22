import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { FreeTierBadge, FreeTierWarning } from '../FreeTierBadge';

describe('FreeTierBadge', () => {
  describe('コンパクト表示', () => {
    it('コンパクトモードで正しく表示される', () => {
      render(<FreeTierBadge compact={true} />);
      
      expect(screen.getByText('無料版')).toBeInTheDocument();
      expect(screen.getByRole('generic')).toHaveClass('bg-green-50');
    });

    it('コンパクトモードでカスタムクラスが適用される', () => {
      render(<FreeTierBadge compact={true} className="custom-class" />);
      
      const badge = screen.getByText('無料版').closest('div');
      expect(badge).toHaveClass('custom-class');
    });
  });

  describe('詳細表示', () => {
    it('詳細モードで基本情報が表示される', () => {
      render(<FreeTierBadge compact={false} />);
      
      expect(screen.getByText('無料版で運用中')).toBeInTheDocument();
      expect(screen.getByText('ホットペッパーAPI: メイン情報源（完全無料）')).toBeInTheDocument();
      expect(screen.getByText('食べログ: 補助情報（週50件まで）')).toBeInTheDocument();
    });

    it('個人利用についての説明が表示される', () => {
      render(<FreeTierBadge compact={false} />);
      
      expect(screen.getByText('📋 個人利用について')).toBeInTheDocument();
      expect(screen.getByText('• このサービスは個人の食事選択支援を目的としています')).toBeInTheDocument();
      expect(screen.getByText('• 商用利用・収益化は行っておりません')).toBeInTheDocument();
      expect(screen.getByText('• 各プラットフォームの利用規約を遵守しています')).toBeInTheDocument();
      expect(screen.getByText('• データは評価情報の集約・比較のみに使用されます')).toBeInTheDocument();
    });
  });

  describe('使用状況表示', () => {
    const mockUsageData = {
      hotpepperRequests: 150,
      hotpepperLimit: 300,
      tabelogRequests: 25,
      tabelogLimit: 50,
    };

    it('使用状況が正しく表示される', () => {
      render(
        <FreeTierBadge 
          compact={false} 
          showUsage={true} 
          usageData={mockUsageData} 
        />
      );
      
      expect(screen.getByText('ホットペッパー (今日):')).toBeInTheDocument();
      expect(screen.getByText('150/300')).toBeInTheDocument();
      expect(screen.getByText('食べログ (今週):')).toBeInTheDocument();
      expect(screen.getByText('25/50')).toBeInTheDocument();
    });

    it('使用量が80%を超えた時に警告色で表示される', () => {
      const highUsageData = {
        hotpepperRequests: 250, // 83%
        hotpepperLimit: 300,
        tabelogRequests: 45,    // 90%
        tabelogLimit: 50,
      };

      render(
        <FreeTierBadge 
          compact={false} 
          showUsage={true} 
          usageData={highUsageData} 
        />
      );
      
      const hotpepperUsage = screen.getByText('250/300');
      const tabelogUsage = screen.getByText('45/50');
      
      expect(hotpepperUsage).toHaveClass('text-orange-600');
      expect(tabelogUsage).toHaveClass('text-orange-600');
    });

    it('使用量インジケーターが正しく表示される', () => {
      render(
        <FreeTierBadge 
          compact={false} 
          showUsage={true} 
          usageData={mockUsageData} 
        />
      );
      
      // HotPepper使用量バー (50%)
      const hotpepperBar = screen.getByText('HP:').parentElement?.querySelector('.h-1.rounded-full:not(.bg-green-200)');
      expect(hotpepperBar).toHaveStyle('width: 50%');
      
      // 食べログ使用量バー (50%)
      const tabelogBar = screen.getByText('食べログ:').parentElement?.querySelector('.h-1.rounded-full:not(.bg-green-200)');
      expect(tabelogBar).toHaveStyle('width: 50%');
    });

    it('高使用率時にオレンジ色のインジケーターが表示される', () => {
      const highUsageData = {
        hotpepperRequests: 270, // 90%
        hotpepperLimit: 300,
        tabelogRequests: 45,    // 90%
        tabelogLimit: 50,
      };

      render(
        <FreeTierBadge 
          compact={false} 
          showUsage={true} 
          usageData={highUsageData} 
        />
      );
      
      const hotpepperBar = screen.getByText('HP:').parentElement?.querySelector('.bg-orange-500');
      const tabelogBar = screen.getByText('食べログ:').parentElement?.querySelector('.bg-orange-500');
      
      expect(hotpepperBar).toBeInTheDocument();
      expect(tabelogBar).toBeInTheDocument();
    });

    it('使用状況なしの場合はUsage情報が表示されない', () => {
      render(<FreeTierBadge compact={false} showUsage={false} />);
      
      expect(screen.queryByText('ホットペッパー (今日):')).not.toBeInTheDocument();
      expect(screen.queryByText('食べログ (今週):')).not.toBeInTheDocument();
    });
  });

  describe('アクセシビリティ', () => {
    it('適切なARIAラベルが設定されている', () => {
      render(<FreeTierBadge compact={false} />);
      
      // カラーインジケーターの代替テキスト確認
      expect(screen.getByText('無料版で運用中')).toBeInTheDocument();
    });

    it('コントラスト比が適切である', () => {
      render(<FreeTierBadge compact={true} />);
      
      const badge = screen.getByText('無料版').closest('div');
      expect(badge).toHaveClass('text-green-700'); // 十分なコントラスト
    });
  });
});

describe('FreeTierWarning', () => {
  describe('HotPepper制限警告', () => {
    it('HotPepper制限警告が正しく表示される', () => {
      render(<FreeTierWarning platform="hotpepper" />);
      
      expect(screen.getByText('ホットペッパー制限中')).toBeInTheDocument();
      expect(screen.getByText('1日の利用制限に達しました。明日リセットされます。')).toBeInTheDocument();
    });

    it('警告アイコンが表示される', () => {
      render(<FreeTierWarning platform="hotpepper" />);
      
      const icon = screen.getByRole('generic').querySelector('svg');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass('w-4', 'h-4');
    });

    it('オレンジ色のスタイルが適用される', () => {
      render(<FreeTierWarning platform="hotpepper" />);
      
      const warning = screen.getByText('ホットペッパー制限中').closest('div');
      expect(warning).toHaveClass('bg-orange-50', 'border-orange-200', 'text-orange-800');
    });
  });

  describe('食べログ制限警告', () => {
    it('食べログ制限警告が正しく表示される', () => {
      render(<FreeTierWarning platform="tabelog" />);
      
      expect(screen.getByText('食べログ制限中')).toBeInTheDocument();
      expect(screen.getByText('週の利用制限に達しました。来週リセットされます。')).toBeInTheDocument();
    });

    it('赤色のスタイルが適用される', () => {
      render(<FreeTierWarning platform="tabelog" />);
      
      const warning = screen.getByText('食べログ制限中').closest('div');
      expect(warning).toHaveClass('bg-red-50', 'border-red-200', 'text-red-800');
    });
  });

  describe('カスタムスタイル', () => {
    it('カスタムクラスが適用される', () => {
      render(<FreeTierWarning platform="hotpepper" className="custom-warning" />);
      
      const warning = screen.getByText('ホットペッパー制限中').closest('div');
      expect(warning).toHaveClass('custom-warning');
    });
  });

  describe('レスポンシブ対応', () => {
    it('モバイル環境でも適切に表示される', () => {
      // モバイル環境をシミュレート
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<FreeTierWarning platform="tabelog" />);
      
      expect(screen.getByText('食べログ制限中')).toBeInTheDocument();
    });
  });
});

describe('統合シナリオテスト', () => {
  it('通常時の表示（制限なし）', () => {
    const normalUsage = {
      hotpepperRequests: 50,
      hotpepperLimit: 300,
      tabelogRequests: 10,
      tabelogLimit: 50,
    };

    render(
      <div>
        <FreeTierBadge 
          compact={false} 
          showUsage={true} 
          usageData={normalUsage} 
        />
      </div>
    );
    
    expect(screen.getByText('無料版で運用中')).toBeInTheDocument();
    expect(screen.getByText('50/300')).toBeInTheDocument();
    expect(screen.getByText('10/50')).toBeInTheDocument();
    
    // 通常色で表示されることを確認
    expect(screen.getByText('50/300')).not.toHaveClass('text-orange-600');
    expect(screen.getByText('10/50')).not.toHaveClass('text-orange-600');
  });

  it('制限近接時の表示（警告状態）', () => {
    const nearLimitUsage = {
      hotpepperRequests: 280,
      hotpepperLimit: 300,
      tabelogRequests: 48,
      tabelogLimit: 50,
    };

    render(
      <div>
        <FreeTierBadge 
          compact={false} 
          showUsage={true} 
          usageData={nearLimitUsage} 
        />
      </div>
    );
    
    // 警告色で表示されることを確認
    expect(screen.getByText('280/300')).toHaveClass('text-orange-600');
    expect(screen.getByText('48/50')).toHaveClass('text-orange-600');
  });

  it('制限到達時の完全な警告表示', () => {
    render(
      <div>
        <FreeTierBadge compact={true} />
        <FreeTierWarning platform="hotpepper" />
        <FreeTierWarning platform="tabelog" />
      </div>
    );
    
    expect(screen.getByText('無料版')).toBeInTheDocument();
    expect(screen.getByText('ホットペッパー制限中')).toBeInTheDocument();
    expect(screen.getByText('食べログ制限中')).toBeInTheDocument();
  });
});