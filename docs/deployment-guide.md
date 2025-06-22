# HotPepper無料Tier Restaurant Finder - デプロイメントガイド

**作成日**: 2025年6月21日  
**バージョン**: 1.0.0  
**対象**: DevOpsエンジニア・開発者

---

## 📋 目次

1. [前提条件](#前提条件)
2. [環境準備](#環境準備)
3. [ローカル開発環境](#ローカル開発環境)
4. [本番環境デプロイ](#本番環境デプロイ)
5. [CI/CDパイプライン](#cicdパイプライン)
6. [環境別設定](#環境別設定)
7. [デプロイチェックリスト](#デプロイチェックリスト)
8. [ロールバック手順](#ロールバック手順)

---

## ✅ 前提条件

### **必要なツール**
```yaml
必須:
  Node.js: v18.0.0以上
  npm: v9.0.0以上
  Docker: v20.0.0以上
  Docker Compose: v2.0.0以上
  PostgreSQL: v14.0以上
  Redis: v6.0以上

推奨:
  pm2: v5.0.0以上
  nginx: v1.20.0以上
  certbot: v1.0.0以上（SSL証明書用）
```

### **システム要件**
```yaml
最小構成:
  CPU: 2コア
  RAM: 4GB
  Storage: 20GB SSD
  Network: 100Mbps

推奨構成:
  CPU: 4コア
  RAM: 8GB
  Storage: 50GB SSD
  Network: 1Gbps
```

### **APIキー取得**
```bash
# HotPepper API
# https://webservice.recruit.co.jp/register/index.html
# 1. アカウント登録
# 2. 新規アプリケーション作成
# 3. APIキー取得（無料枠）
```

---

## 🔧 環境準備

### **1. リポジトリクローン**
```bash
# SSHの場合
git clone git@github.com:your-org/nomikai-restaurant-finder.git

# HTTPSの場合
git clone https://github.com/your-org/nomikai-restaurant-finder.git

cd nomikai-restaurant-finder
```

### **2. 環境変数設定**

#### **開発環境（.env.development）**
```bash
# コピーして編集
cp .env.development.example .env.development

# 必須項目を設定
HOTPEPPER_API_KEY=your_dev_api_key
DB_HOST=localhost
DB_PORT=5432
DB_NAME=nomikai_dev
DB_USER=dev_user
DB_PASSWORD=dev_password
REDIS_URL=redis://localhost:6379
```

#### **本番環境（.env.production）**
```bash
# コピーして編集
cp .env.production.example .env.production

# 必須項目を設定（環境変数から読み込み推奨）
HOTPEPPER_API_KEY=${HOTPEPPER_API_KEY}
DB_HOST=${DB_HOST}
DB_PORT=${DB_PORT}
DB_NAME=${DB_NAME}
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}
REDIS_URL=${REDIS_URL}
JWT_SECRET=${JWT_SECRET}
SESSION_SECRET=${SESSION_SECRET}
```

### **3. SSL証明書設定**
```bash
# Let's Encrypt使用
sudo certbot certonly --nginx -d your-domain.com

# 証明書パス確認
ls -la /etc/letsencrypt/live/your-domain.com/
```

---

## 💻 ローカル開発環境

### **1. 依存関係インストール**
```bash
# フロントエンド
cd frontend
npm install

# バックエンド
cd ../backend
npm install

# ルートディレクトリ
cd ..
npm install
```

### **2. データベースセットアップ**

#### **PostgreSQL起動**
```bash
# Dockerを使用
docker run -d \
  --name nomikai-postgres \
  -e POSTGRES_USER=dev_user \
  -e POSTGRES_PASSWORD=dev_password \
  -e POSTGRES_DB=nomikai_dev \
  -p 5432:5432 \
  postgres:14-alpine
```

#### **マイグレーション実行**
```bash
cd backend
npm run db:migrate
npm run db:seed # 開発用データ
```

### **3. Redis起動**
```bash
docker run -d \
  --name nomikai-redis \
  -p 6379:6379 \
  redis:6-alpine
```

### **4. 開発サーバー起動**
```bash
# 別々のターミナルで実行

# フロントエンド（ポート3001）
cd frontend
npm run dev

# バックエンド（ポート3000）
cd backend
npm run dev
```

### **5. 動作確認**
```bash
# ヘルスチェック
curl http://localhost:3000/health

# フロントエンドアクセス
open http://localhost:3001
```

---

## 🚀 本番環境デプロイ

### **1. Docker Composeを使用したデプロイ**

#### **docker-compose.yml**
```yaml
version: '3.8'

services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.prod
    ports:
      - "3001:80"
    environment:
      - REACT_APP_API_URL=https://api.your-domain.com
    depends_on:
      - backend

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.prod
    ports:
      - "3000:3000"
    env_file:
      - .env.production
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:14-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    env_file:
      - .env.production
    ports:
      - "5432:5432"

  redis:
    image: redis:6-alpine
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - frontend
      - backend

volumes:
  postgres_data:
  redis_data:
```

#### **デプロイ実行**
```bash
# ビルドと起動
docker-compose -f docker-compose.yml up -d --build

# ログ確認
docker-compose logs -f

# 状態確認
docker-compose ps
```

### **2. PM2を使用したデプロイ**

#### **ecosystem.config.js**
```javascript
module.exports = {
  apps: [
    {
      name: 'nomikai-backend',
      script: './backend/dist/index.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_file: './logs/pm2-combined.log',
      time: true
    },
    {
      name: 'nomikai-frontend',
      script: 'serve',
      args: '-s ./frontend/build -l 3001',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
```

#### **PM2デプロイ**
```bash
# ビルド
npm run build:all

# PM2起動
pm2 start ecosystem.config.js

# 状態確認
pm2 status

# ログ確認
pm2 logs
```

### **3. Nginxリバースプロキシ設定**

#### **nginx.conf**
```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # フロントエンド
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # バックエンドAPI
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Host $host;
    }

    # 静的ファイルキャッシュ
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

---

## 🔄 CI/CDパイプライン

### **GitHub Actions設定**

#### **.github/workflows/deploy.yml**
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: |
          npm ci
          cd frontend && npm ci
          cd ../backend && npm ci
      
      - name: Run tests
        run: |
          npm run test:ci
          npm run test:coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build application
        run: |
          npm run build:all
      
      - name: Build Docker images
        run: |
          docker build -t nomikai-frontend:${{ github.sha }} ./frontend
          docker build -t nomikai-backend:${{ github.sha }} ./backend

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Deploy to production
        env:
          DEPLOY_KEY: ${{ secrets.DEPLOY_KEY }}
          PRODUCTION_HOST: ${{ secrets.PRODUCTION_HOST }}
        run: |
          # SSHデプロイスクリプト
          ./scripts/deploy-production.sh
```

### **デプロイスクリプト**

#### **scripts/deploy-production.sh**
```bash
#!/bin/bash
set -e

echo "🚀 Starting production deployment..."

# 環境変数チェック
required_vars=("HOTPEPPER_API_KEY" "DB_HOST" "DB_PASSWORD" "JWT_SECRET")
for var in "${required_vars[@]}"; do
  if [ -z "${!var}" ]; then
    echo "❌ Error: $var is not set"
    exit 1
  fi
done

# バックアップ作成
echo "📦 Creating backup..."
npm run backup:before-deploy

# ビルド
echo "🔨 Building application..."
npm run build:all

# テスト実行
echo "🧪 Running tests..."
npm run test:production

# デプロイ
echo "📤 Deploying to production..."
if [ "$DEPLOY_METHOD" = "docker" ]; then
  docker-compose -f docker-compose.prod.yml up -d --build
else
  pm2 reload ecosystem.config.js --update-env
fi

# ヘルスチェック
echo "🏥 Running health checks..."
./scripts/health-check-production.sh

echo "✅ Deployment completed successfully!"
```

---

## ⚙️ 環境別設定

### **開発環境**
```yaml
特徴:
  - ホットリロード有効
  - デバッグログ出力
  - モックデータ使用可能
  - CORS制限緩和

設定:
  NODE_ENV: development
  LOG_LEVEL: debug
  ENABLE_MOCK: true
```

### **ステージング環境**
```yaml
特徴:
  - 本番環境相当の構成
  - テストAPIキー使用
  - 詳細ログ出力
  - 基本認証有効

設定:
  NODE_ENV: staging
  LOG_LEVEL: info
  BASIC_AUTH: enabled
```

### **本番環境**
```yaml
特徴:
  - 最適化ビルド
  - エラーログのみ
  - セキュリティ強化
  - CDN統合

設定:
  NODE_ENV: production
  LOG_LEVEL: error
  ENABLE_CACHE: true
  FORCE_HTTPS: true
```

---

## ✅ デプロイチェックリスト

### **デプロイ前**
- [ ] 全テストがパス
- [ ] 環境変数設定確認
- [ ] データベースマイグレーション準備
- [ ] バックアップ作成
- [ ] 依存関係更新確認
- [ ] セキュリティスキャン実行

### **デプロイ中**
- [ ] メンテナンスモード有効化（必要時）
- [ ] 古いコンテナ/プロセス停止
- [ ] 新バージョンデプロイ
- [ ] データベースマイグレーション実行
- [ ] キャッシュクリア

### **デプロイ後**
- [ ] ヘルスチェック成功
- [ ] 主要機能動作確認
- [ ] パフォーマンス確認
- [ ] エラーログ確認
- [ ] メンテナンスモード解除

---

## 🔙 ロールバック手順

### **1. 即時ロールバック**
```bash
# Docker使用時
docker-compose down
docker-compose -f docker-compose.prev.yml up -d

# PM2使用時
pm2 reload ecosystem.config.js --env previous
```

### **2. データベースロールバック**
```bash
# マイグレーション巻き戻し
npm run db:migrate:undo

# 必要に応じてバックアップからリストア
npm run db:restore --file=pre-deploy-backup.sql
```

### **3. ロールバック確認**
```bash
# バージョン確認
curl https://api.your-domain.com/version

# ヘルスチェック
./scripts/health-check-production.sh

# 機能テスト
npm run test:smoke
```

---

## 🆘 トラブルシューティング

### **デプロイ失敗時**
```bash
# ログ確認
docker-compose logs --tail=100
pm2 logs --lines 100

# プロセス確認
docker ps -a
pm2 status

# リソース確認
df -h
free -m
```

### **よくある問題**
1. **ポート競合**: 既存プロセス確認 `lsof -i :3000`
2. **権限エラー**: ファイル権限確認 `ls -la`
3. **環境変数未設定**: 環境変数確認 `env | grep NOMIKAI`

---

**最終更新**: 2025年6月21日  
**次回レビュー**: 2025年7月21日