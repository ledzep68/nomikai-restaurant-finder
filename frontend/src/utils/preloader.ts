// Resource preloading and prefetching utilities

interface PreloadOptions {
  priority?: 'high' | 'low';
  crossOrigin?: 'anonymous' | 'use-credentials';
  as?: 'script' | 'style' | 'image' | 'font' | 'fetch';
}

class ResourcePreloader {
  private preloadedResources = new Set<string>();
  private prefetchedResources = new Set<string>();

  /**
   * Preload a critical resource with high priority
   */
  preload(href: string, options: PreloadOptions = {}): void {
    if (this.preloadedResources.has(href)) {
      return;
    }

    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = href;
    
    if (options.as) {
      link.as = options.as;
    }
    
    if (options.crossOrigin) {
      link.crossOrigin = options.crossOrigin;
    }

    // Add to head
    document.head.appendChild(link);
    this.preloadedResources.add(href);

    // Remove after 10 seconds if not used to prevent warnings
    setTimeout(() => {
      if (document.head.contains(link)) {
        document.head.removeChild(link);
      }
    }, 10000);

    console.log(`Preloaded: ${href}`);
  }

  /**
   * Prefetch a resource for future navigation
   */
  prefetch(href: string): void {
    if (this.prefetchedResources.has(href)) {
      return;
    }

    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = href;
    
    document.head.appendChild(link);
    this.prefetchedResources.add(href);

    console.log(`Prefetched: ${href}`);
  }

  /**
   * Preload images that are likely to be needed soon
   */
  preloadImages(imageUrls: string[]): void {
    imageUrls.forEach(url => {
      if (!this.preloadedResources.has(url)) {
        this.preload(url, { as: 'image' });
      }
    });
  }

  /**
   * Prefetch route components based on user behavior
   */
  prefetchRoute(routePath: string): void {
    // In a real app, this would prefetch the route's JavaScript bundle
    const routeMapping: Record<string, string> = {
      '/search': '/static/js/search.chunk.js',
      '/favorites': '/static/js/favorites.chunk.js',
      '/history': '/static/js/history.chunk.js',
      '/restaurant': '/static/js/restaurant.chunk.js',
    };

    const chunkPath = routeMapping[routePath];
    if (chunkPath) {
      this.prefetch(chunkPath);
    }
  }

  /**
   * Preload critical resources based on current page
   */
  preloadCriticalResources(pageName: string): void {
    const criticalResources: Record<string, { scripts: string[]; styles: string[]; fonts: string[] }> = {
      home: {
        scripts: [],
        styles: ['/static/css/home.css'],
        fonts: ['/fonts/noto-sans-jp.woff2'],
      },
      search: {
        scripts: ['/static/js/search-bundle.js'],
        styles: ['/static/css/search.css'],
        fonts: ['/fonts/noto-sans-jp.woff2'],
      },
      restaurant: {
        scripts: ['/static/js/restaurant-bundle.js'],
        styles: ['/static/css/restaurant.css'],
        fonts: ['/fonts/noto-sans-jp.woff2'],
      },
    };

    const resources = criticalResources[pageName];
    if (!resources) return;

    // Preload fonts first (highest priority)
    resources.fonts.forEach(font => {
      this.preload(font, { as: 'font', crossOrigin: 'anonymous' });
    });

    // Preload critical CSS
    resources.styles.forEach(style => {
      this.preload(style, { as: 'style' });
    });

    // Preload critical JavaScript
    resources.scripts.forEach(script => {
      this.preload(script, { as: 'script' });
    });
  }

  /**
   * Smart prefetching based on user interactions
   */
  setupIntelligentPrefetching(): void {
    // Prefetch on hover (desktop)
    document.addEventListener('mouseover', (event) => {
      const target = event.target as HTMLElement;
      const link = target.closest('a[href]') as HTMLAnchorElement;
      
      if (link && link.host === window.location.host) {
        this.prefetchRoute(link.pathname);
      }
    });

    // Prefetch on touch start (mobile)
    document.addEventListener('touchstart', (event) => {
      const target = event.target as HTMLElement;
      const link = target.closest('a[href]') as HTMLAnchorElement;
      
      if (link && link.host === window.location.host) {
        this.prefetchRoute(link.pathname);
      }
    });

    // Prefetch when links are in viewport
    if ('IntersectionObserver' in window) {
      const linkObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const link = entry.target as HTMLAnchorElement;
            if (link.host === window.location.host) {
              // Delay prefetch to avoid competing with critical resources
              setTimeout(() => {
                this.prefetchRoute(link.pathname);
              }, 2000);
            }
          }
        });
      }, {
        rootMargin: '200px',
      });

      // Observe all internal links
      setTimeout(() => {
        document.querySelectorAll('a[href^="/"]').forEach(link => {
          linkObserver.observe(link);
        });
      }, 1000);
    }
  }

  /**
   * Preload restaurant images when they're likely to be viewed
   */
  preloadRestaurantImages(restaurants: any[]): void {
    const imageUrls = restaurants
      .slice(0, 5) // Only preload first 5 images
      .map(restaurant => restaurant.images?.[0])
      .filter(Boolean);

    this.preloadImages(imageUrls);
  }

  /**
   * Clear all preloaded resources (for cleanup)
   */
  clear(): void {
    this.preloadedResources.clear();
    this.prefetchedResources.clear();
  }
}

// Singleton instance
export const preloader = new ResourcePreloader();

// Auto-setup intelligent prefetching
if (typeof window !== 'undefined') {
  // Wait for initial page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      preloader.setupIntelligentPrefetching();
    });
  } else {
    preloader.setupIntelligentPrefetching();
  }
}

// Utility functions for specific use cases
export const preloadFonts = () => {
  preloader.preload('/fonts/noto-sans-jp-400.woff2', { 
    as: 'font', 
    crossOrigin: 'anonymous' 
  });
  preloader.preload('/fonts/noto-sans-jp-700.woff2', { 
    as: 'font', 
    crossOrigin: 'anonymous' 
  });
};

export const preloadCriticalCSS = () => {
  preloader.preload('/static/css/main.css', { as: 'style' });
};

export const preloadSearchAssets = () => {
  preloader.preloadCriticalResources('search');
};

export const preloadRestaurantAssets = () => {
  preloader.preloadCriticalResources('restaurant');
};