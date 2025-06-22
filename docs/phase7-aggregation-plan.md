# Phase 7: Multi-platform Rating Aggregation System

**開始日**: 2025年6月21日  
**目標**: 各サイトの星評価・レビューを総合し、一元化して評価できるプラットフォームの構築  
**前提**: 個人利用目的・非営利・非商用

## 🎯 Core Objective

### **統合評価プラットフォーム**
複数のレビューサイト（HotPepper、Google Places、食べログ）から星評価とレビューデータを取得し、統一されたインターフェースで一元的に表示・比較できるシステムを構築する。

## 📋 Phase 7 Implementation Plan

### 🔴 Priority 1: Multi-Platform API Integration

#### 1.1 HotPepper API Integration
```typescript
interface HotPepperRatingData {
  restaurantId: string;
  rating: number;           // 0-5 scale
  reviewCount: number;
  averagePrice: number;
  genre: string;
  lastUpdated: Date;
}
```

#### 1.2 Google Places API Integration  
```typescript
interface GooglePlacesRatingData {
  placeId: string;
  rating: number;           // 0-5 scale  
  userRatingsTotal: number;
  reviews: GoogleReview[];
  priceLevel: number;       // 0-4 scale
  lastUpdated: Date;
}
```

#### 1.3 Tabelog Data Integration (Personal Use)
```typescript
interface TabelogRatingData {
  restaurantId: string;
  rating: number;           // 0-5 scale
  reviewCount: number;
  dinnerPrice: string;
  lunchPrice: string;
  lastUpdated: Date;
  // No individual reviews (copyright compliance)
}
```

### 🔴 Priority 2: Rating Aggregation Algorithm

#### 2.1 Unified Rating System
```typescript
interface UnifiedRating {
  restaurantId: string;
  aggregatedScore: number;        // 0-5 scale unified score
  confidence: number;             // 0-1 confidence level
  platforms: PlatformRating[];
  totalReviews: number;
  lastUpdated: Date;
}

interface PlatformRating {
  platform: 'hotpepper' | 'google' | 'tabelog';
  rating: number;
  reviewCount: number;
  weight: number;                 // Platform reliability weight
}
```

#### 2.2 Aggregation Algorithm
```typescript
class RatingAggregationEngine {
  // Weighted average algorithm
  calculateUnifiedRating(platformRatings: PlatformRating[]): UnifiedRating {
    const weights = {
      hotpepper: 0.3,    // 30% weight
      google: 0.4,       // 40% weight  
      tabelog: 0.3       // 30% weight
    };
    
    const weightedSum = platformRatings.reduce((sum, rating) => {
      return sum + (rating.rating * rating.reviewCount * weights[rating.platform]);
    }, 0);
    
    const totalWeightedReviews = platformRatings.reduce((sum, rating) => {
      return sum + (rating.reviewCount * weights[rating.platform]);
    }, 0);
    
    return {
      aggregatedScore: weightedSum / totalWeightedReviews,
      confidence: this.calculateConfidence(platformRatings),
      platforms: platformRatings,
      totalReviews: platformRatings.reduce((sum, r) => sum + r.reviewCount, 0)
    };
  }
}
```

### 🔴 Priority 3: Unified Display Interface

#### 3.1 Aggregated Rating Component
```tsx
interface AggregatedRatingProps {
  unifiedRating: UnifiedRating;
  showPlatformBreakdown?: boolean;
}

const AggregatedRatingDisplay: React.FC<AggregatedRatingProps> = ({
  unifiedRating,
  showPlatformBreakdown = true
}) => {
  return (
    <Card>
      {/* Unified Score */}
      <Box sx={{ textAlign: 'center', mb: 2 }}>
        <Typography variant="h4">
          {unifiedRating.aggregatedScore.toFixed(1)}
        </Typography>
        <Rating value={unifiedRating.aggregatedScore} readOnly precision={0.1} />
        <Typography variant="body2">
          統合評価 ({unifiedRating.totalReviews}件のレビュー)
        </Typography>
      </Box>
      
      {/* Platform Breakdown */}
      {showPlatformBreakdown && (
        <Box>
          <Typography variant="h6" gutterBottom>プラットフォーム別評価</Typography>
          {unifiedRating.platforms.map(platform => (
            <PlatformRatingItem key={platform.platform} platform={platform} />
          ))}
        </Box>
      )}
    </Card>
  );
};
```

#### 3.2 Platform Comparison View
```tsx
const PlatformComparisonView: React.FC<{restaurantId: string}> = ({restaurantId}) => {
  return (
    <Grid container spacing={2}>
      <Grid item xs={12} md={4}>
        <HotPepperRatingCard restaurantId={restaurantId} />
      </Grid>
      <Grid item xs={12} md={4}>
        <GooglePlacesRatingCard restaurantId={restaurantId} />
      </Grid>
      <Grid item xs={12} md={4}>
        <TabelogRatingCard restaurantId={restaurantId} />
      </Grid>
    </Grid>
  );
};
```

## 🛠️ Technical Implementation

### Step 1: API Client Enhancement
```typescript
// Enhanced API Integration Service
export class MultiPlatformRatingService {
  private hotpepperClient: HotpepperApiClient;
  private googlePlacesClient: GooglePlacesApiClient;
  private tabelogClient: TabelogScrapingClient; // Personal use only
  
  async getAggregatedRating(restaurantId: string): Promise<UnifiedRating> {
    const [hotpepperData, googleData, tabelogData] = await Promise.allSettled([
      this.hotpepperClient.getRating(restaurantId),
      this.googlePlacesClient.getRating(restaurantId),
      this.tabelogClient.getBasicRating(restaurantId) // Basic info only
    ]);
    
    const validRatings = this.extractValidRatings([
      hotpepperData, googleData, tabelogData
    ]);
    
    return this.aggregationEngine.calculateUnifiedRating(validRatings);
  }
}
```

### Step 2: Legal Compliance Integration
```typescript
interface LegalComplianceConfig {
  tabelog: {
    personalUseOnly: true;
    noReviewCopy: true;
    basicInfoOnly: true;
    respectfulAccess: true;
  };
  attributions: {
    hotpepper: '画像提供：ホットペッパー グルメ';
    google: 'powered by Google';
    tabelog: 'データ提供：食べログ（個人利用）';
  };
}
```

### Step 3: Caching Strategy
```typescript
class MultiPlatformCacheService {
  private cacheDurations = {
    hotpepper: 24 * 60 * 60,      // 24 hours
    google: 30 * 24 * 60 * 60,    // 30 days
    tabelog: 12 * 60 * 60,        // 12 hours (personal use)
    aggregated: 6 * 60 * 60,      // 6 hours
  };
  
  async getCachedOrFetch(
    restaurantId: string,
    platform: Platform
  ): Promise<PlatformRating> {
    const cacheKey = `${platform}:${restaurantId}`;
    const cached = await this.redis.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }
    
    const fresh = await this.fetchFromPlatform(restaurantId, platform);
    await this.redis.setex(
      cacheKey, 
      this.cacheDurations[platform], 
      JSON.stringify(fresh)
    );
    
    return fresh;
  }
}
```

## 📊 Expected Outcomes

### User Experience Improvements
1. **統一評価**: 複数サイトの評価を一つの指標で確認
2. **詳細比較**: プラットフォーム別の評価差異を把握
3. **信頼性向上**: 複数ソースによる評価の信頼性向上
4. **個人価値**: より良い食事選択のための情報統合

### Technical Achievements
1. **Multi-API Integration**: 3つのプラットフォーム統合
2. **Smart Aggregation**: 重み付き統合アルゴリズム
3. **Unified Interface**: 統一されたユーザーインターフェース
4. **Legal Compliance**: 個人利用範囲での適法実装

## ⚠️ Implementation Considerations

### API Keys Required
- HotPepper API Key (無料)
- Google Places API Key (従量課金)

### Technical Challenges
1. **Data Normalization**: 異なるスケールの評価統一
2. **Restaurant Matching**: 同一レストランの異なるプラットフォーム間マッチング
3. **Performance Optimization**: 複数API呼び出しの最適化
4. **Error Handling**: 部分的API失敗時の適切な処理

### Legal Compliance
1. **Personal Use Declaration**: 個人利用目的の明確化
2. **Attribution Display**: 各プラットフォームの適切な帰属表示
3. **Respectful Access**: サーバー負荷を考慮したアクセス
4. **Data Scope Limitation**: 著作権侵害を避けるデータ範囲制限

---

**Phase 7は、複数プラットフォームの評価を統合する画期的な個人用レストラン評価システムの構築を目指します。**