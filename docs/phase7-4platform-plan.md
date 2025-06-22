# Phase 7: 4-Platform Rating Aggregation System

**開始日**: 2025年6月21日  
**目標**: HotPepper + Google Places + 食べログ + Retty の4プラットフォーム統合評価システム  
**前提**: 個人利用目的・非営利・非商用

## 🎯 Enhanced Core Objective

### **4プラットフォーム統合評価システム**
4つの主要レビューサイト（HotPepper、Google Places、食べログ、Retty）から星評価とレビューデータを取得し、統一されたインターフェースで一元的に表示・比較できる包括的なシステムを構築する。

## 📋 Enhanced Implementation Plan

### 🔴 Priority 1: 4-Platform API Integration

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

#### 1.4 Retty Data Integration (Personal Use) 🆕
```typescript
interface RettyRatingData {
  restaurantId: string;
  rating: number;           // 0-5 scale (converted from Retty scale)
  reviewCount: number;
  averagePrice: number;
  genre: string;
  popularityScore: number;  // Retty特有の人気度指標
  lastUpdated: Date;
  // No individual reviews (copyright compliance)
}
```

### 🔴 Priority 2: Enhanced 4-Platform Rating Aggregation

#### 2.1 Enhanced Unified Rating System
```typescript
interface EnhancedUnifiedRating {
  restaurantId: string;
  aggregatedScore: number;        // 0-5 scale unified score
  confidence: number;             // 0-1 confidence level
  platforms: PlatformRating[];    // 4 platforms
  totalReviews: number;
  popularityIndex: number;        // Rettyの人気度も考慮
  reliabilityScore: number;       // 4プラットフォーム総合信頼度
  lastUpdated: Date;
}

interface PlatformRating {
  platform: 'hotpepper' | 'google' | 'tabelog' | 'retty';
  rating: number;
  reviewCount: number;
  weight: number;                 // Platform reliability weight
  uniqueFeatures?: {              // Platform特有の特徴
    popularityScore?: number;     // Retty
    priceLevel?: number;          // Google
    dinnerPrice?: string;         // Tabelog
    averagePrice?: number;        // HotPepper
  };
}
```

#### 2.2 Enhanced Aggregation Algorithm
```typescript
class Enhanced4PlatformAggregationEngine {
  // 4プラットフォーム重み付きアルゴリズム
  calculateUnifiedRating(platformRatings: PlatformRating[]): EnhancedUnifiedRating {
    const weights = {
      hotpepper: 0.25,    // 25% weight
      google: 0.35,       // 35% weight (global reliability)
      tabelog: 0.25,      // 25% weight (Japan largest)
      retty: 0.15         // 15% weight (unique insights)
    };
    
    const weightedSum = platformRatings.reduce((sum, rating) => {
      const platformWeight = weights[rating.platform];
      const reviewWeight = Math.min(rating.reviewCount / 100, 1); // Review count factor
      return sum + (rating.rating * platformWeight * reviewWeight);
    }, 0);
    
    const totalWeight = platformRatings.reduce((sum, rating) => {
      const platformWeight = weights[rating.platform];
      const reviewWeight = Math.min(rating.reviewCount / 100, 1);
      return sum + (platformWeight * reviewWeight);
    }, 0);
    
    const aggregatedScore = weightedSum / totalWeight;
    
    return {
      aggregatedScore,
      confidence: this.calculateEnhancedConfidence(platformRatings),
      platforms: platformRatings,
      totalReviews: platformRatings.reduce((sum, r) => sum + r.reviewCount, 0),
      popularityIndex: this.calculatePopularityIndex(platformRatings),
      reliabilityScore: this.calculateReliabilityScore(platformRatings),
      lastUpdated: new Date()
    };
  }
  
  private calculatePopularityIndex(ratings: PlatformRating[]): number {
    // Rettyの人気度スコアと他プラットフォームのレビュー数を統合
    const rettyData = ratings.find(r => r.platform === 'retty');
    const totalReviews = ratings.reduce((sum, r) => sum + r.reviewCount, 0);
    
    let popularityBase = Math.min(totalReviews / 1000, 1); // Max 1.0
    
    if (rettyData?.uniqueFeatures?.popularityScore) {
      popularityBase = (popularityBase + rettyData.uniqueFeatures.popularityScore) / 2;
    }
    
    return popularityBase;
  }
  
  private calculateReliabilityScore(ratings: PlatformRating[]): number {
    // 4プラットフォームのデータ一致度から信頼性を算出
    if (ratings.length < 2) return 0.5;
    
    const scores = ratings.map(r => r.rating);
    const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - average, 2), 0) / scores.length;
    const standardDeviation = Math.sqrt(variance);
    
    // 標準偏差が小さいほど信頼性が高い
    return Math.max(0, 1 - (standardDeviation / 2.5)); // Max SD of 2.5 for 0 reliability
  }
}
```

### 🔴 Priority 3: Enhanced Unified Display Interface

#### 3.1 4-Platform Aggregated Rating Component
```tsx
interface Enhanced4PlatformRatingProps {
  unifiedRating: EnhancedUnifiedRating;
  showPlatformBreakdown?: boolean;
  showAdvancedMetrics?: boolean;
}

const Enhanced4PlatformRatingDisplay: React.FC<Enhanced4PlatformRatingProps> = ({
  unifiedRating,
  showPlatformBreakdown = true,
  showAdvancedMetrics = false
}) => {
  return (
    <Card>
      {/* Enhanced Unified Score */}
      <Box sx={{ textAlign: 'center', mb: 2 }}>
        <Typography variant="h3" color="primary">
          {unifiedRating.aggregatedScore.toFixed(1)}
        </Typography>
        <Rating value={unifiedRating.aggregatedScore} readOnly precision={0.1} size="large" />
        <Typography variant="h6">
          統合評価 ({unifiedRating.totalReviews}件のレビュー)
        </Typography>
        
        {/* Advanced Metrics */}
        {showAdvancedMetrics && (
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', gap: 3 }}>
            <Box textAlign="center">
              <Typography variant="body2" color="text.secondary">信頼度</Typography>
              <Typography variant="h6">{(unifiedRating.confidence * 100).toFixed(0)}%</Typography>
            </Box>
            <Box textAlign="center">
              <Typography variant="body2" color="text.secondary">人気度</Typography>
              <Typography variant="h6">{(unifiedRating.popularityIndex * 100).toFixed(0)}%</Typography>
            </Box>
            <Box textAlign="center">
              <Typography variant="body2" color="text.secondary">データ信頼性</Typography>
              <Typography variant="h6">{(unifiedRating.reliabilityScore * 100).toFixed(0)}%</Typography>
            </Box>
          </Box>
        )}
      </Box>
      
      {/* 4-Platform Breakdown */}
      {showPlatformBreakdown && (
        <Box>
          <Typography variant="h6" gutterBottom>4プラットフォーム詳細評価</Typography>
          <Grid container spacing={1}>
            {unifiedRating.platforms.map(platform => (
              <Grid item xs={12} sm={6} md={3} key={platform.platform}>
                <Enhanced4PlatformRatingItem platform={platform} />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </Card>
  );
};
```

#### 3.2 Enhanced Platform Comparison View
```tsx
const Enhanced4PlatformComparisonView: React.FC<{restaurantId: string}> = ({restaurantId}) => {
  return (
    <Box>
      {/* Unified Rating Overview */}
      <Enhanced4PlatformRatingDisplay 
        unifiedRating={unifiedRating} 
        showAdvancedMetrics={true}
      />
      
      {/* Individual Platform Cards */}
      <Grid container spacing={2} sx={{ mt: 2 }}>
        <Grid item xs={12} md={3}>
          <HotPepperRatingCard restaurantId={restaurantId} />
        </Grid>
        <Grid item xs={12} md={3}>
          <GooglePlacesRatingCard restaurantId={restaurantId} />
        </Grid>
        <Grid item xs={12} md={3}>
          <TabelogRatingCard restaurantId={restaurantId} />
        </Grid>
        <Grid item xs={12} md={3}>
          <RettyRatingCard restaurantId={restaurantId} />
        </Grid>
      </Grid>
      
      {/* Platform Comparison Chart */}
      <Card sx={{ mt: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>プラットフォーム別評価比較</Typography>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={comparisonData}>
              <XAxis dataKey="platform" />
              <YAxis domain={[0, 5]} />
              <CartesianGrid strokeDasharray="3 3" />
              <Tooltip />
              <Bar dataKey="rating" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </Box>
  );
};
```

## 🛠️ Enhanced Technical Implementation

### Step 1: 4-Platform API Client Integration
```typescript
export class Enhanced4PlatformRatingService {
  private hotpepperClient: HotpepperApiClient;
  private googlePlacesClient: GooglePlacesApiClient;
  private tabelogClient: TabelogScrapingClient;
  private rettyClient: RettyScrapingClient; // 🆕
  
  async getAggregated4PlatformRating(restaurantId: string): Promise<EnhancedUnifiedRating> {
    const [hotpepperData, googleData, tabelogData, rettyData] = await Promise.allSettled([
      this.hotpepperClient.getRating(restaurantId),
      this.googlePlacesClient.getRating(restaurantId),
      this.tabelogClient.getBasicRating(restaurantId),
      this.rettyClient.getBasicRating(restaurantId) // 🆕
    ]);
    
    const validRatings = this.extractValidRatings([
      hotpepperData, googleData, tabelogData, rettyData
    ]);
    
    return this.enhanced4PlatformEngine.calculateUnifiedRating(validRatings);
  }
}
```

### Step 2: Retty Scraping Client (Personal Use)
```typescript
class RettyScrapingClient {
  private config = {
    baseURL: 'https://retty.me',
    respectfulAccess: true,
    personalUseOnly: true,
    requestDelay: 45000, // 45 seconds between requests
  };
  
  async getBasicRating(restaurantId: string): Promise<RettyRatingData> {
    await this.respectfulDelay();
    
    try {
      // Basic info scraping (personal use, respectful access)
      const restaurantData = await this.scrapeBasicInfo(restaurantId);
      
      return {
        restaurantId,
        rating: this.normalizeRettyRating(restaurantData.score),
        reviewCount: restaurantData.reviewCount,
        averagePrice: restaurantData.averagePrice,
        genre: restaurantData.genre,
        popularityScore: restaurantData.popularityScore, // Retty unique feature
        lastUpdated: new Date()
      };
    } catch (error) {
      console.warn(`Retty data unavailable for ${restaurantId}:`, error);
      return null;
    }
  }
  
  private normalizeRettyRating(rettyScore: number): number {
    // Convert Retty's scale to 0-5 scale
    // Retty uses different scoring, normalize to standard 5-star scale
    return Math.min(5, Math.max(0, rettyScore * 5 / 100)); // Assuming 100-point scale
  }
  
  private async respectfulDelay(): Promise<void> {
    // 45-second delay for respectful access
    await new Promise(resolve => setTimeout(resolve, 45000));
  }
}
```

### Step 3: Enhanced Legal Compliance
```typescript
interface Enhanced4PlatformCompliance {
  platforms: {
    hotpepper: {
      apiKey: true;
      attribution: '画像提供：ホットペッパー グルメ';
      cacheLimit: '24時間以内';
    };
    google: {
      apiKey: true;
      attribution: 'powered by Google';
      cacheLimit: '30日以内';
    };
    tabelog: {
      personalUseOnly: true;
      attribution: 'データ提供：食べログ（個人利用）';
      respectfulAccess: true;
      basicInfoOnly: true;
    };
    retty: {
      personalUseOnly: true;
      attribution: 'データ提供：Retty（個人利用）';
      respectfulAccess: true;
      basicInfoOnly: true;
      extendedDelay: true; // Extra respectful access
    };
  };
}
```

## 📊 Enhanced Expected Outcomes

### User Experience Improvements
1. **包括的評価**: 日本の主要4プラットフォーム統合評価
2. **詳細比較**: 4プラットフォーム間の評価差異分析
3. **高信頼性**: 4つのソースによる評価の高い信頼性
4. **人気度指標**: Rettyの人気度データも統合した総合評価

### Platform Coverage Enhancement
```typescript
const platformCoverage = {
  hotpepper: 'リクルート運営・予約特化・詳細情報',
  google: 'グローバル・高信頼性・豊富なレビュー',
  tabelog: '日本最大・詳細レビュー・専門性',
  retty: '実名SNS・人気度指標・トレンド情報'
};
```

## ⚠️ Enhanced Implementation Considerations

### Technical Challenges
1. **4-Platform Data Normalization**: 異なる評価スケールの統一
2. **Restaurant ID Matching**: 4プラットフォーム間の同一レストラン識別
3. **Performance Optimization**: 4つのAPI/スクレイピング呼び出し最適化
4. **Enhanced Error Handling**: 部分的失敗時の適切な4プラットフォーム統合

### Legal Compliance for 4 Platforms
1. **API Keys**: HotPepper（無料）+ Google Places（従量課金）
2. **Personal Use Scraping**: 食べログ + Retty（個人利用・respectful access）
3. **Attribution**: 4プラットフォーム適切な帰属表示
4. **Access Control**: 各プラットフォームに適した頻度制限

---

**Phase 7 Enhanced: 4つの主要プラットフォーム（HotPepper + Google Places + 食べログ + Retty）を統合した、日本で最も包括的な個人用レストラン評価統合システムの構築を目指します。**