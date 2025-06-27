# 完全無料デプロイメント戦略

**作成日**: 2025年6月27日  
**対象**: nomikai-restaurant-finder アプリケーション  
**制約**: 完全無料でのデプロイメント実現

---

## 🎯 デプロイメント戦略概要

### 採用アーキテクチャ
```
Frontend (Netlify) + Backend (Railway) + Database (PlanetScale/Supabase)
```

### 無料プラットフォーム選定理由
1. **フロントエンド**: Netlify - 静的サイトホスティング（無制限）
2. **バックエンド**: Railway - Node.js アプリケーション（月500時間無料）
3. **データベース**: PlanetScale - MySQL（10GB無料）または Supabase PostgreSQL（500MB無料）
4. **ドメイン**: Netlify提供のサブドメイン（.netlify.app）

---

## 📋 無料リソース制限と対策

### プラットフォーム別制限
| サービス | 無料枠制限 | 対策 |
|---------|-----------|------|
| **Netlify** | 100GB帯域幅/月 | 画像最適化、CDN活用 |
| **Railway** | 500時間/月（約21日） | スリープ機能活用 |
| **PlanetScale** | 10GB ストレージ、1billion row reads | データ最適化 |
| **Vercel** (代替) | 100GB帯域幅、Serverless Functions | エッジ機能活用 |

### リソース効率化戦略
1. **フロントエンド最適化**: 静的ビルド、コード分割
2. **バックエンド最適化**: 自動スリープ、効率的なAPI設計
3. **データベース最適化**: インデックス最適化、不要データ削除

---

## 🚀 デプロイメント手順

### Phase 1: フロントエンド（Netlify）

#### 1.1 Netlify 設定
```bash
# 1. Netlify アカウント作成（無料）
# https://www.netlify.com/

# 2. フロントエンドビルド設定
cd frontend
npm run build

# 3. netlify.toml 設定ファイル作成
```

**netlify.toml**:
```toml
[build]
  publish = "dist"
  command = "npm run build"

[build.environment]
  NODE_VERSION = "18"

[[redirects]]
  from = "/api/*"
  to = "https://nomikai-backend.railway.app/api/:splat"
  status = 200
  force = true

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[headers]
  for = "/static/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

#### 1.2 環境変数設定
```bash
# Netlify環境変数（Web UI で設定）
VITE_API_BASE_URL=https://nomikai-backend.railway.app/api
VITE_USE_MOCK_API=false
VITE_ENABLE_WEBSOCKET=false
VITE_ENABLE_SERVICE_WORKER=true
```

### Phase 2: データベース（PlanetScale）

#### 2.1 PlanetScale セットアップ
```bash
# 1. PlanetScale アカウント作成（無料）
# https://planetscale.com/

# 2. データベース作成
# Web UI: "nomikai-restaurant-db"

# 3. 接続文字列取得
# Database Settings -> Passwords -> Create password
```

#### 2.2 スキーマ作成
```sql
-- レストランテーブル
CREATE TABLE restaurants (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  genre VARCHAR(100),
  address TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  price_range_min INT,
  price_range_max INT,
  rating DECIMAL(3, 2),
  review_count INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_location (latitude, longitude),
  INDEX idx_genre (genre),
  INDEX idx_rating (rating)
);

-- キャッシュテーブル
CREATE TABLE cache_entries (
  cache_key VARCHAR(255) PRIMARY KEY,
  data JSON,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_expires (expires_at)
);

-- 検索履歴テーブル
CREATE TABLE search_history (
  id VARCHAR(255) PRIMARY KEY,
  query_hash VARCHAR(255),
  query_data JSON,
  result_count INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_created (created_at)
);
```

### Phase 3: バックエンド（Railway）

#### 3.1 Railway セットアップ
```bash
# 1. Railway アカウント作成（無料）
# https://railway.app/

# 2. GitHub リポジトリ連携
# New Project -> Deploy from GitHub repo

# 3. 環境変数設定（Railway Dashboard）
```

#### 3.2 Railway 設定ファイル
**railway.json**:
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start",
    "healthcheckPath": "/api/health"
  }
}
```

**package.json** (バックエンド用スクリプト追加):
```json
{
  "scripts": {
    "start": "node dist/server.js",
    "build": "tsc && cp -r src/public dist/",
    "postinstall": "npm run build"
  }
}
```

#### 3.3 環境変数設定（Railway）
```bash
# Railway Web UI で設定
NODE_ENV=production
PORT=3000
HOTPEPPER_API_KEY=your_api_key
DATABASE_URL=mysql://username:password@host:port/database
CORS_ORIGIN=https://nomikai-app.netlify.app
REDIS_URL=  # 無しでも動作（メモリキャッシュにフォールバック）
```

---

## 🔧 コード修正が必要な箇所

### 1. バックエンド：データベース接続修正

**src/database/connection.ts**:
```typescript
import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

// PlanetScale 接続設定
export const pool = mysql.createPool({
  uri: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  connectionLimit: 10,
  queueLimit: 0,
  acquireTimeout: 60000,
  timeout: 60000
});

export default pool;
```

### 2. バックエンド：ヘルスチェックエンドポイント

**src/routes/health.ts**:
```typescript
import { Request, Response } from 'express';
import pool from '../database/connection';

export const healthCheck = async (req: Request, res: Response) => {
  try {
    // データベース接続確認
    await pool.execute('SELECT 1');
    
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      database: 'connected'
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
```

### 3. フロントエンド：環境設定更新

**vite.config.ts**:
```typescript
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@services': path.resolve(__dirname, './src/services'),
      '@store': path.resolve(__dirname, './src/store'),
      '@types': path.resolve(__dirname, './src/types'),
      '@utils': path.resolve(__dirname, './src/utils'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false, // 本番では無効化
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          mui: ['@mui/material', '@mui/icons-material'],
          store: ['@reduxjs/toolkit', 'react-redux']
        }
      }
    }
  },
  server: {
    port: 5175,
    host: 'localhost',
    proxy: {
      '/api': {
        target: process.env.VITE_API_BASE_URL || 'http://localhost:3003',
        changeOrigin: true,
      },
    },
  },
});
```

---

## 📦 デプロイ自動化

### GitHub Actions ワークフロー

**.github/workflows/deploy.yml**:
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: 'frontend/package-lock.json'
      
      - name: Install dependencies
        run: |
          cd frontend
          npm ci
      
      - name: Build
        env:
          VITE_API_BASE_URL: ${{ secrets.VITE_API_BASE_URL }}
        run: |
          cd frontend
          npm run build
      
      - name: Deploy to Netlify
        uses: netlify/actions/cli@master
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
        with:
          args: deploy --dir=frontend/dist --prod

  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to Railway
        uses: railway-cli/action@v0.1.0
        with:
          token: ${{ secrets.RAILWAY_TOKEN }}
          project: ${{ secrets.RAILWAY_PROJECT_ID }}
```

---

## 🔐 環境変数とシークレット管理

### GitHub Secrets設定
```bash
# Netlify関連
NETLIFY_AUTH_TOKEN=your_netlify_token
NETLIFY_SITE_ID=your_site_id

# Railway関連
RAILWAY_TOKEN=your_railway_token
RAILWAY_PROJECT_ID=your_project_id

# API関連
VITE_API_BASE_URL=https://nomikai-backend.railway.app/api
HOTPEPPER_API_KEY=your_hotpepper_api_key
```

### 本番環境での設定管理
1. **Netlify**: Environment variables (Web UI)
2. **Railway**: Environment variables (Web UI)
3. **GitHub**: Repository secrets
4. **PlanetScale**: Connection strings (Web UI)

---

## 💰 コスト分析（すべて無料枠内）

### 月間利用想定
| リソース | 使用量 | 無料枠 | 使用率 |
|---------|--------|-------|--------|
| **Netlify帯域幅** | 20GB | 100GB | 20% |
| **Railway稼働時間** | 400時間 | 500時間 | 80% |
| **PlanetScale読み取り** | 100M rows | 1B rows | 10% |
| **PlanetScale容量** | 2GB | 10GB | 20% |

### スケーリング戦略
1. **トラフィック増加時**: Netlify Pro ($19/月) または Vercel Pro ($20/月)
2. **バックエンド拡張**: Railway Pro ($5/月) または Heroku ($7/月)
3. **データベース拡張**: PlanetScale Scale ($29/月)

---

## 🚀 デプロイメント実行手順

### 事前準備チェックリスト
- [ ] HotPepper APIキー取得済み
- [ ] GitHub リポジトリ作成済み
- [ ] Netlify アカウント作成
- [ ] Railway アカウント作成
- [ ] PlanetScale アカウント作成

### デプロイメント実行
```bash
# 1. 現在の状態確認
npm run build
npm run test

# 2. GitHub にプッシュ
git add .
git commit -m "feat: production deployment setup"
git push origin main

# 3. 各プラットフォームでの設定
# - Netlify: サイト連携 + 環境変数設定
# - Railway: プロジェクト作成 + デプロイ
# - PlanetScale: DB作成 + スキーマ実行

# 4. 動作確認
curl https://nomikai-backend.railway.app/api/health
```

---

## 📊 監視とメンテナンス

### 無料監視ツール
1. **UptimeRobot**: ヘルスチェック監視
2. **Google Analytics**: フロントエンドアクセス解析
3. **Railway Logs**: バックエンドログ監視
4. **Netlify Analytics**: パフォーマンス監視

### 定期メンテナンス
- **週次**: ログ確認、エラー監視
- **月次**: リソース使用量確認
- **四半期**: セキュリティ更新、依存関係更新

---

## ⚠️ 制限事項と対策

### 無料枠制限
1. **Railway スリープ**: 非アクティブ時の自動スリープ
   - 対策: ヘルスチェック ping (UptimeRobot)
2. **データベース容量**: 10GB制限
   - 対策: 定期的なデータクリーンアップ
3. **帯域幅制限**: 100GB/月
   - 対策: 画像最適化、CDN活用

### フォールバック戦略
1. **Railway代替**: Render.com (750時間/月)
2. **PlanetScale代替**: Supabase (500MB, 2コア)
3. **Netlify代替**: Vercel (100GB帯域幅)

---

**デプロイメント準備完了** ✅  
**推定デプロイ時間**: 2-3時間  
**総コスト**: $0/月 (無料枠内)