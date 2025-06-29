import React from 'react';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import type { SEOConfig } from '@utils/seo';

interface SEOHeadProps {
  config: SEOConfig;
  children?: React.ReactNode;
}

export const SEOHead: React.FC<SEOHeadProps> = ({ config, children }) => {
  const {
    title,
    description,
    keywords,
    canonical,
    openGraph,
    twitter,
    jsonLd
  } = config;

  return (
    <Helmet>
      {/* 基本メタタグ */}
      <title>{title}</title>
      <meta name="description" content={description} />
      {keywords && keywords.length > 0 && (
        <meta name="keywords" content={keywords.join(', ')} />
      )}
      
      {/* Canonical URL */}
      {canonical && <link rel="canonical" href={canonical} />}
      
      {/* Open Graph */}
      {openGraph && (
        <>
          <meta property="og:title" content={openGraph.title} />
          <meta property="og:description" content={openGraph.description} />
          <meta property="og:type" content={openGraph.type || 'website'} />
          {openGraph.url && <meta property="og:url" content={openGraph.url} />}
          {openGraph.image && <meta property="og:image" content={openGraph.image} />}
          <meta property="og:site_name" content="呑み会レストラン検索" />
          <meta property="og:locale" content="ja_JP" />
        </>
      )}
      
      {/* Twitter Card */}
      {twitter && (
        <>
          <meta name="twitter:card" content={twitter.card} />
          <meta name="twitter:title" content={twitter.title} />
          <meta name="twitter:description" content={twitter.description} />
          {twitter.image && <meta name="twitter:image" content={twitter.image} />}
        </>
      )}
      
      {/* その他のメタタグ */}
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta name="robots" content="index, follow" />
      <meta name="author" content="呑み会レストラン検索" />
      <meta name="language" content="ja" />
      <meta httpEquiv="Content-Language" content="ja" />
      
      {/* PWA関連 */}
      <meta name="theme-color" content="#1976d2" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      <meta name="apple-mobile-web-app-title" content="呑み会レストラン検索" />
      
      {/* JSON-LD構造化データ */}
      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      )}
      
      {children}
    </Helmet>
  );
};

export const SEOProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <HelmetProvider>
      {children}
    </HelmetProvider>
  );
};