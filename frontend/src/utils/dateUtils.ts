/**
 * 日付を相対的な時間表現に変換
 * @param date - 変換する日付（文字列またはDateオブジェクト）
 * @returns 相対的な時間表現（例: "5分前", "2時間前", "昨日"）
 */
export function formatDistanceToNow(date: string | Date): string {
  const now = new Date();
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  const diffInSeconds = Math.floor((now.getTime() - targetDate.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return `${diffInSeconds}秒`;
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes}分`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours}時間`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays}日`;
  }

  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return `${diffInWeeks}週間`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths}ヶ月`;
  }

  const diffInYears = Math.floor(diffInDays / 365);
  return `${diffInYears}年`;
}

/**
 * 日付を日本語フォーマットに変換
 * @param date - 変換する日付
 * @param format - フォーマット形式
 * @returns フォーマットされた日付文字列
 */
export function formatDate(date: string | Date, format: 'short' | 'long' | 'time' = 'short'): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  switch (format) {
    case 'short':
      return `${d.getFullYear()}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}`;
    case 'long':
      return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
    case 'time':
      return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    default:
      return d.toISOString();
  }
}

/**
 * 営業時間をパース
 * @param timeString - 営業時間文字列（例: "11:00-23:00"）
 * @returns パースされた営業時間オブジェクト
 */
export function parseBusinessHours(timeString: string): { open: string; close: string } | null {
  const match = timeString.match(/(\d{1,2}:\d{2})-(\d{1,2}:\d{2})/);
  if (!match) return null;
  
  return {
    open: match[1],
    close: match[2],
  };
}

/**
 * 現在時刻が営業時間内かチェック
 * @param businessHours - 営業時間オブジェクト
 * @returns 営業中かどうか
 */
export function isOpenNow(businessHours: { [key: string]: string } | undefined): boolean {
  if (!businessHours) return false;
  
  const now = new Date();
  const currentDay = ['日', '月', '火', '水', '木', '金', '土'][now.getDay()];
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  
  const todayHours = businessHours[currentDay];
  if (!todayHours || todayHours === '定休日') return false;
  
  const hours = parseBusinessHours(todayHours);
  if (!hours) return false;
  
  return currentTime >= hours.open && currentTime <= hours.close;
}