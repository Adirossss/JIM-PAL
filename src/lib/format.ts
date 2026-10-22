/** Local calendar date as YYYY-MM-DD (not UTC, so late-evening workouts keep their date). */
export function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** True for a real calendar date in YYYY-MM-DD form (rejects 2024-02-30). */
export function isValidDateString(value: string): boolean {
  const m = DATE_RE.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(y, mo - 1, d);
  return date.getFullYear() === y && date.getMonth() === mo - 1 && date.getDate() === d;
}

/** "2026-10-22" → "22.10.2026" (the common Israeli format). */
export function formatDateHe(value: string): string {
  const m = DATE_RE.exec(value);
  if (!m) return value;
  return `${Number(m[3])}.${Number(m[2])}.${m[1]}`;
}

const HEBREW_WEEKDAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

/** "2026-10-22" → "יום חמישי" */
export function weekdayHe(value: string): string {
  const m = DATE_RE.exec(value);
  if (!m) return '';
  const day = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getDay();
  return `יום ${HEBREW_WEEKDAYS[day]}`;
}

/**
 * Parses a weight typed by the user. Accepts "." or "," as the decimal
 * separator. Returns null for empty input and NaN for anything invalid.
 */
export function parseWeight(text: string): number | null {
  const t = text.trim().replace(',', '.');
  if (t === '') return null;
  if (!/^\d+(\.\d+)?$|^\.\d+$/.test(t)) return Number.NaN;
  return Number(t);
}

/** Parses a rep count: a non-negative whole number, or NaN. */
export function parseReps(text: string): number {
  const t = text.trim();
  if (!/^\d+$/.test(t)) return Number.NaN;
  return Number(t);
}

/** 82.5 → "82.5", 80 → "80", 0.125 → "0.13" */
export function formatKg(value: number): string {
  return String(Math.round(value * 100) / 100);
}

/** Large totals with thousands separators: 12345.67 → "12,345.7" */
export function formatTotal(value: number): string {
  return value.toLocaleString('en-US', { maximumFractionDigits: 1 });
}
