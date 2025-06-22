# 外部API契約・設定ガイド - HotPepper無料Tier Restaurant Finder

**作成日**: 2025年6月21日  
**対象**: システム運用者・APIキー取得担当者  
**目的**: 実際のレストランデータ取得のためのAPI契約手順

---

## 📋 目次

1. [契約推奨度・費用概要](#契約推奨度費用概要)
2. [HotPepper API設定手順（無料・必須）](#hotpepper-api設定手順無料必須)
3. [Google Places API設定手順（有料・オプション）](#google-places-api設定手順有料オプション)
4. [APIキー設定・動作確認](#apiキー設定動作確認)
5. [運用パターン別推奨設定](#運用パターン別推奨設定)
6. [トラブルシューティング](#トラブルシューティング)

---

## 🎯 契約推奨度・費用概要

### **必須API（無料運用）**
| API | 費用 | 推奨度 | 取得難易度 | 1日の制限 |
|-----|------|--------|------------|-----------|
| **HotPepper API** | **無料** | **★★★★★** | **簡単** | **300リクエスト** |

### **オプションAPI（有料運用）**
| API | 費用 | 推奨度 | 取得難易度 | 月間費用目安 |
|-----|------|--------|------------|------------|
| **Google Places API** | **従量課金** | **★★★☆☆** | **中程度** | **$50-200** |

### **無料データソース（補助）**
| データソース | 費用 | 推奨度 | 制限 |
|-------------|------|--------|------|
| **Tabelog スクレイピング** | **無料** | **★★★☆☆** | **個人利用のみ・50件/週** |

---

## 🍽️ HotPepper API設定手順（無料・必須）

### **📝 事前準備**
- 日本国内の住所
- メールアドレス
- 利用目的の明確化（個人利用・非営利）

### **🔗 Step 1: アカウント登録**

#### **1.1 リクルートWebサービスにアクセス**
```
URL: https://webservice.recruit.co.jp/
```

#### **1.2 新規登録**
```yaml
必要情報:
  氏名: 本名（カタカナも）
  メールアドレス: 受信可能なアドレス
  住所: 日本国内の住所
  電話番号: 本人確認用
  利用目的: 個人利用・レストラン検索システム開発
```

#### **1.3 メール認証**
- 登録メールアドレスに確認メールが送信
- メール内のリンクをクリックして認証完了

### **🔑 Step 2: APIキー取得**

#### **2.1 サービス選択**
```
1. ログイン後、「Webサービス一覧」を選択
2. 「ホットペッパーグルメAPI」を選択
3. 「利用登録」ボタンをクリック
```

#### **2.2 利用申請**
```yaml
申請内容:
  サービス名: HotPepper Gourmet API
  利用目的: 個人利用・レストラン情報検索
  想定リクエスト数: 1日50-200リクエスト程度
  アプリケーション名: nomikai-restaurant-finder
  アプリケーション概要: 個人向け飲み会店舗検索システム
```

#### **2.3 APIキー発行**
- 申請承認後（通常24時間以内）
- 管理画面からAPIキーを確認・コピー

### **📊 Step 3: 利用制限確認**

```yaml
HotPepper API制限:
  無料プラン制限:
    - リクエスト数: 300回/日
    - レスポンス形式: JSON/XML
    - HTTPS通信: 必須
    
  利用条件:
    - 個人利用: 可能
    - 商用利用: 要相談
    - データ再配布: 禁止
    - 帰属表示: 必須（「Powered by HotPepper」）
```

---

## 🗺️ Google Places API設定手順（有料・オプション）

### **⚠️ 重要な注意事項**
```yaml
費用について:
  基本料金: 月額$200の無料クレジットあり
  超過料金: Text Search $32/1,000リクエスト
  推定月額: $50-200（使用量により変動）
  課金設定: クレジットカード登録必須
```

### **🔗 Step 1: Google Cloud Console設定**

#### **1.1 Google Cloud Consoleにアクセス**
```
URL: https://console.cloud.google.com/
要件: Googleアカウント（Gmailアカウント等）
```

#### **1.2 新しいプロジェクト作成**
```yaml
手順:
  1. 左上の「プロジェクトを選択」をクリック
  2. 「新しいプロジェクト」をクリック
  3. プロジェクト名入力: nomikai-restaurant-finder
  4. 「作成」をクリック
```

### **💳 Step 2: 課金設定（必須）**

#### **2.1 請求先アカウントの設定**
```yaml
手順:
  1. 左側メニュー「お支払い」をクリック
  2. 「請求先アカウントをリンク」を選択
  3. クレジットカード情報を登録
  4. 住所・税務情報を入力
  
注意:
  - $200/月の無料クレジットが付与される
  - 実際の課金は無料クレジット消費後
```

### **🔌 Step 3: Places API有効化**

#### **3.1 APIライブラリで有効化**
```yaml
手順:
  1. 左側メニュー「APIとサービス」→「ライブラリ」
  2. 検索欄で「Places API」と検索
  3. 「Places API」を選択
  4. 「有効にする」をクリック
  5. 「Maps JavaScript API」も同様に有効化
```

### **🔑 Step 4: APIキー作成**

#### **4.1 認証情報の作成**
```yaml
手順:
  1. 「APIとサービス」→「認証情報」
  2. 「認証情報を作成」→「APIキー」
  3. APIキーが生成される（コピーして保存）
```

#### **4.2 APIキーの制限設定（セキュリティ強化）**
```yaml
手順:
  1. 作成したAPIキーの編集アイコンをクリック
  2. 「APIの制限」を選択
  3. 「キーを制限」を選択
  4. 以下のAPIを選択:
     - Places API
     - Maps JavaScript API
     - Geocoding API
  5. 「保存」をクリック

IPアドレス制限（推奨）:
  1. 「アプリケーションの制限」で「IPアドレス」を選択
  2. サーバーのIPアドレスを入力
  3. 「保存」をクリック
```

---

## ⚙️ APIキー設定・動作確認

### **🔧 Step 1: 環境変数設定**

#### **1.1 開発環境設定ファイル編集**
```bash
# ファイル: /home/sojikoeie/nomikai-restaurant-finder/.env.development

# HotPepper API設定
HOTPEPPER_API_KEY=取得したHotPepperAPIキー
HOTPEPPER_API_ENDPOINT=https://webservice.recruit.co.jp/hotpepper

# Google Places API設定（取得した場合のみ）
GOOGLE_PLACES_API_KEY=取得したGooglePlacesAPIキー
GOOGLE_PLACES_API_ENDPOINT=https://maps.googleapis.com/maps/api/place

# モックAPI無効化
USE_MOCK_API=false

# API有効化
ENABLE_HOTPEPPER=true
ENABLE_GOOGLE_PLACES=true  # Google APIキー取得時のみ
ENABLE_TABELOG=true
```

#### **1.2 本番環境設定ファイル編集**
```bash
# ファイル: /home/sojikoeie/nomikai-restaurant-finder/.env.production

# 同様の設定を本番環境用に設定
HOTPEPPER_API_KEY=${HOTPEPPER_API_KEY}
GOOGLE_PLACES_API_KEY=${GOOGLE_PLACES_API_KEY}
USE_MOCK_API=false
```

### **🧪 Step 2: 動作確認**

#### **2.1 APIキー検証スクリプト実行**
```bash
# プロジェクトディレクトリで実行
cd /home/sojikoeie/nomikai-restaurant-finder

# HotPepper API テスト
curl "https://webservice.recruit.co.jp/hotpepper/gourmet/v1/?key=YOUR_HOTPEPPER_API_KEY&lat=35.6812&lng=139.7671&range=3&count=5&format=json"

# レスポンス確認（正常な場合）
{
  "results": {
    "api_version": "1.26",
    "results_available": 1234,
    "results_returned": "5",
    "results_start": 1,
    "shop": [...]
  }
}
```

#### **2.2 アプリケーション動作確認**
```bash
# サーバー起動
npm run start

# ヘルスチェック実行
./scripts/health-check.sh

# フロントエンド確認
# ブラウザで http://localhost:3001 にアクセス
# 「東京駅 居酒屋」で検索して実際のデータが表示されるか確認
```

### **✅ Step 3: 成功確認項目**
```yaml
確認項目:
  - 検索結果に実際の店舗名が表示される
  - 「使用プラットフォーム: hotpepper」と表示される
  - 「mock」データでない実店舗情報が表示される
  - 評価・価格・住所が現実的な値になっている
  - コンソールにAPI呼び出し成功ログが出力される
```

---

## 🎛️ 運用パターン別推奨設定

### **💰 Pattern 1: 完全無料運用（推奨）**
```yaml
契約API:
  ✅ HotPepper API: 無料（300件/日）
  ❌ Google Places API: 契約しない
  ✅ Tabelog: スクレイピング（50件/週）

設定:
  ENABLE_HOTPEPPER=true
  ENABLE_GOOGLE_PLACES=false
  ENABLE_TABELOG=true
  PLATFORM_WEIGHTS_HOTPEPPER=0.80
  PLATFORM_WEIGHTS_TABELOG=0.20
  PLATFORM_WEIGHTS_GOOGLE=0.00

メリット:
  - 月額費用: 0円
  - 十分な検索結果
  - 実際のレストランデータ
  
使用量目安:
  - 1日最大300回検索
  - 月間9,000店舗検索可能
```

### **💳 Pattern 2: 高精度運用（有料）**
```yaml
契約API:
  ✅ HotPepper API: 無料（300件/日）
  ✅ Google Places API: 有料（$50-200/月）
  ✅ Tabelog: スクレイピング（50件/週）

設定:
  ENABLE_HOTPEPPER=true
  ENABLE_GOOGLE_PLACES=true
  ENABLE_TABELOG=true
  PLATFORM_WEIGHTS_HOTPEPPER=0.50
  PLATFORM_WEIGHTS_TABELOG=0.20
  PLATFORM_WEIGHTS_GOOGLE=0.30

メリット:
  - 評価精度最高
  - 国際的な評価も取得
  - Google Mapsとの連携
  
月額費用:
  - $50-200（使用量による）
  - 1,000-5,000件検索/月
```

### **🧪 Pattern 3: 段階的導入（推奨開始パターン）**
```yaml
Phase 1（開始）:
  ✅ HotPepper API のみ契約
  設定: 完全無料運用で開始
  
Phase 2（必要に応じて）:
  ✅ Google Places API 追加契約
  設定: 高精度運用に移行
  
メリット:
  - リスク最小化
  - 段階的なコスト管理
  - 実際の使用量での判断
```

---

## 🔧 トラブルシューティング

### **🚨 よくある問題と解決方法**

#### **問題1: HotPepper APIキーが無効**
```yaml
症状:
  - API呼び出し時に認証エラー
  - "Invalid API key" エラーメッセージ

解決方法:
  1. APIキーの正確性確認（コピペミス）
  2. リクルートWebサービスでAPIキー再確認
  3. 利用申請の承認状況確認
  4. 環境変数の読み込み確認
```

#### **問題2: Google Places API課金エラー**
```yaml
症状:
  - "Billing not enabled" エラー
  - API呼び出しが403エラー

解決方法:
  1. Google Cloud Consoleで課金設定確認
  2. クレジットカード情報の有効性確認
  3. 請求先アカウントのリンク確認
  4. APIの有効化状況確認
```

#### **問題3: レート制限エラー**
```yaml
症状:
  - "Rate limit exceeded" エラー
  - 一定時間後にAPI呼び出し復旧

解決方法:
  1. 使用量制限の確認
     - HotPepper: 300件/日
     - Google Places: 課金設定による
  2. キャッシュ機能の活用
  3. リクエスト間隔の調整
  4. 優先度による API使用順序の調整
```

#### **問題4: 検索結果が表示されない**
```yaml
症状:
  - 検索しても結果が0件
  - モックデータが表示される

チェック項目:
  1. USE_MOCK_API=false の設定確認
  2. APIキーの正確性確認
  3. ネットワーク接続確認
  4. API利用制限の確認
  5. ブラウザのデベロッパーツールでエラー確認
```

### **📞 サポート連絡先**

#### **HotPepper API サポート**
```
お問い合わせ: https://webservice.recruit.co.jp/support/
営業時間: 平日 10:00-18:00
対応言語: 日本語のみ
```

#### **Google Places API サポート**
```
サポート: https://cloud.google.com/support/
ドキュメント: https://developers.google.com/maps/documentation/places/web-service
コミュニティ: Stack Overflow (google-places-api タグ)
```

---

## 📝 設定完了チェックリスト

### **HotPepper API**
- [ ] リクルートWebサービスアカウント作成完了
- [ ] ホットペッパーグルメAPI利用申請承認済み
- [ ] APIキー取得・保存完了
- [ ] .env.developmentファイル更新完了
- [ ] USE_MOCK_API=false設定完了
- [ ] 動作確認テスト実行完了

### **Google Places API（オプション）**
- [ ] Google Cloud Consoleプロジェクト作成完了
- [ ] 課金設定・クレジットカード登録完了
- [ ] Places API有効化完了
- [ ] APIキー作成・制限設定完了
- [ ] .env.developmentファイル更新完了
- [ ] 動作確認テスト実行完了

### **システム動作確認**
- [ ] アプリケーション起動成功
- [ ] 実際の店舗データ表示確認
- [ ] エラーログ確認（エラーなし）
- [ ] レスポンス時間確認（3秒以内）
- [ ] API使用量監視設定確認

---

**最終更新**: 2025年6月21日  
**次回レビュー**: APIキー設定完了後