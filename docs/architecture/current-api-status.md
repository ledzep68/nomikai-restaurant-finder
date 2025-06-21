# 現在のAPI構成状況 - 2025年6月21日

## 📋 現状サマリー

### ✅ 実装済み
1. **モックAPIサーバー** (`quick-server.js`)
   - ポート: 3002
   - エンドポイント: `/api/restaurants/search`, `/api/health`, `/api/auth/*`
   - データ: ハードコードされた20件のレストラン

2. **外部API統合インフラ** 
   - `ApiIntegrationService`: 統合サービスクラス
   - `HotpepperApiClient`: HotPepper API用クライアント
   - `GooglePlacesApiClient`: Google Places API用クライアント
   - `BaseApiClient`: 共通基底クラス（レート制限、エラー処理）

3. **設定管理**
   - `.env.template`: APIキー設定テンプレート
   - `config.ts`: 環境変数読み込み

### ❌ 未実装・未接続
1. **外部APIキー**
   - HotPepper APIキー: 未取得
   - Google Places APIキー: 未取得
   - ~~Tabelog APIキー~~: 法的理由により削除
   - ~~Retty APIキー~~: 法的理由により削除

2. **実際のAPI接続**
   - 現在はすべて`quick-server.js`のモックデータを返却
   - 外部APIへの実際のリクエストは発生していない

## 🏗️ アーキテクチャ

### 現在の通信フロー
```
Frontend (React)
    ↓
API Service (restaurantService.ts)
    ↓
Backend API (http://localhost:3002)
    ↓
Mock Data (quick-server.js内のハードコードデータ)
```

### 本来の設計（未実装）
```
Frontend (React)
    ↓
API Service (restaurantService.ts)
    ↓
Backend API (Express)
    ↓
ApiIntegrationService
    ↓
┌─────────────┬─────────────────┐
│ HotPepper   │ Google Places   │
│ API Client  │ API Client      │
└─────────────┴─────────────────┘
    ↓              ↓
外部API        外部API
```

## 📊 機能比較

| 機能 | モックAPI（現在） | 外部API（未実装） |
|------|------------------|------------------|
| レストラン検索 | ✅ 20件の固定データ | ❌ リアルタイムデータ |
| 地域フィルタ | ✅ 文字列マッチング | ❌ 地理的検索 |
| ジャンル検索 | ✅ 20ジャンル対応 | ❌ 全ジャンル対応 |
| 価格フィルタ | ✅ 範囲フィルタリング | ❌ 実際の価格データ |
| 評価データ | ✅ 固定評価値 | ❌ リアルタイム評価 |
| 営業時間 | ❌ 空オブジェクト | ❌ 実際の営業時間 |
| 画像 | ❌ 空配列 | ❌ レストラン画像 |
| 予約機能 | ❌ 未実装 | ❌ API経由予約 |

## 🔧 外部API接続に必要な作業

### 1. APIキー取得
```bash
# HotPepper API
https://webservice.recruit.co.jp/register/

# Google Places API  
https://console.cloud.google.com/
```

### 2. 環境変数設定
```bash
# .env ファイルに追加
HOTPEPPER_API_KEY=your_actual_api_key
GOOGLE_PLACES_API_KEY=your_actual_api_key
```

### 3. バックエンド接続切り替え
```javascript
// src/services/restaurantService.ts を本番APIに切り替え
// または ApiIntegrationService を使用するように変更
```

### 4. CORS設定
```javascript
// 外部APIへの直接アクセスは不可
// バックエンド経由でのアクセスが必要
```

## ⚠️ 注意事項

### 法的制約
1. **Tabelog API**: 削除済み（利用規約により）
2. **Retty API**: 削除済み（利用規約により）
3. **データ表示**: 必須の帰属表示（Attribution）が必要

### 技術的制約
1. **レート制限**: 各APIには呼び出し制限あり
2. **キャッシュ**: APIポリシーに従った実装が必要
3. **料金**: Google Places APIは従量課金

## 🎯 推奨される次のステップ

### Phase 5: 外部API統合
1. **HotPepper API統合**
   - 無料枠あり
   - 日本のレストラン情報豊富
   - 予約機能連携可能

2. **Google Places API統合**
   - グローバル対応
   - 詳細な評価データ
   - 写真データ利用可能

3. **ハイブリッドアプローチ**
   - 開発環境: モックAPI
   - 本番環境: 外部API
   - フォールバック: モックデータ

---
**作成日**: 2025年6月21日  
**現状**: モックAPIのみ稼働中  
**推奨**: Phase 5で外部API統合を実装