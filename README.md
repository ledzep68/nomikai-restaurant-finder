# Nomikai Restaurant Finder API

飲み会に最適な店舗を推薦するWebアプリケーションのバックエンドAPI

## 🚀 機能概要

- JWT認証システム
- レストラン検索・評価機能
- セキュリティ対策（レート制限、CORS、入力サニタイゼーション）
- 包括的なテストスイート（80%以上カバレッジ）
- OpenAPI仕様準拠のAPI設計

## 📋 Phase 1 実装済み機能

### 認証機能
- ユーザー登録・ログイン
- JWT トークンベース認証
- bcrypt パスワードハッシュ化

### レストラン機能
- レストラン検索（ジャンル、場所、価格帯フィルター）
- レストラン詳細取得
- レストラン評価機能
- 検索ログ記録

### セキュリティ機能
- レート制限（1分間100リクエスト）
- CORS設定
- 入力値サニタイゼーション
- Helmet セキュリティヘッダー

### 運用機能
- ヘルスチェックエンドポイント
- データベースマイグレーション
- 包括的なエラーハンドリング

## 🛠️ 技術スタック

- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL
- **Cache**: Redis (将来の拡張用)
- **Authentication**: JWT + bcrypt
- **Testing**: Jest + Supertest
- **Documentation**: OpenAPI 3.0

## 📦 インストール手順

### 前提条件
- Node.js 18.0.0以上
- PostgreSQL 12以上
- Redis (オプション)

### セットアップ

1. **依存関係のインストール**
   ```bash
   cd nomikai-restaurant-finder
   npm install
   ```

2. **環境変数の設定**
   ```bash
   cp .env.template .env
   # .env ファイルを編集してデータベース接続情報を設定
   ```

3. **データベース作成**
   ```sql
   CREATE DATABASE nomikai_restaurant_finder;
   CREATE DATABASE nomikai_test; -- テスト用
   ```

4. **データベースマイグレーション**
   ```bash
   npm run db:migrate
   ```

5. **開発サーバー起動**
   ```bash
   npm run dev
   ```

## 🧪 テスト実行

```bash
# 全テスト実行
npm test

# カバレッジレポート生成
npm run test:coverage

# ウォッチモード
npm run test:watch
```

## 📚 API仕様

### 認証エンドポイント
- `POST /api/auth/register` - ユーザー登録
- `POST /api/auth/login` - ユーザーログイン

### レストランエンドポイント
- `GET /api/restaurants/search` - レストラン検索
- `GET /api/restaurants/:id` - レストラン詳細取得
- `POST /api/restaurants/:id/evaluate` - レストラン評価

### ヘルスチェック
- `GET /api/health` - サービス状態確認
- `GET /api/health/readiness` - サービス準備状態
- `GET /api/health/liveness` - サービス生存確認

詳細なAPI仕様は `docs/api-specification.yaml` を参照してください。

## 🗄️ データベース設計

- **users**: ユーザー情報
- **restaurants**: レストラン基本情報
- **reviews**: レストランレビュー情報
- **search_logs**: 検索履歴

詳細なスキーマは `docs/database-schema.md` を参照してください。

## 🔒 セキュリティ対策

- OWASP Top 10 対策実装済み
- JWT認証・認可
- レート制限・CORS設定
- 入力値検証・サニタイゼーション
- セキュリティヘッダー設定

詳細は `docs/security-measures.md` を参照してください。

## 📊 Phase 1 完了状況

### ✅ 完了項目
- [x] 全APIが正常にレスポンスを返す
- [x] データベース接続とCRUD操作が動作
- [x] JWT認証が機能している
- [x] 全テストがパスしている（80%以上カバレッジ）
- [x] セキュリティ対策実装済み

### 📋 提出物
1. **動作確認用API** ✅
   - 健全性チェック用エンドポイント実装済み
   
2. **技術文書** ✅
   - データベースER図（mermaid形式）
   - API仕様書（OpenAPI 3.0準拠）
   - セキュリティ対策一覧
   
3. **テスト証跡** ✅
   - Jest実行結果レポート
   - カバレッジレポート（80%以上）
   
4. **次フェーズ計画書** 📝
   - Phase 2: 外部API統合準備完了

## 🚦 次のステップ

Phase 1が完了しました。承認をお待ちしています。

承認後、Phase 2では以下を実装予定：
- 外部API統合（食べログ、ホットペッパー、Google Places、Retty）
- 評価統合アルゴリズム
- エラーハンドリング強化
- パフォーマンス最適化

## 📞 サポート

開発に関するお問い合わせは、プロジェクトのIssueまでお願いします。