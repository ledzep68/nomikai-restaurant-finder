export const API_BASE_URL = process.env.NODE_ENV === 'test' 
  ? 'http://localhost:5000/api'
  : import.meta.env?.VITE_API_BASE_URL || 'http://localhost:3001/api';

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  SEARCH: '/search',
  RESTAURANT_DETAIL: '/restaurant/:id',
  PROFILE: '/profile',
  FAVORITES: '/favorites',
  HISTORY: '/history',
} as const;

export const GENRES = [
  { value: 'japanese', label: '和食' },
  { value: 'italian', label: 'イタリアン' },
  { value: 'chinese', label: '中華' },
  { value: 'french', label: 'フレンチ' },
  { value: 'korean', label: '韓国料理' },
  { value: 'thai', label: 'タイ料理' },
  { value: 'vietnamese', label: 'ベトナム料理' },
  { value: 'indian', label: 'インドカレー' },
  { value: 'mexican', label: 'メキシカン' },
  { value: 'american', label: 'アメリカン' },
  { value: 'spanish', label: 'スペイン料理' },
  { value: 'mediterranean', label: '地中海料理' },
  { value: 'middle_eastern', label: '中東料理' },
  { value: 'izakaya', label: '居酒屋' },
  { value: 'yakiniku', label: '焼肉' },
  { value: 'sushi', label: '寿司' },
  { value: 'ramen', label: 'ラーメン' },
  { value: 'udon_soba', label: 'うどん・そば' },
  { value: 'tonkatsu', label: 'とんかつ' },
  { value: 'tempura', label: '天ぷら' },
  { value: 'yakitori', label: '焼き鳥' },
  { value: 'okonomiyaki', label: 'お好み焼き' },
  { value: 'shabu_shabu', label: 'しゃぶしゃぶ' },
  { value: 'sukiyaki', label: 'すき焼き' },
  { value: 'hotpot', label: '鍋料理' },
  { value: 'hamburger', label: 'ハンバーガー' },
  { value: 'pizza', label: 'ピザ' },
  { value: 'pasta', label: 'パスタ' },
  { value: 'steak', label: 'ステーキ' },
  { value: 'seafood', label: '海鮮' },
  { value: 'buffet', label: 'ビュッフェ' },
  { value: 'cafe', label: 'カフェ' },
  { value: 'sweets', label: 'スイーツ' },
  { value: 'bakery', label: 'ベーカリー' },
  { value: 'ice_cream', label: 'アイス・ジェラート' },
  { value: 'tea', label: '紅茶・茶房' },
  { value: 'bar', label: 'バー' },
  { value: 'wine_bar', label: 'ワインバー' },
  { value: 'beer_garden', label: 'ビアガーデン' },
  { value: 'family_restaurant', label: 'ファミリーレストラン' },
  { value: 'fast_food', label: 'ファストフード' },
  { value: 'other', label: 'その他' },
] as const;

export const PRICE_RANGES = [
  { label: '～1,000円', min: 0, max: 1000 },
  { label: '1,000円～2,000円', min: 1000, max: 2000 },
  { label: '2,000円～3,000円', min: 2000, max: 3000 },
  { label: '3,000円～4,000円', min: 3000, max: 4000 },
  { label: '4,000円～5,000円', min: 4000, max: 5000 },
  { label: '5,000円～', min: 5000, max: 999999 },
] as const;

export const SORT_OPTIONS = [
  { value: 'comprehensive', label: '総合評価順' },
  { value: 'rating', label: '評価順' },
  { value: 'confidence', label: '信頼度順' },
  { value: 'reviews', label: 'レビュー数順' },
  { value: 'price', label: '価格安い順' },
  { value: 'distance', label: '距離近い順' },
] as const;

export const CAPACITIES = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
  11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
  21, 22, 23, 24, 25, 26, 27, 28, 29, 30,
  31, 32, 33, 34, 35, 36, 37, 38, 39, 40,
  41, 42, 43, 44, 45, 46, 47, 48, 49, 50,
  '50+'
] as const;

export const RECOMMENDATION_LABELS = {
  highly_recommended: '強くおすすめ',
  recommended: 'おすすめ',
  suitable: '適している',
} as const;

export const TOKYO_AREAS = [
  { value: 'shibuya', label: '渋谷' },
  { value: 'shinjuku', label: '新宿' },
  { value: 'ginza', label: '銀座' },
  { value: 'roppongi', label: '六本木' },
  { value: 'harajuku', label: '原宿' },
  { value: 'akasaka', label: '赤坂' },
  { value: 'ikebukuro', label: '池袋' },
  { value: 'ueno', label: '上野' },
  { value: 'asakusa', label: '浅草' },
  { value: 'tokyo_station', label: '東京駅' },
  { value: 'shinagawa', label: '品川' },
  { value: 'ebisu', label: '恵比寿' },
] as const;

export const RESTAURANT_FEATURES = [
  { value: 'private_room', label: '個室あり' },
  { value: 'all_you_can_drink', label: '飲み放題' },
  { value: 'course_menu', label: 'コースメニュー' },
  { value: 'late_night', label: '深夜営業' },
  { value: 'non_smoking', label: '禁煙' },
  { value: 'card_payment', label: 'カード決済' },
  { value: 'parking', label: '駐車場' },
  { value: 'wifi', label: 'WiFi' },
  { value: 'takeout', label: 'テイクアウト' },
  { value: 'delivery', label: 'デリバリー' },
] as const;

export const PLATFORM_LABELS = {
  hotpepper: 'ホットペッパー',
  googlePlaces: 'Google',
} as const;