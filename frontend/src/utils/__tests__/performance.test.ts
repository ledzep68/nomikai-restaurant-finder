import { PerformanceMonitor, ResourceOptimizer } from '../performance';

// Mock PerformanceObserver
const mockPerformanceObserver = jest.fn().mockImplementation((callback) => ({
  observe: jest.fn(),
  disconnect: jest.fn(),
}));

(global as any).PerformanceObserver = mockPerformanceObserver;

describe('PerformanceMonitor', () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    jest.clearAllMocks();
    monitor = new PerformanceMonitor();
  });

  afterEach(() => {
    monitor.disconnect();
  });

  describe('getMetrics', () => {
    test('should return initial empty metrics', () => {
      const metrics = monitor.getMetrics();
      expect(metrics).toEqual({});
    });
  });

  describe('evaluatePerformance', () => {
    test('should return zero score when no metrics available', () => {
      const evaluation = monitor.evaluatePerformance();
      
      expect(evaluation.score).toBe(0);
      expect(evaluation.grades).toEqual({});
      expect(evaluation.recommendations).toEqual([]);
    });

    test('should evaluate good LCP performance', () => {
      // Simulate good LCP
      (monitor as any).metrics.largestContentfulPaint = 2000; // 2s
      
      const evaluation = monitor.evaluatePerformance();
      
      expect(evaluation.grades.LCP).toBe('good');
      expect(evaluation.score).toBe(100);
      expect(evaluation.recommendations).toHaveLength(0);
    });

    test('should evaluate needs improvement LCP performance', () => {
      // Simulate needs improvement LCP
      (monitor as any).metrics.largestContentfulPaint = 3000; // 3s
      
      const evaluation = monitor.evaluatePerformance();
      
      expect(evaluation.grades.LCP).toBe('needs-improvement');
      expect(evaluation.score).toBe(50);
      expect(evaluation.recommendations).toContain('画像最適化とキャッシュ戦略の見直しでLCPを改善');
    });

    test('should evaluate poor LCP performance', () => {
      // Simulate poor LCP
      (monitor as any).metrics.largestContentfulPaint = 5000; // 5s
      
      const evaluation = monitor.evaluatePerformance();
      
      expect(evaluation.grades.LCP).toBe('poor');
      expect(evaluation.score).toBe(0);
      expect(evaluation.recommendations).toContain('重要リソースの優先読み込みとサーバー応答時間の改善が必要');
    });

    test('should evaluate FID performance', () => {
      // Good FID
      (monitor as any).metrics.firstInputDelay = 50; // 50ms
      
      let evaluation = monitor.evaluatePerformance();
      expect(evaluation.grades.FID).toBe('good');
      
      // Needs improvement FID
      (monitor as any).metrics.firstInputDelay = 200; // 200ms
      
      evaluation = monitor.evaluatePerformance();
      expect(evaluation.grades.FID).toBe('needs-improvement');
      
      // Poor FID
      (monitor as any).metrics.firstInputDelay = 400; // 400ms
      
      evaluation = monitor.evaluatePerformance();
      expect(evaluation.grades.FID).toBe('poor');
    });

    test('should evaluate CLS performance', () => {
      // Good CLS
      (monitor as any).metrics.cumulativeLayoutShift = 0.05;
      
      let evaluation = monitor.evaluatePerformance();
      expect(evaluation.grades.CLS).toBe('good');
      
      // Needs improvement CLS
      (monitor as any).metrics.cumulativeLayoutShift = 0.15;
      
      evaluation = monitor.evaluatePerformance();
      expect(evaluation.grades.CLS).toBe('needs-improvement');
      
      // Poor CLS
      (monitor as any).metrics.cumulativeLayoutShift = 0.3;
      
      evaluation = monitor.evaluatePerformance();
      expect(evaluation.grades.CLS).toBe('poor');
    });

    test('should calculate average score for multiple metrics', () => {
      (monitor as any).metrics = {
        largestContentfulPaint: 2000, // Good: 100
        firstInputDelay: 200, // Needs improvement: 50
        cumulativeLayoutShift: 0.3, // Poor: 0
      };
      
      const evaluation = monitor.evaluatePerformance();
      
      expect(evaluation.score).toBe(50); // (100 + 50 + 0) / 3
      expect(Object.keys(evaluation.grades)).toHaveLength(3);
    });
  });

  describe('sendReport', () => {
    let consoleGroupSpy: jest.SpyInstance;
    let consoleLogSpy: jest.SpyInstance;
    let consoleGroupEndSpy: jest.SpyInstance;
    const originalEnv = process.env.NODE_ENV;

    beforeEach(() => {
      consoleGroupSpy = jest.spyOn(console, 'group').mockImplementation();
      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      consoleGroupEndSpy = jest.spyOn(console, 'groupEnd').mockImplementation();
    });

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
      consoleGroupSpy.mockRestore();
      consoleLogSpy.mockRestore();
      consoleGroupEndSpy.mockRestore();
    });

    test('should log report in development', () => {
      process.env.NODE_ENV = 'development';
      
      monitor.sendReport();
      
      expect(consoleGroupSpy).toHaveBeenCalledWith('Performance Report');
      expect(consoleLogSpy).toHaveBeenCalledWith('Metrics:', expect.any(Object));
      expect(consoleLogSpy).toHaveBeenCalledWith('Evaluation:', expect.any(Object));
      expect(consoleGroupEndSpy).toHaveBeenCalled();
    });

    test('should not log in production', () => {
      process.env.NODE_ENV = 'production';
      global.fetch = jest.fn().mockResolvedValue({ ok: true });
      
      monitor.sendReport();
      
      expect(consoleGroupSpy).not.toHaveBeenCalled();
      expect(fetch).toHaveBeenCalledWith('/api/analytics/performance', expect.any(Object));
    });
  });
});

describe('ResourceOptimizer', () => {
  describe('setupLazyLoading', () => {
    let mockObserve: jest.Mock;
    let mockIntersectionObserver: jest.Mock;

    beforeEach(() => {
      mockObserve = jest.fn();
      mockIntersectionObserver = jest.fn().mockImplementation((callback) => ({
        observe: mockObserve,
        unobserve: jest.fn(),
        disconnect: jest.fn(),
      }));
      
      (global as any).IntersectionObserver = mockIntersectionObserver;
    });

    test('should set up lazy loading for images with data-src', () => {
      // Create mock images
      const img1 = document.createElement('img');
      img1.dataset.src = 'image1.jpg';
      const img2 = document.createElement('img');
      img2.dataset.src = 'image2.jpg';
      
      document.body.appendChild(img1);
      document.body.appendChild(img2);
      
      ResourceOptimizer.setupLazyLoading();
      
      expect(mockIntersectionObserver).toHaveBeenCalled();
      expect(mockObserve).toHaveBeenCalledTimes(2);
      
      // Clean up
      document.body.removeChild(img1);
      document.body.removeChild(img2);
    });

    test('should handle intersection observer callback', () => {
      const img = document.createElement('img');
      img.dataset.src = 'test.jpg';
      img.classList.add('lazy');
      
      document.body.appendChild(img);
      
      let observerCallback: IntersectionObserverCallback | null = null;
      mockIntersectionObserver.mockImplementation((callback) => {
        observerCallback = callback;
        return {
          observe: mockObserve,
          unobserve: jest.fn(),
          disconnect: jest.fn(),
        };
      });
      
      ResourceOptimizer.setupLazyLoading();
      
      // Simulate intersection
      if (observerCallback) {
        observerCallback([
          {
            isIntersecting: true,
            target: img,
          } as any,
        ], {} as any);
      }
      
      expect(img.src).toContain('test.jpg');
      expect(img.classList.contains('lazy')).toBe(false);
      
      // Clean up
      document.body.removeChild(img);
    });
  });

  describe('deferNonCriticalResources', () => {
    test('should convert preload fonts to stylesheets', () => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.setAttribute('as', 'font');
      document.head.appendChild(link);
      
      ResourceOptimizer.deferNonCriticalResources();
      
      expect(link.rel).toBe('stylesheet');
      
      // Clean up
      document.head.removeChild(link);
    });

    test('should defer scripts with data-defer attribute', () => {
      const script = document.createElement('script');
      script.src = 'test.js';
      script.setAttribute('data-defer', 'true');
      document.head.appendChild(script);
      
      const appendChildSpy = jest.spyOn(document.head, 'appendChild');
      
      ResourceOptimizer.deferNonCriticalResources();
      
      expect(appendChildSpy).toHaveBeenCalledWith(expect.objectContaining({
        src: 'test.js',
        async: true,
      }));
      
      // Clean up
      document.head.removeChild(script);
      appendChildSpy.mockRestore();
    });
  });
});