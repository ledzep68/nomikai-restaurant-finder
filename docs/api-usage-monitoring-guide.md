# API使用量監視・アラートシステム運用ガイド

**作成日**: 2025年6月22日  
**対象**: システム運用者・管理者  
**目的**: API制限監視とアラート対応の運用手順

---

## 📋 概要

nomikai restaurant finderシステムのAPI使用量を監視し、無料枠の制限に達した場合のアラート送信と機能制限を自動化するシステムです。

---

## 🎯 監視対象API

### **HotPepper API（最重要）**
```yaml
制限値:
  分間: 2リクエスト
  時間: 50リクエスト  
  日間: 300リクエスト

アラート閾値:
  警告: 75%使用時
  重大: 90%使用時
  停止: 100%使用時
```

### **Tabelog スクレイピング**
```yaml
制限値:
  分間: 1リクエスト
  時間: 5リクエスト
  日間: 10リクエスト
  週間: 50リクエスト

アラート閾値:
  警告: 75%使用時
  重大: 90%使用時
  停止: 100%使用時
```

### **Google Places API（無効化済み）**
```yaml
状態: 現在無効
監視: 有効化時の準備として監視設定済み
```

---

## 🚨 アラートレベルと対応

### **⚠️ WARNING（警告）**
**条件**: 75%使用時  
**影響**: なし  
**通知**: コンソール、ログファイル  
**対応**: 使用量の注意深い監視

### **🚨 CRITICAL（重大）**
**条件**: 90%使用時  
**影響**: なし（事前警告）  
**通知**: 全チャンネル（コンソール、ログ、Webhook）  
**対応**: 
- 使用頻度の削減検討
- キャッシュ活用の強化
- 代替データソースの準備

### **🛑 BLOCKED（停止）**
**条件**: 100%使用時（制限到達）  
**影響**: 該当APIの使用停止  
**通知**: 全チャンネル（即座）  
**自動対応**:
- APIの一時無効化（1時間）
- フォールバック機能の自動有効化
- 代替データソースへの切り替え

---

## 📊 監視ダッシュボード

### **アクセス方法**
```bash
# フロントエンド管理画面
http://localhost:5173/admin/api-usage

# API直接アクセス
curl http://localhost:3000/api/monitoring/system-health
```

### **主要エンドポイント**
```yaml
システム全体ヘルス:
  GET /api/monitoring/system-health

使用量統計:
  GET /api/monitoring/usage-stats

レート制限サマリー:
  GET /api/monitoring/rate-limit-summary

プラットフォーム別制限:
  GET /api/monitoring/rate-limit/{platform}

アラート履歴:
  GET /api/monitoring/alerts

使用量予測:
  GET /api/monitoring/forecast/{platform}
```

---

## 🔧 設定カスタマイズ

### **アラート閾値の変更**
```typescript
// src/services/apiUsageMonitor.ts
private alertThresholds = {
  warning: 0.75,  // 75%使用で警告
  critical: 0.90, // 90%使用で重大警告  
  blocked: 1.0    // 100%使用で機能停止
};
```

### **通知チャンネルの設定**
```bash
# 環境変数設定（.env.production）

# Webhook通知（Slack/Discord）
ALERT_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL

# Email通知
ALERT_EMAIL_SMTP_HOST=smtp.gmail.com
ALERT_EMAIL_SMTP_PORT=587
ALERT_EMAIL_USER=your-email@gmail.com
ALERT_EMAIL_PASSWORD=your-password
ALERT_EMAIL_FROM=noreply@nomikai-finder.local
ALERT_EMAIL_TO=admin@example.com,operator@example.com
```

### **制限値の調整**
```bash
# .env.development / .env.production

# HotPepper制限値（無料プラン）
HOTPEPPER_FREE_TIER_RPM=2
HOTPEPPER_FREE_TIER_RPH=50
HOTPEPPER_FREE_TIER_RPD=300

# Tabelog制限値（個人利用）
TABELOG_FREE_TIER_WEEKLY_LIMIT=50

# Google Places制限値（使用時）
GOOGLE_PLACES_REQUESTS_PER_DAY=1000
```

---

## 📱 アラート対応手順

### **📋 WARNING受信時**
1. **監視強化**
   ```bash
   # ダッシュボードで使用状況確認
   curl http://localhost:3000/api/monitoring/system-health
   ```

2. **使用量確認**
   - 現在の使用率をチェック
   - 残り使用可能回数を確認
   - 次回リセット時間を確認

3. **予防措置**
   - 不要なAPI呼び出しの削減
   - キャッシュ利用率の向上

### **🚨 CRITICAL受信時**
1. **即座の対応**
   ```bash
   # 緊急使用量チェック
   curl http://localhost:3000/api/monitoring/rate-limit/hotpepper
   ```

2. **使用制限**
   - 新規検索の一時制限
   - キャッシュデータの積極活用
   - バッチ処理の停止

3. **代替準備**
   - ローカルデータベースの確認
   - Tabelogスクレイピングの状況確認

### **🛑 BLOCKED受信時**
1. **自動対応確認**
   ```bash
   # システム状態確認
   curl http://localhost:3000/api/monitoring/system-health
   ```

2. **フォールバック確認**
   - 代替データソースの動作確認
   - キャッシュデータの利用状況確認
   - ユーザー影響の最小化

3. **復旧準備**
   - リセット時間の確認
   - 制限解除後の段階的復旧計画

---

## 🔄 フォールバック機能

### **HotPepper API制限時**
```yaml
優先順序:
  1. キャッシュデータ（48時間以内）
  2. Tabelogスクレイピング
  3. ローカルデータベース
  4. エラーレスポンス（制限通知）

自動切り替え: あり
ユーザー通知: 「一時的にキャッシュデータを使用中」
```

### **全API制限時**
```yaml
フォールバック先:
  1. ローカルデータベース
  2. 静的サンプルデータ
  3. サービス一時停止通知

影響最小化:
  - 検索機能の制限付き提供
  - キャッシュデータの延長利用
  - 代替検索手段の提案
```

---

## 📈 使用量最適化のベストプラクティス

### **キャッシュ戦略**
```yaml
推奨設定:
  検索結果: 1時間キャッシュ
  詳細情報: 24時間キャッシュ
  静的データ: 30日キャッシュ

効果: API使用量50-70%削減
```

### **リクエスト最適化**
```yaml
実装済み:
  - バッチ検索（複数条件同時処理）
  - 結果フィルタリング（サーバーサイド）
  - ページネーション（必要分のみ取得）

効果: API使用量30-40%削減
```

### **利用パターン分析**
```bash
# 使用量予測
curl http://localhost:3000/api/monitoring/forecast/hotpepper?hours=24

# 推奨アクション確認
curl http://localhost:3000/api/monitoring/system-health | grep recommendations
```

---

## 🔍 トラブルシューティング

### **アラートが送信されない**
```bash
# 通知システム状態確認
curl http://localhost:3000/api/monitoring/usage-stats

# ログファイル確認
tail -f ./logs/alerts.log

# 通知設定確認
grep ALERT_ .env.production
```

### **使用量が正確でない**
```bash
# キャッシュクリア
curl -X DELETE http://localhost:3000/api/cache/clear

# 手動リセット
curl -X POST http://localhost:3000/api/monitoring/reset/hotpepper
```

### **フォールバックが動作しない**
```bash
# データソース確認
curl http://localhost:3000/api/restaurants/search?location=東京駅&debug=true

# ローカルDB確認
sqlite3 ./database/nomikai.db "SELECT COUNT(*) FROM restaurants;"
```

---

## 📊 レポート・分析

### **日次レポート**
```bash
# 前日の使用量サマリー
curl "http://localhost:3000/api/monitoring/daily-report?date=2025-06-22"

# 週次トレンド分析
curl "http://localhost:3000/api/monitoring/weekly-trend"
```

### **コスト効果分析**
```yaml
無料プラン維持による節約:
  HotPepper: 0円/月（無料）
  Google Places: $50-200/月の節約
  Tabelog: 0円/月（個人利用）

合計節約額: $600-2400/年
```

### **パフォーマンス指標**
```yaml
目標値:
  API応答時間: < 2秒
  制限遵守率: 100%
  アラート応答時間: < 30秒
  フォールバック成功率: > 95%
```

---

## 🚀 将来の拡張

### **有料プラン移行時**
```yaml
検討事項:
  - Google Places API有効化
  - HotPepper有料プランアップグレード
  - より詳細な監視メトリクス
  - 高度な予測分析
```

### **スケーリング対応**
```yaml
準備済み機能:
  - 複数インスタンス対応
  - 分散キャッシュ
  - ロードバランシング対応
  - クラウド監視連携
```

---

**最終更新**: 2025年6月22日  
**次回レビュー**: API使用パターン分析後  
**緊急連絡**: システム管理者まで