# API利用規約遵守レポート

## 概要

本文書は、nomikai-restaurant-finderアプリケーションで使用する外部APIの利用規約と法的要件への遵守状況を分析し、必要な修正事項を特定したレポートです。

## 重大な問題と即座の対応が必要な事項

### ⚠️ 緊急対応事項

#### 1. 食べログAPI実装の問題
**問題：** 食べログAPIは2014年6月30日に提供終了済み
**現状：** 存在しないAPIの実装が含まれている
**リスク：** 実運用時の動作不可、規約違反の可能性
**対応：** 即座に実装を削除

#### 2. RettyAPI実装の問題
**問題：** Rettyの公開APIは存在しない可能性
**現状：** 不明なAPIエンドポイントの実装
**リスク：** 実運用時の動作不可
**対応：** 実装の確認・削除

## 各プラットフォーム詳細分析

### 1. 食べログ（楽天グループ）

#### 現在の状況
- **公式API：** 2014年6月30日提供終了
- **利用可能な手段：** なし（公式API不存在）
- **アクセス方法：** ウェブスクレイピングのみ（規約上問題あり）

#### 利用規約の主要制限
```
・営業活動その他の営利を目的とした利用・アクセス禁止
・口コミの無断転載・利用禁止  
・提供情報の複写・再生・複製・送付・譲渡・頒布・配布・転売の禁止
・自動的手段によるアクセス・情報取得の禁止
```

#### 推奨対応
**即座に削除** - 食べログ関連の全実装を削除

### 2. ホットペッパーグルメ（リクルート）

#### API利用制限
- **データ更新義務：** 24時間以内の情報更新必須
- **保存禁止：** 第三者データベースへのデータコピー・保存禁止
- **用途制限：** 直接マーケティングや編集目的での使用禁止
- **再販禁止：** APIアクセスの販売・レンタル・再ライセンス禁止

#### キャッシュ制限
```typescript
// 現在の実装（違反）
await this.cacheService.set(cacheKey, result, 3600); // 1時間

// 修正必要
await this.cacheService.set(cacheKey, result, 1440); // 24時間以内
```

#### 表示義務
- 「画像提供：ホットペッパー グルメ」の表示必須
- リクルートからの情報であることの明示必須
- ロゴ・クレジットの改変禁止

#### 商用利用制限
- ✅ **許可：** アフィリエイト収入
- ❌ **禁止：** 飲食店から対価を得るビジネスでの利用

### 3. Google Places API

#### 重要な変更予定
- **2025年3月1日：** Places API（旧版）の新規利用停止
- **移行必須：** New Places API (New) への移行

#### データ取得・保存制限
- **キャッシュ期間：** 最大30日間
- **データセット作成禁止：** Googleコンテンツに基づくデータセット禁止
- **マッピング禁止：** ナビゲーションデータセット作成禁止
- **広告制限：** ビジネスリスティングでの広告商品作成禁止

#### 表示義務
```html
<!-- 必須表示 -->
<div>powered by Google</div>
<div>© 2024 Google</div>
```

#### プライバシー要件
- 位置情報取得にはユーザー明示的同意必須
- データ収集の種類についてユーザーへの通知義務
- ユーザーによる同意撤回機能の提供義務

### 4. Retty

#### 現状調査結果
- **公開API：** 存在確認できず
- **利用可能サービス：** Food Data Platform（B2B向けのみ）
- **一般開発者向け：** APIドキュメント不存在

#### 推奨対応
**確認後削除** - APIの存在を確認し、存在しない場合は実装削除

## 日本の法的規制との関係

### 個人情報保護法（2024年改正対応）

#### 主要変更点
- **適用範囲拡大：** 「個人データ」→「個人情報」も規制対象
- **Webスキミング対策：** 強化義務
- **報告義務拡大：** 委託先への不正アクセスも対象

#### 影響・対応
```typescript
// レストラン情報の個人情報要素
interface RestaurantInfo {
  name: string;
  address: string;
  phone: string;        // ← 個人情報保護法対象
  ownerName?: string;   // ← 個人情報保護法対象  
  email?: string;       // ← 個人情報保護法対象
}

// 必要な対応
- 個人情報の仮名化・匿名化処理
- ユーザー同意取得の明確化
- データ保持期間の設定・自動削除
```

### 景品表示法（ステマ規制・2023年10月施行）

#### 規制内容
- ステルスマーケティングの禁止
- レビュー投稿キャンペーンの規制
- 口コミへの対価提供時の開示義務

#### 影響・対応
```typescript
// レビュー表示時の対価関係明示
interface Review {
  content: string;
  rating: number;
  incentivized?: boolean;  // ← 対価提供の有無
  sponsorship?: string;    // ← スポンサー情報
}
```

## 現在実装の規約違反リスク評価

### 🔴 高リスク（即座対応必須）

#### 1. 存在しないAPI実装
```typescript
// 削除対象ファイル
src/services/externalApi/tabelogApiClient.ts     // 全削除
src/services/externalApi/rettyApiClient.ts       // 確認後削除
```

#### 2. キャッシュ期間違反
```typescript
// 現在（違反）
CACHE_TTL = 3600; // 1時間

// 修正後
HOTPEPPER_CACHE_TTL = 86400;     // 24時間
GOOGLE_PLACES_CACHE_TTL = 2592000; // 30日
```

### 🟡 中リスク（1ヶ月以内対応）

#### 1. アトリビューション表示不備
```typescript
// 追加必要
interface ApiAttribution {
  hotpepper: "画像提供：ホットペッパー グルメ";
  googlePlaces: "powered by Google";
}
```

#### 2. プライバシーポリシー不備
- 外部API利用の明記不足
- データ取得・利用目的の説明不足
- ユーザー同意取得プロセス不明確

### 🟢 低リスク（3ヶ月以内対応）

#### 1. Google Places API移行
- 2025年3月までの移行準備
- New Places API対応

## 修正実装計画

### Phase 1: 緊急修正（即座実行）

```typescript
// 1. 食べログAPI削除
// src/services/apiIntegrationService.ts から削除
// - tabelogClient初期化
// - fetchFromTabelog関数
// - tabelog関連処理

// 2. キャッシュ期間修正
const CACHE_CONFIG = {
  hotpepper: 86400,      // 24時間
  googlePlaces: 2592000, // 30日
  default: 3600          // 1時間
};
```

### Phase 2: 法的対応（1週間以内）

```typescript
// アトリビューション追加
interface SearchResult {
  restaurants: Restaurant[];
  attributions: {
    [platform: string]: string;
  };
  legalNotices: {
    privacyPolicy: string;
    termsOfService: string;
    dataUsage: string;
  };
}
```

### Phase 3: 長期対応（1-3ヶ月）

```typescript
// Google Places API移行
// New Places API (New) への移行準備
// - エンドポイント変更
// - レスポンス形式変更対応
// - 価格体系変更対応
```

## 継続的コンプライアンス体制

### 1. 定期確認プロセス
- **月次：** 各プラットフォーム利用規約確認
- **四半期：** 法改正動向確認
- **年次：** 包括的コンプライアンス監査

### 2. リスク管理体制
```typescript
// 利用規約変更検知システム
interface ComplianceMonitor {
  checkTermsChanges(): Promise<TermsChangeAlert[]>;
  validateApiUsage(): Promise<ComplianceReport>;
  generateRiskAssessment(): Promise<RiskReport>;
}
```

### 3. 代替API検討
- **ぐるなびAPI：** 検討対象
- **Yahoo!ロコAPI：** 検討対象
- **独自データソース：** 長期的選択肢

## 結論・推奨アクション

### 即座実行（24時間以内）
1. ✅ 食べログAPI実装の完全削除
2. ✅ RettyAPI実装の確認・削除
3. ✅ キャッシュ期間の修正

### 短期対応（1週間以内）
1. ⏳ アトリビューション表示の実装
2. ⏳ プライバシーポリシーの更新

### 中期対応（1ヶ月以内）
1. ⏳ 利用規約の包括的見直し
2. ⏳ ユーザー同意取得プロセスの整備

### 長期対応（3ヶ月以内）
1. ⏳ Google Places API移行準備
2. ⏳ 継続的コンプライアンス体制の構築

**重要：** 食べログとRettyのAPI実装削除は法的リスク回避のため即座に実行する必要があります。