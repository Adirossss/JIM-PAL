import { describe, expect, it } from 'vitest';
import {
  formatDateHe,
  formatKg,
  formatTotal,
  isValidDateString,
  parseReps,
  parseWeight,
  relativeDayHe,
  toLocalDateString,
  weekdayHe,
} from './format';

describe('dates', () => {
  it('formats a local date as YYYY-MM-DD with padding', () => {
    expect(toLocalDateString(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    expect(toLocalDateString(new Date(2026, 11, 31, 0, 0))).toBe('2026-12-31');
  });

  it('validates real calendar dates only', () => {
    expect(isValidDateString('2026-10-22')).toBe(true);
    expect(isValidDateString('2024-02-29')).toBe(true);
    expect(isValidDateString('2025-02-29')).toBe(false);
    expect(isValidDateString('2026-13-01')).toBe(false);
    expect(isValidDateString('2026-1-01')).toBe(false);
    expect(isValidDateString('22/10/2026')).toBe(false);
    expect(isValidDateString('')).toBe(false);
  });

  it('says today / yesterday when it can', () => {
    expect(relativeDayHe('2026-10-24', '2026-10-24')).toBe('היום');
    expect(relativeDayHe('2026-10-23', '2026-10-24')).toBe('אתמול');
    expect(relativeDayHe('2026-10-31', '2026-11-01')).toBe('אתמול');
    expect(relativeDayHe('2026-10-20', '2026-10-24')).toBe('20.10.2026');
  });

  it('formats dates for display in Hebrew', () => {
    expect(formatDateHe('2026-10-02')).toBe('2.10.2026');
    expect(formatDateHe('garbage')).toBe('garbage');
    expect(weekdayHe('2026-10-22')).toBe('יום חמישי');
    expect(weekdayHe('2026-10-24')).toBe('יום שבת');
  });
});

describe('parseWeight', () => {
  it('accepts whole numbers and decimals with dot or comma', () => {
    expect(parseWeight('80')).toBe(80);
    expect(parseWeight(' 82.5 ')).toBe(82.5);
    expect(parseWeight('82,5')).toBe(82.5);
    expect(parseWeight('.5')).toBe(0.5);
    expect(parseWeight('0')).toBe(0);
  });

  it('returns null for empty input', () => {
    expect(parseWeight('')).toBeNull();
    expect(parseWeight('   ')).toBeNull();
  });

  it('returns NaN for invalid input', () => {
    expect(parseWeight('-5')).toBeNaN();
    expect(parseWeight('abc')).toBeNaN();
    expect(parseWeight('1.2.3')).toBeNaN();
    expect(parseWeight('5.')).toBeNaN();
    expect(parseWeight('1e3')).toBeNaN();
  });
});

describe('parseReps', () => {
  it('accepts non-negative whole numbers only', () => {
    expect(parseReps('8')).toBe(8);
    expect(parseReps(' 12 ')).toBe(12);
    expect(parseReps('0')).toBe(0);
    expect(parseReps('')).toBeNaN();
    expect(parseReps('8.5')).toBeNaN();
    expect(parseReps('-1')).toBeNaN();
  });
});

describe('formatKg', () => {
  it('drops trailing zeros and rounds to 2 decimals', () => {
    expect(formatKg(80)).toBe('80');
    expect(formatKg(82.5)).toBe('82.5');
    expect(formatKg(106.66666)).toBe('106.67');
  });

  it('formats totals with thousands separators', () => {
    expect(formatTotal(12345.67)).toBe('12,345.7');
    expect(formatTotal(950)).toBe('950');
    expect(formatTotal(0)).toBe('0');
  });
});
