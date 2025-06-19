export const API_BASE_URL = 
  ((global as any).importMeta?.env?.VITE_API_BASE_URL) || 
  (typeof process !== 'undefined' && process.env?.VITE_API_BASE_URL) || 
  'http://localhost:3001/api';

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  SEARCH: '/search',
  RESTAURANT_DETAIL: '/restaurant/:id',
  PROFILE: '/profile',
  FAVORITES: '/favorites',
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
  { value: 'rating', label: '評価順' },
  { value: 'price', label: '価格順' },
  { value: 'distance', label: '距離順' },
] as const;

export const CAPACITIES = [2, 4, 6, 8, 10, 15, 20, 30] as const;

export const RECOMMENDATION_LABELS = {
  highly_recommended: '強くおすすめ',
  recommended: 'おすすめ',
  suitable: '適している',
} as const;

export const PLATFORM_LABELS = {
  hotpepper: 'ホットペッパー',
  googlePlaces: 'Google',
} as const;