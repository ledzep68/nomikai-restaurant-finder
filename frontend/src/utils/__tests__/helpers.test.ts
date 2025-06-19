import {
  formatPrice,
  formatPriceRange,
  formatDate,
  formatDateShort,
  getRecommendationLabel,
  getPlatformLabel,
  generateStarRating,
  truncateText,
  validateEmail,
  validatePassword,
  getErrorMessage,
  debounce,
} from '../helpers';

describe('formatPrice', () => {
  it('数値を日本円フォーマットに変換する', () => {
    expect(formatPrice(1000)).toBe('￥1,000');
    expect(formatPrice(10000)).toBe('￥10,000');
    expect(formatPrice(0)).toBe('￥0');
    expect(formatPrice(999999)).toBe('￥999,999');
  });

  it('小数点は切り捨てられる', () => {
    expect(formatPrice(1234.56)).toBe('￥1,235');
  });
});

describe('formatPriceRange', () => {
  it('価格範囲を正しくフォーマットする', () => {
    expect(formatPriceRange(1000, 2000)).toBe('￥1,000～￥2,000');
    expect(formatPriceRange(0, 5000)).toBe('￥0～￥5,000');
  });

  it('maxが999999の場合は「～」表記になる', () => {
    expect(formatPriceRange(5000, 999999)).toBe('￥5,000～');
  });
});

describe('formatDate', () => {
  it('日付を日本語フォーマットで表示する', () => {
    const date = new Date('2024-01-15T14:30:00');
    expect(formatDate(date.toISOString())).toMatch(/2024年1月15日/);
  });

  it('無効な日付の場合は空文字を返す', () => {
    expect(formatDate('invalid-date')).toBe('');
  });
});

describe('formatDateShort', () => {
  it('日付を短い日本語フォーマットで表示する', () => {
    const date = new Date('2024-01-15T14:30:00');
    expect(formatDateShort(date.toISOString())).toBe('2024年1月15日');
  });

  it('無効な日付の場合は空文字を返す', () => {
    expect(formatDateShort('invalid-date')).toBe('');
  });
});

describe('getRecommendationLabel', () => {
  it('推奨レベルに応じた日本語ラベルを返す', () => {
    expect(getRecommendationLabel('highly_recommended')).toBe('強くおすすめ');
    expect(getRecommendationLabel('recommended')).toBe('おすすめ');
    expect(getRecommendationLabel('suitable')).toBe('適している');
  });

  it('未知の推奨レベルの場合は空文字を返す', () => {
    expect(getRecommendationLabel('unknown' as any)).toBe('');
  });
});

describe('getPlatformLabel', () => {
  it('プラットフォームに応じた日本語ラベルを返す', () => {
    expect(getPlatformLabel('hotpepper')).toBe('ホットペッパー');
    expect(getPlatformLabel('googlePlaces')).toBe('Google');
  });

  it('未知のプラットフォームの場合は元の値を返す', () => {
    expect(getPlatformLabel('unknown' as any)).toBe('unknown');
  });
});

describe('generateStarRating', () => {
  it('評価値に応じて星を生成する', () => {
    expect(generateStarRating(5)).toBe('★★★★★');
    expect(generateStarRating(3)).toBe('★★★☆☆');
    expect(generateStarRating(0)).toBe('☆☆☆☆☆');
  });

  it('小数点は四捨五入される', () => {
    expect(generateStarRating(3.7)).toBe('★★★★☆');
    expect(generateStarRating(3.2)).toBe('★★★☆☆');
  });

  it('範囲外の値は適切に処理される', () => {
    expect(generateStarRating(-1)).toBe('☆☆☆☆☆');
    expect(generateStarRating(6)).toBe('★★★★★');
  });
});

describe('truncateText', () => {
  it('指定した長さ以下のテキストはそのまま返す', () => {
    expect(truncateText('短いテキスト', 20)).toBe('短いテキスト');
  });

  it('指定した長さを超えるテキストは省略記号付きで切り詰める', () => {
    expect(truncateText('これは非常に長いテキストです', 10)).toBe('これは非常に長いテキ...');
  });

  it('空文字や未定義の場合は空文字を返す', () => {
    expect(truncateText('', 10)).toBe('');
    expect(truncateText(null as any, 10)).toBe('');
    expect(truncateText(undefined as any, 10)).toBe('');
  });
});

describe('validateEmail', () => {
  it('有効なメールアドレスの場合はtrueを返す', () => {
    expect(validateEmail('test@example.com')).toBe(true);
    expect(validateEmail('user.name+tag@example.co.jp')).toBe(true);
  });

  it('無効なメールアドレスの場合はfalseを返す', () => {
    expect(validateEmail('invalid')).toBe(false);
    expect(validateEmail('@example.com')).toBe(false);
    expect(validateEmail('test@')).toBe(false);
    expect(validateEmail('test @example.com')).toBe(false);
  });

  it('空文字の場合はfalseを返す', () => {
    expect(validateEmail('')).toBe(false);
  });
});

describe('validatePassword', () => {
  it('8文字以上のパスワードはtrueを返す', () => {
    expect(validatePassword('password123')).toBe(true);
    expect(validatePassword('12345678')).toBe(true);
  });

  it('8文字未満のパスワードはfalseを返す', () => {
    expect(validatePassword('pass')).toBe(false);
    expect(validatePassword('1234567')).toBe(false);
  });

  it('空文字の場合はfalseを返す', () => {
    expect(validatePassword('')).toBe(false);
  });
});

describe('getErrorMessage', () => {
  it('Errorオブジェクトからメッセージを取得する', () => {
    const error = new Error('エラーメッセージ');
    expect(getErrorMessage(error)).toBe('エラーメッセージ');
  });

  it('文字列エラーをそのまま返す', () => {
    expect(getErrorMessage('文字列エラー')).toBe('文字列エラー');
  });

  it('Axiosエラーからメッセージを取得する', () => {
    const axiosError = {
      response: {
        data: {
          message: 'APIエラーメッセージ'
        }
      }
    };
    expect(getErrorMessage(axiosError)).toBe('APIエラーメッセージ');
  });

  it('未知のエラー形式の場合はデフォルトメッセージを返す', () => {
    expect(getErrorMessage(null)).toBe('予期しないエラーが発生しました');
    expect(getErrorMessage(undefined)).toBe('予期しないエラーが発生しました');
    expect(getErrorMessage(123)).toBe('予期しないエラーが発生しました');
  });
});

describe('debounce', () => {
  jest.useFakeTimers();

  it('指定した遅延時間後に関数が実行される', () => {
    const mockFn = jest.fn();
    const debouncedFn = debounce(mockFn, 300);

    debouncedFn('test');
    expect(mockFn).not.toHaveBeenCalled();

    jest.advanceTimersByTime(300);
    expect(mockFn).toHaveBeenCalledWith('test');
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('連続して呼ばれた場合は最後の呼び出しのみ実行される', () => {
    const mockFn = jest.fn();
    const debouncedFn = debounce(mockFn, 300);

    debouncedFn('first');
    jest.advanceTimersByTime(100);
    debouncedFn('second');
    jest.advanceTimersByTime(100);
    debouncedFn('third');
    jest.advanceTimersByTime(300);

    expect(mockFn).toHaveBeenCalledWith('third');
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  it('複数の引数を正しく渡す', () => {
    const mockFn = jest.fn();
    const debouncedFn = debounce(mockFn, 300);

    debouncedFn('arg1', 'arg2', 'arg3');
    jest.advanceTimersByTime(300);

    expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2', 'arg3');
  });

  afterEach(() => {
    jest.clearAllTimers();
  });
});