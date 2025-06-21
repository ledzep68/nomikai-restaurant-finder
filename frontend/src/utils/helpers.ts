import { RECOMMENDATION_LABELS, PLATFORM_LABELS } from './constants';

export const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    minimumFractionDigits: 0,
  }).format(price);
};

export const formatPriceRange = (min: number, max: number): string => {
  if (max >= 999999) {
    return `${formatPrice(min)}～`;
  }
  return `${formatPrice(min)}～${formatPrice(max)}`;
};

export const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return '';
    }
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return '';
  }
};

export const formatDateShort = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return '';
    }
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  } catch {
    return '';
  }
};

export const getRecommendationLabel = (
  recommendation: keyof typeof RECOMMENDATION_LABELS
): string => {
  return RECOMMENDATION_LABELS[recommendation] || '';
};

export const getPlatformLabel = (
  platform: keyof typeof PLATFORM_LABELS
): string => {
  return PLATFORM_LABELS[platform] || platform;
};

export const generateStarRating = (rating: number): string => {
  const clampedRating = Math.max(0, Math.min(5, rating));
  const rounded = Math.round(clampedRating);
  const fullStars = rounded;
  const emptyStars = 5 - fullStars;
  
  return '★'.repeat(fullStars) + '☆'.repeat(emptyStars);
};

export const truncateText = (text: string | undefined, maxLength: number): string => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password: string): boolean => {
  return password.length >= 8;
};

export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const axiosError = error as any;
    if (axiosError.response?.data?.message) {
      return axiosError.response.data.message;
    }
  }
  return '予期しないエラーが発生しました';
};

export const debounce = <T extends (...args: unknown[]) => void>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

export const formatAddress = (address: string): string => {
  if (!address) return '';
  return address.trim();
};