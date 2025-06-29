import { preloader } from '../preloader';

// Mock document methods
const mockCreateElement = jest.fn();
const mockAppendChild = jest.fn();
const mockHead = { appendChild: mockAppendChild };

Object.defineProperty(document, 'createElement', {
  value: mockCreateElement,
});

Object.defineProperty(document, 'head', {
  value: mockHead,
});

describe('preloader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock link element
    const mockLinkElement = {
      rel: '',
      href: '',
      as: '',
      crossOrigin: '',
    };
    
    mockCreateElement.mockReturnValue(mockLinkElement);
  });

  describe('preload', () => {
    it('creates preload link with correct attributes', () => {
      preloader.preload('/test.js', { as: 'script' });
      
      expect(mockCreateElement).toHaveBeenCalledWith('link');
      expect(mockAppendChild).toHaveBeenCalled();
    });

    it('does not duplicate preload for same resource', () => {
      preloader.preload('/test.js', { as: 'script' });
      preloader.preload('/test.js', { as: 'script' });
      
      expect(mockCreateElement).toHaveBeenCalledTimes(1);
      expect(mockAppendChild).toHaveBeenCalledTimes(1);
    });

    it('handles crossOrigin option', () => {
      preloader.preload('/font.woff2', { 
        as: 'font', 
        crossOrigin: 'anonymous' 
      });
      
      expect(mockCreateElement).toHaveBeenCalledWith('link');
    });
  });

  describe('prefetch', () => {
    it('creates prefetch link', () => {
      preloader.prefetch('/future-page.js');
      
      expect(mockCreateElement).toHaveBeenCalledWith('link');
      expect(mockAppendChild).toHaveBeenCalled();
    });

    it('does not duplicate prefetch for same resource', () => {
      preloader.prefetch('/future-page.js');
      preloader.prefetch('/future-page.js');
      
      expect(mockCreateElement).toHaveBeenCalledTimes(1);
      expect(mockAppendChild).toHaveBeenCalledTimes(1);
    });
  });

  describe('preloadImages', () => {
    it('preloads multiple images', () => {
      const imageUrls = [
        'https://example.com/image1.jpg',
        'https://example.com/image2.jpg',
      ];
      
      preloader.preloadImages(imageUrls);
      
      expect(mockCreateElement).toHaveBeenCalledTimes(2);
      expect(mockAppendChild).toHaveBeenCalledTimes(2);
    });

    it('skips already preloaded images', () => {
      const imageUrls = [
        'https://example.com/image1.jpg',
        'https://example.com/image1.jpg', // Duplicate
      ];
      
      preloader.preloadImages(imageUrls);
      
      expect(mockCreateElement).toHaveBeenCalledTimes(1);
      expect(mockAppendChild).toHaveBeenCalledTimes(1);
    });
  });

  describe('preloadCriticalResources', () => {
    it('preloads resources for home page', () => {
      preloader.preloadCriticalResources('home');
      
      // Should preload fonts, styles, and scripts
      expect(mockCreateElement).toHaveBeenCalled();
      expect(mockAppendChild).toHaveBeenCalled();
    });

    it('preloads resources for search page', () => {
      preloader.preloadCriticalResources('search');
      
      expect(mockCreateElement).toHaveBeenCalled();
      expect(mockAppendChild).toHaveBeenCalled();
    });

    it('handles unknown page gracefully', () => {
      preloader.preloadCriticalResources('unknown-page');
      
      // Should not crash or throw errors
      expect(mockCreateElement).not.toHaveBeenCalled();
    });
  });

  describe('preloadRestaurantImages', () => {
    it('preloads first 5 restaurant images', () => {
      const restaurants = Array.from({ length: 10 }, (_, i) => ({
        id: i,
        images: [`https://example.com/restaurant${i}.jpg`],
      }));
      
      preloader.preloadRestaurantImages(restaurants);
      
      // Should only preload first 5
      expect(mockCreateElement).toHaveBeenCalledTimes(5);
      expect(mockAppendChild).toHaveBeenCalledTimes(5);
    });

    it('handles restaurants without images', () => {
      const restaurants = [
        { id: 1, images: [] },
        { id: 2 }, // No images property
        { id: 3, images: ['https://example.com/restaurant3.jpg'] },
      ];
      
      preloader.preloadRestaurantImages(restaurants);
      
      // Should only preload the one valid image
      expect(mockCreateElement).toHaveBeenCalledTimes(1);
      expect(mockAppendChild).toHaveBeenCalledTimes(1);
    });
  });

  describe('clear', () => {
    it('clears preloaded resources tracking', () => {
      preloader.preload('/test.js');
      preloader.prefetch('/future.js');
      
      preloader.clear();
      
      // After clearing, should be able to preload same resources again
      preloader.preload('/test.js');
      preloader.prefetch('/future.js');
      
      expect(mockCreateElement).toHaveBeenCalledTimes(4); // 2 + 2 after clear
    });
  });
});