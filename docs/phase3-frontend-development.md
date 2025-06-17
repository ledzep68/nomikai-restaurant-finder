# Phase 3: フロントエンド開発仕様書

## 概要

Phase 3では、nomikai-restaurant-finderアプリケーションのフロントエンドを開発し、Phase 1・2で構築したバックエンドAPIと統合します。ユーザーフレンドリーなインターフェースを通じて、飲み会に最適なレストランを検索・評価できるWebアプリケーションを完成させます。

## 技術スタック

### フロントエンド
- **フレームワーク**: React 18 + TypeScript
- **状態管理**: Redux Toolkit
- **UIライブラリ**: Material-UI (MUI) v5
- **HTTPクライアント**: Axios
- **ルーティング**: React Router v6
- **フォーム管理**: React Hook Form
- **ビルドツール**: Vite

### 開発ツール
- **リンター**: ESLint
- **フォーマッター**: Prettier
- **テスト**: Jest + React Testing Library
- **E2Eテスト**: Cypress

## 機能要件

### 1. 認証機能
- ユーザー登録画面
- ログイン画面
- ログアウト機能
- JWTトークン管理
- 認証状態の永続化

### 2. レストラン検索機能
- 検索フォーム（位置情報、ジャンル、価格帯、人数）
- リアルタイム検索候補表示
- 検索結果一覧表示
- ページネーション
- ソート機能（評価、価格、距離）

### 3. レストラン詳細表示
- 基本情報表示（名前、住所、電話番号、営業時間）
- 統合評価スコア表示
- プラットフォーム別評価の可視化
- 写真ギャラリー
- 地図表示（Google Maps統合）
- レビュー一覧

### 4. レストラン評価機能
- 5段階評価
- コメント投稿
- 評価履歴表示

### 5. お気に入り機能
- お気に入り登録/解除
- お気に入りリスト表示
- お気に入りフィルター

### 6. ユーザープロファイル
- プロファイル表示
- プロファイル編集
- 評価履歴
- 検索履歴

## 画面設計

### 1. ホーム画面
```
┌─────────────────────────────────────┐
│ [Logo] Nomikai Restaurant Finder    │
│ ────────────────────────────────── │
│                                     │
│     🍺 飲み会に最適な               │
│       レストランを見つけよう        │
│                                     │
│  ┌─────────────────────────────┐  │
│  │ 📍 場所を入力...            │  │
│  └─────────────────────────────┘  │
│                                     │
│  ┌─────────┐ ┌─────────┐         │
│  │ ジャンル │ │ 価格帯  │         │
│  └─────────┘ └─────────┘         │
│                                     │
│  ┌─────────┐ ┌─────────┐         │
│  │  人数   │ │ 日時    │         │
│  └─────────┘ └─────────┘         │
│                                     │
│      [ 検索する ]                  │
│                                     │
│ ────────────────────────────────── │
│ 人気のレストラン                    │
│ ┌────┐ ┌────┐ ┌────┐            │
│ │    │ │    │ │    │            │
│ └────┘ └────┘ └────┘            │
└─────────────────────────────────────┘
```

### 2. 検索結果画面
```
┌─────────────────────────────────────┐
│ [戻る] 検索結果 (123件)             │
│ ────────────────────────────────── │
│ フィルター: [▼] ソート: [評価順▼]  │
│                                     │
│ ┌─────────────────────────────────┐│
│ │ 🏪 レストラン名                 ││
│ │ ⭐ 4.5 (統合スコア) 📍 渋谷    ││
│ │ 💰 ¥3,000-4,000 🍽️ 和食       ││
│ │ 🔥 高評価 | 予約可能            ││
│ └─────────────────────────────────┘│
│                                     │
│ ┌─────────────────────────────────┐│
│ │ 🏪 レストラン名2                ││
│ │ ⭐ 4.3 (統合スコア) 📍 新宿    ││
│ │ 💰 ¥2,000-3,000 🍽️ 居酒屋     ││
│ └─────────────────────────────────┘│
│                                     │
│ [もっと見る]                        │
└─────────────────────────────────────┘
```

### 3. レストラン詳細画面
```
┌─────────────────────────────────────┐
│ [戻る] レストラン名                 │
│ ────────────────────────────────── │
│ [画像ギャラリー]                    │
│                                     │
│ ⭐ 総合評価: 4.5 (信頼度: 高)      │
│ ┌─────────────────────────────────┐│
│ │ 📊 プラットフォーム別評価       ││
│ │ Hotpepper: ⭐4.2               ││
│ │ Google: ⭐4.7                  ││
│ │ ぐるなび: ⭐4.4                 ││
│ └─────────────────────────────────┘│
│                                     │
│ 📍 東京都渋谷区...                 │
│ 📞 03-1234-5678                    │
│ 🕐 11:00-23:00 (L.O. 22:30)       │
│ 💰 ¥3,000-4,000                   │
│                                     │
│ [地図表示]                          │
│                                     │
│ [ ♥ お気に入り ] [ 📝 評価する ]  │
│                                     │
│ ────────────────────────────────── │
│ レビュー (42件)                     │
│ ┌─────────────────────────────────┐│
│ │ ⭐5 "素晴らしい雰囲気..."      ││
│ │ - ユーザーA (2024/01/15)       ││
│ └─────────────────────────────────┘│
└─────────────────────────────────────┘
```

## コンポーネント構成

```
frontend/
├── src/
│   ├── components/
│   │   ├── common/
│   │   │   ├── Header.tsx
│   │   │   ├── Footer.tsx
│   │   │   ├── LoadingSpinner.tsx
│   │   │   └── ErrorBoundary.tsx
│   │   ├── auth/
│   │   │   ├── LoginForm.tsx
│   │   │   ├── RegisterForm.tsx
│   │   │   └── ProtectedRoute.tsx
│   │   ├── search/
│   │   │   ├── SearchForm.tsx
│   │   │   ├── SearchFilters.tsx
│   │   │   └── SearchResults.tsx
│   │   ├── restaurant/
│   │   │   ├── RestaurantCard.tsx
│   │   │   ├── RestaurantDetail.tsx
│   │   │   ├── RestaurantGallery.tsx
│   │   │   ├── RestaurantMap.tsx
│   │   │   └── RestaurantReviews.tsx
│   │   └── evaluation/
│   │       ├── EvaluationForm.tsx
│   │       ├── ScoreDisplay.tsx
│   │       └── PlatformScores.tsx
│   ├── pages/
│   │   ├── HomePage.tsx
│   │   ├── SearchPage.tsx
│   │   ├── RestaurantDetailPage.tsx
│   │   ├── LoginPage.tsx
│   │   ├── RegisterPage.tsx
│   │   ├── ProfilePage.tsx
│   │   └── FavoritesPage.tsx
│   ├── store/
│   │   ├── index.ts
│   │   ├── authSlice.ts
│   │   ├── restaurantSlice.ts
│   │   └── searchSlice.ts
│   ├── services/
│   │   ├── api.ts
│   │   ├── authService.ts
│   │   ├── restaurantService.ts
│   │   └── searchService.ts
│   ├── types/
│   │   ├── auth.ts
│   │   ├── restaurant.ts
│   │   └── search.ts
│   ├── utils/
│   │   ├── constants.ts
│   │   ├── helpers.ts
│   │   └── validators.ts
│   ├── App.tsx
│   └── main.tsx
├── public/
├── tests/
├── package.json
├── tsconfig.json
├── vite.config.ts
└── .env.example
```

## API統合仕様

### 認証API
```typescript
// ログイン
POST /api/auth/login
Request: { email: string, password: string }
Response: { token: string, user: User }

// 登録
POST /api/auth/register
Request: { email: string, password: string, name: string }
Response: { token: string, user: User }
```

### レストラン検索API
```typescript
// 統合検索
GET /api/restaurants/search
Query: {
  location: string,
  genre?: string,
  priceRange?: string,
  capacity?: number,
  page?: number,
  limit?: number,
  sort?: 'rating' | 'price' | 'distance'
}
Response: IntegratedSearchResult
```

### 評価API
```typescript
// 評価投稿
POST /api/restaurants/:id/evaluate
Request: { rating: number, comment: string }
Response: { success: boolean, evaluation: Evaluation }
```

## 状態管理設計

### Redux Store構造
```typescript
interface RootState {
  auth: {
    isAuthenticated: boolean;
    user: User | null;
    token: string | null;
    loading: boolean;
    error: string | null;
  };
  search: {
    query: SearchQuery;
    results: IntegratedSearchResult | null;
    loading: boolean;
    error: string | null;
  };
  restaurant: {
    current: Restaurant | null;
    evaluations: Evaluation[];
    loading: boolean;
    error: string | null;
  };
  favorites: {
    items: Restaurant[];
    loading: boolean;
    error: string | null;
  };
}
```

## セキュリティ要件

1. **認証・認可**
   - JWTトークンの安全な保存（httpOnly Cookie推奨）
   - トークンの自動更新
   - 認証失敗時の適切なリダイレクト

2. **入力検証**
   - クライアントサイドでの入力値検証
   - XSS対策（React標準のエスケープ機能使用）
   - APIリクエストのサニタイゼーション

3. **通信セキュリティ**
   - HTTPS通信の強制
   - CORS設定の適切な管理

## パフォーマンス要件

1. **初期読み込み時間**: 3秒以内
2. **検索レスポンス**: 2秒以内
3. **画像最適化**: 遅延読み込み実装
4. **バンドルサイズ**: 500KB以下（gzip圧縮後）

## テスト計画

### 単体テスト
- コンポーネントテスト（React Testing Library）
- Redux Store テスト
- ユーティリティ関数テスト
- カバレッジ目標: 80%以上

### 統合テスト
- API統合テスト
- ルーティングテスト
- 認証フローテスト

### E2Eテスト
- 主要ユーザーフロー（検索→詳細→評価）
- クロスブラウザテスト

## デプロイメント戦略

1. **ビルド設定**
   - 本番用最適化ビルド
   - 環境変数管理
   - ソースマップ生成

2. **ホスティング**
   - 静的ファイルホスティング（Vercel/Netlify推奨）
   - CDN配信
   - キャッシュ戦略

## 実装スケジュール

### Week 1: 基盤構築
- [ ] プロジェクトセットアップ
- [ ] 認証機能実装
- [ ] 基本UIコンポーネント作成

### Week 2: 検索機能
- [ ] 検索フォーム実装
- [ ] 検索結果表示
- [ ] フィルター・ソート機能

### Week 3: 詳細・評価機能
- [ ] レストラン詳細画面
- [ ] 評価投稿機能
- [ ] お気に入り機能

### Week 4: 仕上げ・テスト
- [ ] E2Eテスト実装
- [ ] パフォーマンス最適化
- [ ] デプロイメント準備

## 成功基準

1. **機能要件**: 全機能が正常動作
2. **パフォーマンス**: 全指標が目標値以内
3. **テスト**: カバレッジ80%以上、E2Eテスト合格
4. **ユーザビリティ**: 直感的で使いやすいUI
5. **レスポンシブ**: モバイル・タブレット対応