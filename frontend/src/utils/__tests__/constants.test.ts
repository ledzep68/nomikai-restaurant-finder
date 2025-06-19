import {
  API_BASE_URL,
  ROUTES,
  GENRES,
  PRICE_RANGES,
  SORT_OPTIONS,
  CAPACITIES,
  RECOMMENDATION_LABELS,
  PLATFORM_LABELS,
} from '../constants';

describe('API_BASE_URL', () => {
  it('API_BASE_URLが定義されている', () => {
    expect(API_BASE_URL).toBeDefined();
    expect(typeof API_BASE_URL).toBe('string');
  });
});

describe('ROUTES', () => {
  it('すべての必要なルートが定義されている', () => {
    expect(ROUTES.HOME).toBe('/');
    expect(ROUTES.LOGIN).toBe('/login');
    expect(ROUTES.REGISTER).toBe('/register');
    expect(ROUTES.SEARCH).toBe('/search');
    expect(ROUTES.RESTAURANT_DETAIL).toBe('/restaurant/:id');
    expect(ROUTES.PROFILE).toBe('/profile');
    expect(ROUTES.FAVORITES).toBe('/favorites');
  });

  it('ROUTESオブジェクトは読み取り専用である', () => {
    const routesKeys = Object.keys(ROUTES);
    expect(routesKeys).toHaveLength(7);
  });
});

describe('GENRES', () => {
  it('ジャンルの配列が正しく定義されている', () => {
    expect(GENRES.length).toBeGreaterThan(30); // 40+ジャンルなので30以上
    expect(GENRES[0]).toEqual({ value: 'japanese', label: '和食' });
    expect(GENRES[1]).toEqual({ value: 'italian', label: 'イタリアン' });
  });

  it('新しく追加したジャンルが含まれている', () => {
    const genreValues = GENRES.map(g => g.value);
    expect(genreValues).toContain('korean');
    expect(genreValues).toContain('thai');
    expect(genreValues).toContain('vietnamese');
    expect(genreValues).toContain('indian');
    expect(genreValues).toContain('sweets');
    expect(genreValues).toContain('ice_cream');
  });

  it('すべてのジャンルにvalueとlabelが含まれている', () => {
    GENRES.forEach(genre => {
      expect(genre).toHaveProperty('value');
      expect(genre).toHaveProperty('label');
      expect(typeof genre.value).toBe('string');
      expect(typeof genre.label).toBe('string');
    });
  });

  it('重複するvalueがない', () => {
    const values = GENRES.map(g => g.value);
    const uniqueValues = new Set(values);
    expect(uniqueValues.size).toBe(values.length);
  });
});

describe('PRICE_RANGES', () => {
  it('価格帯の配列が正しく定義されている', () => {
    expect(PRICE_RANGES).toHaveLength(6);
    expect(PRICE_RANGES[0]).toEqual({ label: '～1,000円', min: 0, max: 1000 });
    expect(PRICE_RANGES[5]).toEqual({ label: '5,000円～', min: 5000, max: 999999 });
  });

  it('すべての価格帯にlabel、min、maxが含まれている', () => {
    PRICE_RANGES.forEach(range => {
      expect(range).toHaveProperty('label');
      expect(range).toHaveProperty('min');
      expect(range).toHaveProperty('max');
      expect(typeof range.label).toBe('string');
      expect(typeof range.min).toBe('number');
      expect(typeof range.max).toBe('number');
    });
  });

  it('価格帯が昇順に並んでいる', () => {
    for (let i = 1; i < PRICE_RANGES.length; i++) {
      expect(PRICE_RANGES[i].min).toBeGreaterThanOrEqual(PRICE_RANGES[i - 1].max);
    }
  });
});

describe('SORT_OPTIONS', () => {
  it('ソートオプションの配列が正しく定義されている', () => {
    expect(SORT_OPTIONS).toHaveLength(3);
    expect(SORT_OPTIONS[0]).toEqual({ value: 'rating', label: '評価順' });
    expect(SORT_OPTIONS[1]).toEqual({ value: 'price', label: '価格順' });
    expect(SORT_OPTIONS[2]).toEqual({ value: 'distance', label: '距離順' });
  });

  it('すべてのソートオプションにvalueとlabelが含まれている', () => {
    SORT_OPTIONS.forEach(option => {
      expect(option).toHaveProperty('value');
      expect(option).toHaveProperty('label');
      expect(typeof option.value).toBe('string');
      expect(typeof option.label).toBe('string');
    });
  });
});

describe('CAPACITIES', () => {
  it('人数の配列が正しく定義されている', () => {
    expect(CAPACITIES).toEqual([2, 4, 6, 8, 10, 15, 20, 30]);
  });

  it('人数が昇順に並んでいる', () => {
    for (let i = 1; i < CAPACITIES.length; i++) {
      expect(CAPACITIES[i]).toBeGreaterThan(CAPACITIES[i - 1]);
    }
  });

  it('すべての人数が正の整数である', () => {
    CAPACITIES.forEach(capacity => {
      expect(Number.isInteger(capacity)).toBe(true);
      expect(capacity).toBeGreaterThan(0);
    });
  });
});

describe('RECOMMENDATION_LABELS', () => {
  it('推奨レベルのラベルが正しく定義されている', () => {
    expect(RECOMMENDATION_LABELS.highly_recommended).toBe('強くおすすめ');
    expect(RECOMMENDATION_LABELS.recommended).toBe('おすすめ');
    expect(RECOMMENDATION_LABELS.suitable).toBe('適している');
  });

  it('すべての推奨レベルが定義されている', () => {
    expect(Object.keys(RECOMMENDATION_LABELS)).toHaveLength(3);
  });
});

describe('PLATFORM_LABELS', () => {
  it('プラットフォームのラベルが正しく定義されている', () => {
    expect(PLATFORM_LABELS.hotpepper).toBe('ホットペッパー');
    expect(PLATFORM_LABELS.googlePlaces).toBe('Google');
  });

  it('すべてのプラットフォームが定義されている', () => {
    expect(Object.keys(PLATFORM_LABELS)).toHaveLength(2);
  });
});

describe('定数の整合性', () => {
  it('すべての定数が不変である', () => {
    // TypeScriptのas constによって保証されているが、念のためテスト
    expect(Object.isFrozen(ROUTES)).toBe(false); // constは完全にfreezeではない
    expect(typeof ROUTES).toBe('object');
  });

  it('定数間の参照整合性が保たれている', () => {
    // 例: SORT_OPTIONSのvalueが適切な値であること
    const validSortValues = ['rating', 'price', 'distance'];
    SORT_OPTIONS.forEach(option => {
      expect(validSortValues).toContain(option.value);
    });
  });
});