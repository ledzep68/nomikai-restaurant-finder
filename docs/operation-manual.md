# HotPepper無料Tier Restaurant Finder - 運用マニュアル

**作成日**: 2025年6月21日  
**バージョン**: 1.0.0  
**対象**: システム管理者・運用担当者

---

## 📋 目次

1. [システム概要](#システム概要)
2. [環境構成](#環境構成)
3. [日常運用](#日常運用)
4. [監視とアラート](#監視とアラート)
5. [トラブルシューティング](#トラブルシューティング)
6. [メンテナンス](#メンテナンス)
7. [セキュリティ](#セキュリティ)
8. [バックアップとリカバリ](#バックアップとリカバリ)

---

## 🎯 システム概要

### **サービス概要**
- **名称**: nomikai-restaurant-finder
- **目的**: 個人利用向け飲食店統合評価システム
- **主要機能**: HotPepper中心の複数プラットフォーム評価統合
- **制約**: 無料Tier運用（API使用量制限あり）

### **技術スタック**
```yaml
Frontend:
  - React 18.x
  - TypeScript 5.x
  - Redux Toolkit
  - Tailwind CSS

Backend:
  - Node.js 18.x
  - Express.js
  - PostgreSQL
  - Redis

Infrastructure:
  - Docker
  - Nginx
  - SSL/TLS
```

### **API制限**
```yaml
HotPepper API:
  - 2リクエスト/分
  - 50リクエスト/時
  - 300リクエスト/日

Tabelog (スクレイピング):
  - 50リクエスト/週
  - 30秒間隔制限
```

---

## 🔧 環境構成

### **環境変数設定**

#### **必須環境変数**
```bash
# API Keys
HOTPEPPER_API_KEY=your_api_key_here

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=nomikai_db
DB_USER=nomikai_user
DB_PASSWORD=secure_password

# Redis
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=redis_password

# Security
JWT_SECRET=your_jwt_secret
SESSION_SECRET=your_session_secret
```

#### **環境別設定**
```bash
# Development
cp .env.development .env
npm run dev

# Production
cp .env.production .env
npm run build
npm run start
```

### **ディレクトリ構造**
```
nomikai-restaurant-finder/
├── frontend/          # Reactフロントエンド
├── backend/           # Node.jsバックエンド
├── docs/              # ドキュメント
├── scripts/           # 運用スクリプト
├── docker/            # Docker設定
└── logs/              # ログファイル
```

---

## 📊 日常運用

### **1. システム起動**

#### **開発環境**
```bash
# フロントエンド
cd frontend
npm install
npm run dev

# バックエンド
cd backend
npm install
npm run dev
```

#### **本番環境**
```bash
# Dockerコンテナ起動
docker-compose up -d

# ヘルスチェック
curl http://localhost:3000/health
```

### **2. 日次確認項目**

#### **朝の確認（9:00）**
- [ ] システムヘルスチェック
- [ ] API使用量確認
- [ ] エラーログ確認
- [ ] キャッシュ状態確認

```bash
# ヘルスチェックコマンド
npm run health:check

# API使用量確認
npm run api:usage

# エラーログ確認
tail -n 100 logs/error.log | grep "ERROR"
```

#### **夕方の確認（18:00）**
- [ ] 当日のAPI使用量レビュー
- [ ] パフォーマンスメトリクス確認
- [ ] アラート対応状況確認

### **3. API使用量管理**

#### **使用量モニタリング**
```javascript
// 使用量確認API
GET /api/monitoring/usage

// レスポンス例
{
  "hotpepper": {
    "daily": { "used": 150, "limit": 300, "percentage": 50 },
    "hourly": { "used": 25, "limit": 50, "percentage": 50 },
    "minutely": { "used": 1, "limit": 2, "percentage": 50 }
  },
  "tabelog": {
    "weekly": { "used": 20, "limit": 50, "percentage": 40 }
  }
}
```

#### **使用量警告対応**
```yaml
警告レベル:
  70%: 注意喚起アラート
  80%: 警告アラート + キャッシュ優先モード
  90%: 重大アラート + API呼び出し制限
  100%: API呼び出し停止 + キャッシュのみ
```

---

## 🚨 監視とアラート

### **1. 監視ダッシュボード**

#### **アクセス方法**
```
URL: http://localhost:3000/monitoring
認証: 管理者アカウントでログイン
```

#### **主要メトリクス**
- **システムステータス**: Healthy/Degraded/Unhealthy
- **レスポンスタイム**: 平均/最大/最小
- **キャッシュヒット率**: 目標80%以上
- **エラー率**: 目標5%以下
- **メモリ使用量**: 警告200MB、限界500MB

### **2. アラート設定**

#### **デフォルトアラート**
```yaml
高レスポンスタイム:
  閾値: 3000ms
  重要度: High
  エスカレーション: 10分後

メモリ使用量危険:
  閾値: 500MB
  重要度: Critical
  エスカレーション: 5分後

レート制限超過:
  閾値: 100%
  重要度: Medium
  クールダウン: 10分

高エラー率:
  閾値: 10%
  重要度: Critical
  エスカレーション: 15分後
```

#### **アラート対応手順**
1. **即時対応（Critical）**
   ```bash
   # システム状態確認
   npm run system:status
   
   # 緊急キャッシュクリア
   npm run cache:emergency-clear
   
   # サービス再起動
   npm run service:restart
   ```

2. **通常対応（High/Medium）**
   ```bash
   # ログ調査
   npm run logs:investigate --severity=high
   
   # パフォーマンス分析
   npm run performance:analyze
   ```

### **3. ログ管理**

#### **ログレベル**
```yaml
Production:
  level: info
  format: json
  rotation: daily
  retention: 30days

Development:
  level: debug
  format: dev
  rotation: size (10MB)
```

#### **ログファイル**
```bash
logs/
├── combined.log      # 全ログ
├── error.log         # エラーログ
├── api-calls.log     # API呼び出しログ
├── performance.log   # パフォーマンスログ
└── security.log      # セキュリティログ
```

---

## 🔧 トラブルシューティング

### **1. よくある問題と対処法**

#### **問題: API Rate Limit Exceeded**
```bash
症状: 
- "Rate limit exceeded" エラー
- API呼び出しが失敗

対処法:
1. キャッシュ状態確認
   npm run cache:status

2. キャッシュ事前ロード実行
   npm run cache:preload --popular

3. API使用量リセット待機
   # HotPepper: 毎日0:00リセット
   # Tabelog: 毎週月曜0:00リセット
```

#### **問題: High Memory Usage**
```bash
症状:
- メモリ使用量が500MB超過
- レスポンス遅延

対処法:
1. メモリ使用状況確認
   npm run memory:analyze

2. キャッシュサイズ最適化
   npm run cache:optimize

3. プロセス再起動
   pm2 restart nomikai-api
```

#### **問題: Cache Hit Rate Low**
```bash
症状:
- キャッシュヒット率30%未満
- API呼び出し増加

対処法:
1. 人気店舗事前ロード
   npm run cache:preload-popular

2. キャッシュTTL調整
   # .env.production
   CACHE_TTL_SEARCH=7200  # 2時間に延長
   CACHE_TTL_DETAIL=172800 # 2日間に延長

3. キャッシュ戦略見直し
   npm run cache:analyze-strategy
```

### **2. 緊急時対応**

#### **システム完全停止時**
```bash
# 1. サービス状態確認
docker-compose ps

# 2. ログ確認
docker-compose logs --tail=100

# 3. 強制再起動
docker-compose down
docker-compose up -d

# 4. ヘルスチェック
./scripts/health-check.sh
```

#### **データベース接続エラー**
```bash
# 1. PostgreSQL状態確認
pg_isready -h localhost -p 5432

# 2. 接続テスト
psql -h localhost -U nomikai_user -d nomikai_db -c "SELECT 1"

# 3. 接続プール再起動
npm run db:reconnect
```

---

## 🛠️ メンテナンス

### **1. 定期メンテナンス**

#### **日次タスク**
```bash
# ログローテーション
npm run logs:rotate

# キャッシュ最適化
npm run cache:optimize

# 統計情報更新
npm run stats:update
```

#### **週次タスク**
```bash
# データベース最適化
npm run db:vacuum

# 古いログ削除
npm run logs:cleanup --days=30

# セキュリティアップデート確認
npm audit
```

#### **月次タスク**
```bash
# フルバックアップ
npm run backup:full

# パフォーマンスレポート生成
npm run report:monthly

# 依存関係更新
npm update
```

### **2. アップデート手順**

#### **マイナーアップデート**
```bash
# 1. バックアップ作成
npm run backup:before-update

# 2. テスト環境でテスト
npm run test:all

# 3. 本番環境更新
git pull origin main
npm install
npm run build

# 4. 段階的デプロイ
npm run deploy:canary
```

#### **メジャーアップデート**
```bash
# 1. メンテナンスモード有効化
npm run maintenance:enable

# 2. フルバックアップ
npm run backup:full

# 3. 更新実行
./scripts/major-update.sh

# 4. 動作確認
npm run test:e2e

# 5. メンテナンスモード解除
npm run maintenance:disable
```

---

## 🔒 セキュリティ

### **1. アクセス制御**

#### **認証設定**
```yaml
管理者アクセス:
  - 監視ダッシュボード
  - システム設定
  - ログ閲覧

一般ユーザー:
  - 検索機能
  - 評価閲覧
  - お気に入り管理
```

#### **APIキー管理**
```bash
# APIキーローテーション（3ヶ月ごと）
npm run security:rotate-api-keys

# APIキー暗号化確認
npm run security:check-encryption
```

### **2. セキュリティ監査**

#### **月次セキュリティチェック**
```bash
# 依存関係の脆弱性チェック
npm audit
npm audit fix

# セキュリティヘッダー確認
npm run security:check-headers

# SSL証明書確認
npm run security:check-ssl
```

---

## 💾 バックアップとリカバリ

### **1. バックアップ戦略**

#### **自動バックアップ**
```yaml
データベース:
  頻度: 日次
  保持期間: 30日
  時刻: 2:00 AM

キャッシュ:
  頻度: 週次
  保持期間: 7日
  時刻: 日曜 3:00 AM

設定ファイル:
  頻度: 変更時
  保持期間: 90日
```

#### **バックアップコマンド**
```bash
# 手動バックアップ
npm run backup:manual

# バックアップ確認
npm run backup:verify

# バックアップリスト
npm run backup:list
```

### **2. リストア手順**

#### **データベースリストア**
```bash
# 1. 最新バックアップ確認
ls -la backups/db/

# 2. リストア実行
npm run restore:db --file=backup_20250621.sql

# 3. データ整合性確認
npm run db:verify
```

#### **完全リストア**
```bash
# 1. サービス停止
docker-compose down

# 2. データリストア
./scripts/full-restore.sh --date=20250621

# 3. サービス起動
docker-compose up -d

# 4. 動作確認
npm run test:smoke
```

---

## 📞 サポート情報

### **緊急連絡先**
- **システム管理者**: admin@example.com
- **エスカレーション**: escalation@example.com

### **参考ドキュメント**
- [デプロイガイド](./deployment-guide.md)
- [API仕様書](./api-specification.md)
- [トラブルシューティングガイド](./troubleshooting-guide.md)

---

**最終更新**: 2025年6月21日  
**次回レビュー**: 2025年7月21日