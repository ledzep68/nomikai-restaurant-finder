# Phase 5: 外部API統合計画

**開始日**: 2025年6月21日  
**目標**: モックAPIから実際の外部API（HotPepper、Google Places）への移行

## 🎯 Phase 5の目標

### 主要目標
1. **HotPepper API統合**: 日本のレストラン情報取得
2. **Google Places API統合**: グローバル対応・詳細評価
3. **ハイブリッドシステム**: 複数APIからの情報統合
4. **キャッシュ実装**: APIコスト削減とパフォーマンス向上
5. **フォールバック機能**: API障害時の継続性確保

## 📋 実装タスク

### 1. API準備（Week 1）
- [ ] HotPepper API登録・キー取得
- [ ] Google Cloud Console設定
- [ ] 環境変数設定（.env）
- [ ] APIドキュメント調査

### 2. バックエンド実装（Week 2）
- [ ] ApiIntegrationServiceの完成
- [ ] 実APIエンドポイント接続
- [ ] データ正規化処理
- [ ] エラーハンドリング強化

### 3. キャッシュ・最適化（Week 3）
- [ ] Redis/メモリキャッシュ実装
- [ ] レート制限管理
- [ ] バッチ処理最適化
- [ ] 監視・ログ機能

### 4. フロントエンド統合（Week 4）
- [ ] API切り替え機能
- [ ] リアルタイムデータ表示
- [ ] 画像表示対応
- [ ] エラー時のUX改善

## 🏗️ アーキテクチャ

### データフロー
```
User Request
    ↓
Frontend (React)
    ↓
Backend API (/api/restaurants/integrated-search)
    ↓
ApiIntegrationService
    ├─→ Cache Check (Redis/Memory)
    │     ↓ (Cache Hit)
    │     └─→ Return Cached Data
    │
    └─→ (Cache Miss) → Parallel API Calls
          ├─→ HotPepper API
          │     ↓
          │   Normalize Data
          │
          └─→ Google Places API
                ↓
              Normalize Data
                ↓
          Merge & Evaluate Results
                ↓
            Cache Results
                ↓
            Return to Frontend
```

## 🔐 セキュリティ考慮事項

### APIキー管理
```javascript
// 環境変数での管理
HOTPEPPER_API_KEY=xxx
GOOGLE_PLACES_API_KEY=xxx

// キーローテーション対応
API_KEY_VERSION=1
```

### アクセス制御
- APIキーはバックエンドのみ保持
- フロントエンドには露出させない
- CORS設定で不正アクセス防止

## 📊 パフォーマンス目標

### レスポンス時間
- キャッシュヒット: < 100ms
- 新規検索: < 2000ms
- 画像ロード: 遅延読み込み

### 可用性
- API障害時: モックデータフォールバック
- 部分的障害: 利用可能なAPIのみで継続
- エラー率: < 1%

## 🧪 テスト戦略

### 単体テスト
- 各APIクライアントのモック
- データ正規化ロジック
- キャッシュ動作

### 統合テスト
- 実APIとの接続（開発環境）
- レート制限動作確認
- フォールバックシナリオ

### E2Eテスト
- 検索フロー全体
- エラー時の動作
- パフォーマンス測定

## 📅 マイルストーン

### Week 1-2: 基本実装
- APIキー取得完了
- 基本的な検索機能動作

### Week 3-4: 最適化
- キャッシュ実装完了
- パフォーマンス目標達成

### Week 5: 本番準備
- 全機能テスト完了
- ドキュメント整備
- デプロイ準備

## ⚠️ リスクと対策

### 技術的リスク
1. **API制限**: レート制限管理とキャッシュで対応
2. **コスト**: 従量課金の監視とアラート設定
3. **データ不整合**: 正規化処理の徹底

### ビジネスリスク
1. **利用規約**: 各APIの規約遵守
2. **データ表示**: 必須の帰属表示実装
3. **個人情報**: 適切なデータ処理

---
**次のアクション**: HotPepper API登録とGoogle Cloud Console設定