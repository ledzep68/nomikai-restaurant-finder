import {
  formatPrice,
  formatPriceRange,
  generateStarRating,
  truncateText,
  validateEmail,
  validatePassword,
  getErrorMessage,
  formatAddress
} from '../helpers';

describe('helpers', () => {
  describe('formatPrice', () => {
    it('formats price correctly', () => {
      expect(formatPrice(1000)).toBe('￥1,000');
      expect(formatPrice(0)).toBe('￥0');
    });
  });

  describe('formatPriceRange', () => {
    it('formats price range correctly', () => {
      expect(formatPriceRange(1000, 2000)).toBe('￥1,000～￥2,000');
      expect(formatPriceRange(5000, 999999)).toBe('￥5,000～');
    });
  });

  describe('generateStarRating', () => {
    it('generates correct star rating', () => {
      expect(generateStarRating(5)).toBe('★★★★★');
      expect(generateStarRating(3)).toBe('★★★☆☆');
      expect(generateStarRating(0)).toBe('☆☆☆☆☆');
    });
  });

  describe('truncateText', () => {
    it('truncates text correctly', () => {
      expect(truncateText('Long text', 5)).toBe('Long ...');
      expect(truncateText('Short', 10)).toBe('Short');
      expect(truncateText(undefined, 10)).toBe('');
    });
  });

  describe('validateEmail', () => {
    it('validates email correctly', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('invalid')).toBe(false);
    });
  });

  describe('validatePassword', () => {
    it('validates password length', () => {
      expect(validatePassword('12345678')).toBe(true);
      expect(validatePassword('short')).toBe(false);
    });
  });

  describe('getErrorMessage', () => {
    it('extracts error messages correctly', () => {
      expect(getErrorMessage(new Error('Test error'))).toBe('Test error');
      expect(getErrorMessage('String error')).toBe('String error');
      expect(getErrorMessage({})).toBe('予期しないエラーが発生しました');
    });
  });

  describe('formatAddress', () => {
    it('formats address correctly', () => {
      expect(formatAddress('  Tokyo  ')).toBe('Tokyo');
      expect(formatAddress('')).toBe('');
    });
  });
});