// Performance monitoring and analytics

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  url: string;
  userAgent: string;
}

interface UserAction {
  action: string;
  category: string;
  label?: string;
  value?: number;
  timestamp: number;
  url: string;
  userId?: string;
}

class Analytics {
  private isEnabled: boolean;
  private apiEndpoint: string;
  private userId: string | null;
  private sessionId: string;
  private metricsQueue: PerformanceMetric[] = [];
  private actionsQueue: UserAction[] = [];

  constructor() {
    this.isEnabled = import.meta.env.PROD;
    this.apiEndpoint = import.meta.env.VITE_ANALYTICS_ENDPOINT || '/api/analytics';
    this.userId = this.getUserId();
    this.sessionId = this.generateSessionId();
    
    this.setupPerformanceObserver();
    this.setupErrorTracking();
    this.setupUserInteractionTracking();
    
    // Send queued data periodically
    setInterval(() => {
      this.flushQueues();
    }, 30000); // Every 30 seconds

    // Send data before page unload
    window.addEventListener('beforeunload', () => {
      this.flushQueues(true);
    });
  }

  private getUserId(): string | null {
    try {
      return localStorage.getItem('user-id') || null;
    } catch {
      return null;
    }
  }

  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private setupPerformanceObserver(): void {
    if (!this.isEnabled || !('PerformanceObserver' in window)) return;

    // Web Vitals observer
    try {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          this.recordMetric({
            name: entry.name,
            value: (entry as any).value || (entry as any).processingStart - entry.startTime,
            timestamp: Date.now(),
            url: window.location.href,
            userAgent: navigator.userAgent,
          });
        });
      });

      observer.observe({ entryTypes: ['navigation', 'paint', 'largest-contentful-paint'] });
    } catch (error) {
      console.warn('Performance observer setup failed:', error);
    }

    // Manual Core Web Vitals measurement
    this.measureCoreWebVitals();
  }

  private measureCoreWebVitals(): void {
    // First Contentful Paint (FCP)
    const paintEntries = performance.getEntriesByType('paint');
    const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint');
    if (fcpEntry) {
      this.recordMetric({
        name: 'first-contentful-paint',
        value: fcpEntry.startTime,
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent,
      });
    }

    // Largest Contentful Paint (LCP)
    if ('PerformanceObserver' in window) {
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          
          this.recordMetric({
            name: 'largest-contentful-paint',
            value: lastEntry.startTime,
            timestamp: Date.now(),
            url: window.location.href,
            userAgent: navigator.userAgent,
          });
        });

        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (error) {
        console.warn('LCP observer setup failed:', error);
      }
    }

    // Cumulative Layout Shift (CLS)
    if ('PerformanceObserver' in window) {
      try {
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry: any) => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          });

          this.recordMetric({
            name: 'cumulative-layout-shift',
            value: clsValue,
            timestamp: Date.now(),
            url: window.location.href,
            userAgent: navigator.userAgent,
          });
        });

        clsObserver.observe({ entryTypes: ['layout-shift'] });
      } catch (error) {
        console.warn('CLS observer setup failed:', error);
      }
    }

    // First Input Delay (FID)
    if ('PerformanceObserver' in window) {
      try {
        const fidObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            this.recordMetric({
              name: 'first-input-delay',
              value: (entry as any).processingStart - entry.startTime,
              timestamp: Date.now(),
              url: window.location.href,
              userAgent: navigator.userAgent,
            });
          });
        });

        fidObserver.observe({ entryTypes: ['first-input'] });
      } catch (error) {
        console.warn('FID observer setup failed:', error);
      }
    }
  }

  private setupErrorTracking(): void {
    if (!this.isEnabled) return;

    // JavaScript errors
    window.addEventListener('error', (event) => {
      this.trackError({
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack,
      });
    });

    // Promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.trackError({
        message: `Unhandled promise rejection: ${event.reason}`,
        stack: event.reason?.stack,
      });
    });
  }

  private setupUserInteractionTracking(): void {
    if (!this.isEnabled) return;

    // Click tracking
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      const button = target.closest('button, a, [role="button"]');
      
      if (button) {
        this.trackAction({
          action: 'click',
          category: 'user-interaction',
          label: button.textContent?.trim() || button.tagName.toLowerCase(),
          timestamp: Date.now(),
          url: window.location.href,
        });
      }
    });

    // Form submissions
    document.addEventListener('submit', (event) => {
      const form = event.target as HTMLFormElement;
      this.trackAction({
        action: 'form-submit',
        category: 'user-interaction',
        label: form.id || form.className || 'form',
        timestamp: Date.now(),
        url: window.location.href,
      });
    });
  }

  private recordMetric(metric: PerformanceMetric): void {
    this.metricsQueue.push(metric);
    
    // Log important metrics to console in development
    if (import.meta.env.DEV) {
      console.log(`Performance metric: ${metric.name} = ${metric.value.toFixed(2)}ms`);
    }
  }

  public trackAction(action: Omit<UserAction, 'userId'>): void {
    if (!this.isEnabled) return;

    this.actionsQueue.push({
      ...action,
      userId: this.userId || undefined,
    });
  }

  public trackPageView(path: string): void {
    this.trackAction({
      action: 'page-view',
      category: 'navigation',
      label: path,
      timestamp: Date.now(),
      url: window.location.href,
    });
  }

  public trackSearch(query: string, resultCount: number): void {
    this.trackAction({
      action: 'search',
      category: 'search',
      label: query,
      value: resultCount,
      timestamp: Date.now(),
      url: window.location.href,
    });
  }

  public trackRestaurantView(restaurantId: string): void {
    this.trackAction({
      action: 'restaurant-view',
      category: 'restaurant',
      label: restaurantId,
      timestamp: Date.now(),
      url: window.location.href,
    });
  }

  public trackFavoriteToggle(restaurantId: string, added: boolean): void {
    this.trackAction({
      action: added ? 'favorite-add' : 'favorite-remove',
      category: 'favorite',
      label: restaurantId,
      timestamp: Date.now(),
      url: window.location.href,
    });
  }

  private trackError(error: any): void {
    if (!this.isEnabled) return;

    this.trackAction({
      action: 'error',
      category: 'error',
      label: error.message || 'Unknown error',
      timestamp: Date.now(),
      url: window.location.href,
    });

    // Send error immediately
    this.sendData('/api/errors', [{
      ...error,
      sessionId: this.sessionId,
      userId: this.userId,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    }]);
  }

  private async flushQueues(immediate = false): Promise<void> {
    if (this.metricsQueue.length === 0 && this.actionsQueue.length === 0) {
      return;
    }

    const metrics = [...this.metricsQueue];
    const actions = [...this.actionsQueue];
    
    this.metricsQueue = [];
    this.actionsQueue = [];

    try {
      if (metrics.length > 0) {
        await this.sendData('/api/metrics', metrics, immediate);
      }
      
      if (actions.length > 0) {
        await this.sendData('/api/actions', actions, immediate);
      }
    } catch (error) {
      console.warn('Failed to send analytics data:', error);
      
      // Re-queue data if send failed (unless immediate)
      if (!immediate) {
        this.metricsQueue.unshift(...metrics);
        this.actionsQueue.unshift(...actions);
      }
    }
  }

  private async sendData(endpoint: string, data: any[], immediate = false): Promise<void> {
    if (!this.isEnabled || data.length === 0) return;

    const payload = {
      sessionId: this.sessionId,
      data,
      timestamp: Date.now(),
    };

    try {
      if (immediate && 'sendBeacon' in navigator) {
        // Use sendBeacon for reliable delivery during page unload
        navigator.sendBeacon(
          `${this.apiEndpoint}${endpoint}`,
          JSON.stringify(payload)
        );
      } else {
        // Use fetch for normal requests
        await fetch(`${this.apiEndpoint}${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
      }
    } catch (error) {
      console.warn(`Failed to send data to ${endpoint}:`, error);
      throw error;
    }
  }

  public setUserId(userId: string): void {
    this.userId = userId;
    try {
      localStorage.setItem('user-id', userId);
    } catch {
      // Ignore storage errors
    }
  }

  public getSessionId(): string {
    return this.sessionId;
  }
}

// Singleton instance
export const analytics = new Analytics();