/** Format a Date to YYYY-MM-DD */
export function formatDate(date: Date): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/** Get today's date as YYYY-MM-DD */
export function getToday(): string {
  return formatDate(new Date());
}

/** Format a date string for display (e.g. "2026-04-06" -> "2026年04月06日") */
export function formatDateDisplay(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  return `${y}年${m}月${d}日`;
}

/** Format an ISO datetime to a short time string (HH:mm) */
export function formatTime(isoStr?: string): string {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

/** Get the date string for N days offset from today */
export function offsetDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return formatDate(d);
}

/** Get weekday name for a date string */
export function getWeekday(dateStr: string): string {
  const days = ['日', '一', '二', '三', '四', '五', '六'];
  const d = new Date(dateStr);
  return `周${days[d.getDay()]}`;
}
