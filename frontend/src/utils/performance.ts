// パフォーマンス最適化ユーティリティ

export interface PerformanceMetrics {
  firstContentfulPaint?: number;
  largestContentfulPaint?: number;
  firstInputDelay?: number;
  cumulativeLayoutShift?: number;
  timeToInteractive?: number;
}

export class PerformanceMonitor {
  private metrics: PerformanceMetrics = {};
  private observers: PerformanceObserver[] = [];

  constructor() {
    this.initializeObservers();
  }

  private initializeObservers(): void {
    // Core Web Vitals の監視
    if ('PerformanceObserver' in window) {
      // Largest Contentful Paint (LCP)
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1] as any;
          this.metrics.largestContentfulPaint = lastEntry.startTime;
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        this.observers.push(lcpObserver);
      } catch (e) {
        console.warn('LCP observer not supported');
      }

      // First Input Delay (FID)
      try {
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            this.metrics.firstInputDelay = entry.processingStart - entry.startTime;
          });
        });
        fidObserver.observe({ entryTypes: ['first-input'] });
        this.observers.push(fidObserver);
      } catch (e) {
        console.warn('FID observer not supported');
      }

      // Cumulative Layout Shift (CLS)
      try {
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
              this.metrics.cumulativeLayoutShift = clsValue;
            }
          });
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
        this.observers.push(clsObserver);
      } catch (e) {
        console.warn('CLS observer not supported');
      }
    }

    // First Contentful Paint (FCP)
    if ('performance' in window && 'getEntriesByType' in performance) {
      const paintEntries = performance.getEntriesByType('paint');
      const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint');
      if (fcpEntry) {
        this.metrics.firstContentfulPaint = fcpEntry.startTime;
      }
    }
  }

  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  // TTI (Time to Interactive) の近似計算
  calculateTTI(): Promise<number> {
    return new Promise((resolve) => {
      if ('performance' in window) {
        const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (navigationEntry) {
          const tti = navigationEntry.domInteractive;
          this.metrics.timeToInteractive = tti;
          resolve(tti);
        }
      }
      resolve(0);
    });
  }

  // パフォーマンス評価
  evaluatePerformance(): {
    score: number;
    grades: Record<string, 'good' | 'needs-improvement' | 'poor'>;
    recommendations: string[];
  } {
    const grades: Record<string, 'good' | 'needs-improvement' | 'poor'> = {};
    const recommendations: string[] = [];
    let totalScore = 0;
    let metricsCount = 0;

    // LCP評価 (Good: <2.5s, Needs Improvement: 2.5s-4s, Poor: >4s)
    if (this.metrics.largestContentfulPaint) {
      const lcp = this.metrics.largestContentfulPaint;
      if (lcp < 2500) {
        grades.LCP = 'good';
        totalScore += 100;
      } else if (lcp < 4000) {
        grades.LCP = 'needs-improvement';
        totalScore += 50;
        recommendations.push('画像最適化とキャッシュ戦略の見直しでLCPを改善');
      } else {
        grades.LCP = 'poor';
        totalScore += 0;
        recommendations.push('重要リソースの優先読み込みとサーバー応答時間の改善が必要');
      }
      metricsCount++;
    }

    // FID評価 (Good: <100ms, Needs Improvement: 100ms-300ms, Poor: >300ms)
    if (this.metrics.firstInputDelay) {
      const fid = this.metrics.firstInputDelay;
      if (fid < 100) {
        grades.FID = 'good';
        totalScore += 100;
      } else if (fid < 300) {
        grades.FID = 'needs-improvement';
        totalScore += 50;
        recommendations.push('JavaScript実行時間の最適化でFIDを改善');
      } else {
        grades.FID = 'poor';
        totalScore += 0;
        recommendations.push('メインスレッドのブロッキング時間を短縮する必要があります');
      }
      metricsCount++;
    }

    // CLS評価 (Good: <0.1, Needs Improvement: 0.1-0.25, Poor: >0.25)
    if (this.metrics.cumulativeLayoutShift !== undefined) {
      const cls = this.metrics.cumulativeLayoutShift;
      if (cls < 0.1) {
        grades.CLS = 'good';
        totalScore += 100;
      } else if (cls < 0.25) {
        grades.CLS = 'needs-improvement';
        totalScore += 50;
        recommendations.push('画像とiframeのサイズ指定でCLSを改善');
      } else {
        grades.CLS = 'poor';
        totalScore += 0;
        recommendations.push('レイアウトシフトを引き起こす要素の修正が必要');
      }
      metricsCount++;
    }

    const score = metricsCount > 0 ? Math.round(totalScore / metricsCount) : 0;

    return { score, grades, recommendations };
  }

  // パフォーマンスレポートの送信
  sendReport(): void {
    const metrics = this.getMetrics();
    const evaluation = this.evaluatePerformance();
    
    // 開発環境ではコンソールに出力
    if (process.env.NODE_ENV === 'development') {
      console.group('Performance Report');
      console.log('Metrics:', metrics);
      console.log('Evaluation:', evaluation);
      console.groupEnd();
    }

    // 本番環境では分析サービスに送信（実装例）
    if (process.env.NODE_ENV === 'production') {
      // Google Analytics 4 の例
      if ('gtag' in window) {
        (window as any).gtag('event', 'page_performance', {
          'custom_parameter_lcp': metrics.largestContentfulPaint,
          'custom_parameter_fid': metrics.firstInputDelay,
          'custom_parameter_cls': metrics.cumulativeLayoutShift,
          'custom_parameter_score': evaluation.score
        });
      }

      // 独自の分析エンドポイントに送信
      fetch('/api/analytics/performance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: window.location.href,
          userAgent: navigator.userAgent,
          metrics,
          evaluation,
          timestamp: Date.now()
        })
      }).catch(err => console.warn('Performance report failed:', err));
    }
  }

  // オブザーバーのクリーンアップ
  disconnect(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

// リソース最適化ユーティリティ
export class ResourceOptimizer {
  // 画像の遅延読み込み
  static setupLazyLoading(): void {
    if ('IntersectionObserver' in window) {
      const lazyImageObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            if (img.dataset.src) {
              img.src = img.dataset.src;
              img.classList.remove('lazy');
              lazyImageObserver.unobserve(img);
            }
          }
        });
      });

      document.querySelectorAll('img[data-src]').forEach((img) => {
        lazyImageObserver.observe(img);
      });
    }
  }

  // 重要でないリソースの遅延読み込み
  static deferNonCriticalResources(): void {
    // フォントの最適化
    const fontLinks = document.querySelectorAll('link[rel="preload"][as="font"]');
    fontLinks.forEach((link) => {
      (link as HTMLLinkElement).rel = 'stylesheet';
    });

    // 重要でないスクリプトの遅延読み込み
    const deferredScripts = document.querySelectorAll('script[data-defer]');
    deferredScripts.forEach((script) => {
      const newScript = document.createElement('script');
      newScript.src = (script as HTMLScriptElement).src;
      newScript.async = true;
      document.head.appendChild(newScript);
    });
  }

  // Service Worker の登録
  static registerServiceWorker(): void {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then((registration) => {
            console.log('SW registered: ', registration);
          })
          .catch((registrationError) => {
            console.log('SW registration failed: ', registrationError);
          });
      });
    }
  }
}

import React from 'react';

// パフォーマンス最適化のためのReact Hook
export const usePerformanceMonitor = () => {
  const [monitor] = React.useState(() => new PerformanceMonitor());
  const [metrics, setMetrics] = React.useState<PerformanceMetrics>({});

  React.useEffect(() => {
    // 初期メトリクスの取得
    setMetrics(monitor.getMetrics());

    // 定期的なメトリクス更新
    const interval = setInterval(() => {
      setMetrics(monitor.getMetrics());
    }, 1000);

    // ページアンロード時のレポート送信
    const handleBeforeUnload = () => {
      monitor.sendReport();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      monitor.disconnect();
    };
  }, [monitor]);

  return {
    metrics,
    sendReport: () => monitor.sendReport(),
    evaluate: () => monitor.evaluatePerformance()
  };
};

// グローバルパフォーマンスモニターのインスタンス
export const globalPerformanceMonitor = new PerformanceMonitor();