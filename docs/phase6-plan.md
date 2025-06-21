# Phase 6: 実API統合とUX向上計画

**開始日**: 2025年6月21日  
**目標**: 本格的なレストラン検索サービスの完成

## 🎯 Phase 6の主要目標

### 1. 実API統合
- HotPepper API実装（実際のレストランデータ）
- Google Places API実装（グローバル対応）
- リアルタイムデータ取得

### 2. UX/UI向上
- レストラン画像表示
- 詳細ページ実装
- ローディング状態改善
- エラーハンドリング強化

### 3. 機能拡張
- お気に入り機能
- 検索履歴・提案
- キャッシュ機能
- パフォーマンス最適化

## 📋 実装タスク詳細

### Week 1: 実API統合
#### 1.1 HotPepper API実装
- [ ] API登録・キー取得
- [ ] 実際のエンドポイント接続
- [ ] データマッピング実装
- [ ] エラーハンドリング

#### 1.2 レスポンス改善
- [ ] ローディングスピナー
- [ ] プログレスバー
- [ ] エラーメッセージ
- [ ] 再試行機能

### Week 2: 画像・詳細機能
#### 2.1 レストラン画像
- [ ] 画像URL取得
- [ ] 遅延読み込み
- [ ] プレースホルダー
- [ ] 画像最適化

#### 2.2 詳細ページ
- [ ] 詳細情報表示
- [ ] 営業時間
- [ ] アクセス情報
- [ ] レビュー表示

### Week 3: ユーザー機能
#### 3.1 お気に入り機能
- [ ] お気に入り追加/削除
- [ ] お気に入り一覧
- [ ] ローカルストレージ
- [ ] 同期機能

#### 3.2 検索体験向上
- [ ] 検索履歴保存
- [ ] 検索提案
- [ ] 最近の検索
- [ ] 人気の検索

### Week 4: パフォーマンス・運用
#### 4.1 キャッシュ実装
- [ ] メモリキャッシュ
- [ ] ブラウザキャッシュ
- [ ] API結果キャッシュ
- [ ] 画像キャッシュ

#### 4.2 監視・分析
- [ ] アクセス解析
- [ ] エラー監視
- [ ] パフォーマンス計測
- [ ] ユーザー行動分析

## 🏗️ 新アーキテクチャ

### データフロー
```
User Action
    ↓
Frontend (React + Enhanced UX)
    ├─→ Loading States
    ├─→ Error Handling  
    ├─→ Image Loading
    └─→ Cache Check
         ↓
Integrated API (Port 3003)
    ├─→ Cache Layer (Redis/Memory)
    │     ├─ Hit: Return Cached Data
    │     └─ Miss: Fetch from APIs
    │
    └─→ External APIs (Parallel)
          ├─→ HotPepper API (Real Data)
          ├─→ Google Places API (Real Data)
          └─→ Image Processing Service
               ↓
         Data Normalization
               ↓
         Response Caching
               ↓
         Frontend Update
```

## 🎨 UX改善計画

### 1. 検索フロー改善
```
検索入力
    ↓ (リアルタイム検証)
検索提案表示
    ↓ (検索実行)
ローディング表示 (スピナー + プログレス)
    ↓ (結果取得)
結果表示 (画像付き)
    ↓ (詳細クリック)
詳細ページ (フルデータ)
```

### 2. エラー体験
```
API呼び出し失敗
    ↓
エラー検出
    ├─→ 自動リトライ (3回まで)
    ├─→ フォールバックAPI
    └─→ ユーザー通知
         ├─ 「再試行」ボタン
         ├─ 「別の条件で検索」提案
         └─ サポート情報
```

## 📊 パフォーマンス目標

### レスポンス時間
- **初回検索**: < 3秒
- **キャッシュ検索**: < 500ms  
- **画像ロード**: < 2秒
- **詳細ページ**: < 1秒

### ユーザー体験
- **検索成功率**: > 95%
- **画像表示率**: > 90%
- **エラー率**: < 2%
- **離脱率**: < 30%

## 🔐 実装する機能

### 1. レストラン画像表示
```jsx
<RestaurantCard>
  <LazyImage 
    src={restaurant.images[0]}
    fallback="/placeholder-restaurant.jpg"
    alt={restaurant.name}
  />
  <RestaurantInfo>
    <Title>{restaurant.name}</Title>
    <Rating value={restaurant.rating} />
    <PriceRange>{restaurant.priceRange}</PriceRange>
  </RestaurantInfo>
</RestaurantCard>
```

### 2. お気に入り機能
```jsx
<FavoriteButton 
  restaurantId={restaurant.id}
  onToggle={handleFavoriteToggle}
  isFavorited={favorites.includes(restaurant.id)}
/>
```

### 3. 検索履歴
```jsx
<SearchHistory>
  {recentSearches.map(search => (
    <SearchSuggestion 
      key={search.id}
      query={search.query}
      onClick={() => executeSearch(search.query)}
    />
  ))}
</SearchHistory>
```

## 🧪 テスト戦略

### 1. API統合テスト
- HotPepper API実データテスト
- エラーケーステスト
- レート制限テスト
- フォールバックテスト

### 2. UXテスト
- ローディング状態テスト
- 画像表示テスト
- レスポンシブテスト
- アクセシビリティテスト

### 3. パフォーマンステスト
- ページロード速度
- 画像最適化効果
- キャッシュ効果測定
- メモリ使用量監視

## ⚠️ 注意事項

### API利用規約
- HotPepper: 帰属表示必須
- Google Places: 使用制限遵守
- 画像: 著作権・利用許諾確認

### プライバシー
- 検索履歴の適切な管理
- ユーザーデータの暗号化
- GDPR準拠（将来の国際展開に備え）

## 📅 マイルストーン

### Week 1 (実API統合)
- HotPepper API実装完了
- 実データでの検索成功

### Week 2 (画像・詳細)
- 画像表示機能完了
- レストラン詳細ページ完成

### Week 3 (ユーザー機能)
- お気に入り機能完了
- 検索履歴実装完了

### Week 4 (最適化)
- キャッシュ機能完了
- パフォーマンス目標達成
- Phase 6完了

---
**次のアクション**: HotPepper API登録とレストラン画像表示機能の実装