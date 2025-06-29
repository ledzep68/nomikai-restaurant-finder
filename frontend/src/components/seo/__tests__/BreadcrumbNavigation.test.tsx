import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { BreadcrumbNavigation } from '../BreadcrumbNavigation';

// Mock react-helmet-async
jest.mock('react-helmet-async', () => ({
  Helmet: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  HelmetProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock SEOHead component
jest.mock('../SEOHead', () => ({
  SEOHead: ({ config }: any) => (
    <script type="application/ld+json">
      {JSON.stringify(config.jsonLd)}
    </script>
  ),
}));

describe('BreadcrumbNavigation', () => {
  const renderWithRouter = (component: React.ReactElement, initialRoute = '/') => {
    return render(
      <HelmetProvider>
        <MemoryRouter initialEntries={[initialRoute]}>
          <Routes>
            <Route path="*" element={component} />
          </Routes>
        </MemoryRouter>
      </HelmetProvider>
    );
  };

  test('should render breadcrumb items with home', () => {
    const items = [
      { label: '検索', href: '/search' },
      { label: '渋谷の居酒屋' },
    ];

    const { getByText, container } = renderWithRouter(
      <BreadcrumbNavigation items={items} />,
      '/search/shibuya'
    );

    // Check that all items are rendered
    expect(getByText('ホーム')).toBeInTheDocument();
    expect(getByText('検索')).toBeInTheDocument();
    expect(getByText('渋谷の居酒屋')).toBeInTheDocument();

    // Check that home icon is rendered
    const homeIcon = container.querySelector('svg[data-testid="HomeIcon"]');
    expect(homeIcon).toBeInTheDocument();
  });

  test('should render links for non-last items', () => {
    const items = [
      { label: '検索', href: '/search' },
      { label: '渋谷の居酒屋' },
    ];

    const { container } = renderWithRouter(
      <BreadcrumbNavigation items={items} />
    );

    const links = container.querySelectorAll('a');
    expect(links).toHaveLength(2); // Home and 検索
    expect(links[0]).toHaveAttribute('href', '/');
    expect(links[1]).toHaveAttribute('href', '/search');
  });

  test('should render last item as text without link', () => {
    const items = [
      { label: '検索', href: '/search' },
      { label: '渋谷の居酒屋' },
    ];

    const { getByText, container } = renderWithRouter(
      <BreadcrumbNavigation items={items} />
    );

    const lastItem = getByText('渋谷の居酒屋');
    expect(lastItem.tagName).toBe('P'); // Typography renders as p
    expect(lastItem.closest('a')).toBeNull();
  });

  test('should render JSON-LD structured data', () => {
    const items = [
      { label: '検索', href: '/search' },
      { label: '渋谷の居酒屋' },
    ];

    const { container } = renderWithRouter(
      <BreadcrumbNavigation items={items} />,
      '/search/shibuya'
    );

    const jsonLd = container.querySelector('script[type="application/ld+json"]');
    expect(jsonLd).toBeInTheDocument();

    const data = JSON.parse(jsonLd?.textContent || '{}');
    expect(data['@context']).toBe('https://schema.org');
    expect(data['@type']).toBe('BreadcrumbList');
    expect(data.itemListElement).toHaveLength(3);
    expect(data.itemListElement[0]).toEqual({
      '@type': 'ListItem',
      position: 1,
      name: 'ホーム',
      item: '/',
    });
    expect(data.itemListElement[2]).toEqual({
      '@type': 'ListItem',
      position: 3,
      name: '渋谷の居酒屋',
      item: '/search/shibuya',
    });
  });

  test('should use current pathname for items without href', () => {
    const items = [
      { label: '検索', href: '/search' },
      { label: '現在のページ' }, // No href
    ];

    const { container } = renderWithRouter(
      <BreadcrumbNavigation items={items} />,
      '/current/path'
    );

    const jsonLd = container.querySelector('script[type="application/ld+json"]');
    const data = JSON.parse(jsonLd?.textContent || '{}');
    
    expect(data.itemListElement[2].item).toBe('/current/path');
  });

  test('should render NavigateNext separators', () => {
    const items = [
      { label: '検索', href: '/search' },
      { label: '渋谷の居酒屋' },
    ];

    const { container } = renderWithRouter(
      <BreadcrumbNavigation items={items} />
    );

    const separators = container.querySelectorAll('svg[data-testid="NavigateNextIcon"]');
    expect(separators.length).toBeGreaterThan(0);
  });

  test('should apply correct styles', () => {
    const items = [{ label: 'テスト' }];

    const { container } = renderWithRouter(
      <BreadcrumbNavigation items={items} />
    );

    const breadcrumbs = container.querySelector('nav[aria-label="breadcrumb"]');
    expect(breadcrumbs).toBeInTheDocument();

    const links = container.querySelectorAll('a');
    links.forEach(link => {
      expect(link).toHaveStyle({ fontSize: '0.875rem' });
    });
  });

  test('should handle empty items', () => {
    const { getByText, container } = renderWithRouter(
      <BreadcrumbNavigation items={[]} />
    );

    // Should still show home
    expect(getByText('ホーム')).toBeInTheDocument();

    const jsonLd = container.querySelector('script[type="application/ld+json"]');
    const data = JSON.parse(jsonLd?.textContent || '{}');
    expect(data.itemListElement).toHaveLength(1);
  });
});