import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { SEOHead, SEOProvider } from '../SEOHead';
import type { SEOConfig } from '@utils/seo';

// Mock react-helmet-async
jest.mock('react-helmet-async', () => ({
  Helmet: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  HelmetProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('SEOHead', () => {
  const mockConfig: SEOConfig = {
    title: 'Test Page Title',
    description: 'Test page description',
    keywords: ['test', 'keywords', 'seo'],
    canonical: '/test-page',
    openGraph: {
      title: 'OG Test Title',
      description: 'OG test description',
      image: 'https://example.com/og-image.jpg',
      type: 'website',
      url: 'https://example.com/test-page',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Twitter Test Title',
      description: 'Twitter test description',
      image: 'https://example.com/twitter-image.jpg',
    },
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'Test Page',
    },
  };

  test('should render all meta tags correctly', () => {
    const { container } = render(
      <HelmetProvider>
        <SEOHead config={mockConfig} />
      </HelmetProvider>
    );

    // Check basic meta tags
    const title = container.querySelector('title');
    expect(title?.textContent).toBe('Test Page Title');

    const description = container.querySelector('meta[name="description"]');
    expect(description?.getAttribute('content')).toBe('Test page description');

    const keywords = container.querySelector('meta[name="keywords"]');
    expect(keywords?.getAttribute('content')).toBe('test, keywords, seo');

    // Check canonical link
    const canonical = container.querySelector('link[rel="canonical"]');
    expect(canonical?.getAttribute('href')).toBe('/test-page');

    // Check Open Graph tags
    const ogTitle = container.querySelector('meta[property="og:title"]');
    expect(ogTitle?.getAttribute('content')).toBe('OG Test Title');

    const ogDescription = container.querySelector('meta[property="og:description"]');
    expect(ogDescription?.getAttribute('content')).toBe('OG test description');

    const ogImage = container.querySelector('meta[property="og:image"]');
    expect(ogImage?.getAttribute('content')).toBe('https://example.com/og-image.jpg');

    const ogType = container.querySelector('meta[property="og:type"]');
    expect(ogType?.getAttribute('content')).toBe('website');

    const ogUrl = container.querySelector('meta[property="og:url"]');
    expect(ogUrl?.getAttribute('content')).toBe('https://example.com/test-page');

    // Check Twitter Card tags
    const twitterCard = container.querySelector('meta[name="twitter:card"]');
    expect(twitterCard?.getAttribute('content')).toBe('summary_large_image');

    const twitterTitle = container.querySelector('meta[name="twitter:title"]');
    expect(twitterTitle?.getAttribute('content')).toBe('Twitter Test Title');

    const twitterDescription = container.querySelector('meta[name="twitter:description"]');
    expect(twitterDescription?.getAttribute('content')).toBe('Twitter test description');

    const twitterImage = container.querySelector('meta[name="twitter:image"]');
    expect(twitterImage?.getAttribute('content')).toBe('https://example.com/twitter-image.jpg');

    // Check JSON-LD
    const jsonLd = container.querySelector('script[type="application/ld+json"]');
    expect(jsonLd?.textContent).toBe(JSON.stringify(mockConfig.jsonLd));
  });

  test('should render minimal config without optional fields', () => {
    const minimalConfig: SEOConfig = {
      title: 'Minimal Title',
      description: 'Minimal description',
    };

    const { container } = render(
      <HelmetProvider>
        <SEOHead config={minimalConfig} />
      </HelmetProvider>
    );

    const title = container.querySelector('title');
    expect(title?.textContent).toBe('Minimal Title');

    const description = container.querySelector('meta[name="description"]');
    expect(description?.getAttribute('content')).toBe('Minimal description');

    // Optional fields should not be rendered
    const keywords = container.querySelector('meta[name="keywords"]');
    expect(keywords).toBeNull();

    const canonical = container.querySelector('link[rel="canonical"]');
    expect(canonical).toBeNull();

    const ogTitle = container.querySelector('meta[property="og:title"]');
    expect(ogTitle).toBeNull();

    const twitterCard = container.querySelector('meta[name="twitter:card"]');
    expect(twitterCard).toBeNull();

    const jsonLd = container.querySelector('script[type="application/ld+json"]');
    expect(jsonLd).toBeNull();
  });

  test('should render PWA meta tags', () => {
    const { container } = render(
      <HelmetProvider>
        <SEOHead config={mockConfig} />
      </HelmetProvider>
    );

    const themeColor = container.querySelector('meta[name="theme-color"]');
    expect(themeColor?.getAttribute('content')).toBe('#1976d2');

    const appleCapable = container.querySelector('meta[name="apple-mobile-web-app-capable"]');
    expect(appleCapable?.getAttribute('content')).toBe('yes');

    const appleStatus = container.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    expect(appleStatus?.getAttribute('content')).toBe('default');

    const appleTitle = container.querySelector('meta[name="apple-mobile-web-app-title"]');
    expect(appleTitle?.getAttribute('content')).toBe('呑み会レストラン検索');
  });

  test('should render viewport and other standard meta tags', () => {
    const { container } = render(
      <HelmetProvider>
        <SEOHead config={mockConfig} />
      </HelmetProvider>
    );

    const viewport = container.querySelector('meta[name="viewport"]');
    expect(viewport?.getAttribute('content')).toBe('width=device-width, initial-scale=1.0');

    const robots = container.querySelector('meta[name="robots"]');
    expect(robots?.getAttribute('content')).toBe('index, follow');

    const author = container.querySelector('meta[name="author"]');
    expect(author?.getAttribute('content')).toBe('呑み会レストラン検索');

    const language = container.querySelector('meta[name="language"]');
    expect(language?.getAttribute('content')).toBe('ja');

    const contentLanguage = container.querySelector('meta[http-equiv="Content-Language"]');
    expect(contentLanguage?.getAttribute('content')).toBe('ja');
  });

  test('should render children elements', () => {
    const { getByText } = render(
      <HelmetProvider>
        <SEOHead config={mockConfig}>
          <meta name="custom-meta" content="custom-value" />
          <link rel="custom-link" href="/custom" />
        </SEOHead>
      </HelmetProvider>
    );

    const customMeta = document.querySelector('meta[name="custom-meta"]');
    expect(customMeta?.getAttribute('content')).toBe('custom-value');

    const customLink = document.querySelector('link[rel="custom-link"]');
    expect(customLink?.getAttribute('href')).toBe('/custom');
  });
});

describe('SEOProvider', () => {
  test('should provide HelmetProvider context to children', () => {
    const TestComponent = () => {
      return <div>Test Child Component</div>;
    };

    const { getByText } = render(
      <SEOProvider>
        <TestComponent />
      </SEOProvider>
    );

    expect(getByText('Test Child Component')).toBeInTheDocument();
  });
});