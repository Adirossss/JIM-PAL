import { describe, expect, it } from 'vitest';
import { dayNumber, linear, nearestIndex, niceScale } from './chart';

describe('niceScale', () => {
  it('rounds out to clean ticks', () => {
    expect(niceScale(93.3, 108)).toEqual({ min: 90, max: 110, step: 5, ticks: [90, 95, 100, 105, 110] });
    expect(niceScale(40, 47).ticks).toEqual([40, 42, 44, 46, 48]);
    const s = niceScale(0, 950);
    expect(s.ticks).toEqual([0, 250, 500, 750, 1000]);
  });

  it('covers the data range', () => {
    for (const [a, b] of [[12, 13], [40.5, 41], [100, 260], [3, 3000]] as const) {
      const s = niceScale(a, b);
      expect(s.min).toBeLessThanOrEqual(a);
      expect(s.max).toBeGreaterThanOrEqual(b);
      expect(s.ticks.length).toBeGreaterThanOrEqual(2);
      expect(s.ticks.length).toBeLessThanOrEqual(10);
    }
  });

  it('pads a single value and never goes below zero', () => {
    const s = niceScale(100, 100);
    expect(s.min).toBeLessThan(100);
    expect(s.max).toBeGreaterThan(100);
    expect(niceScale(0.5, 0.5).min).toBe(0);
  });

  it('survives non-finite input', () => {
    expect(niceScale(Number.NaN, Number.NaN).ticks.length).toBeGreaterThan(0);
  });
});

describe('dayNumber', () => {
  it('counts calendar days, unaffected by DST', () => {
    expect(dayNumber('2026-03-28') - dayNumber('2026-03-26')).toBe(2); // spans Israeli DST start
    expect(dayNumber('2026-10-25') - dayNumber('2026-10-24')).toBe(1);
    expect(dayNumber('2027-01-01') - dayNumber('2026-12-31')).toBe(1);
  });
});

describe('linear', () => {
  it('maps domain to range, including reversed ranges', () => {
    const y = linear(0, 100, 200, 0);
    expect(y(0)).toBe(200);
    expect(y(50)).toBe(100);
    expect(linear(5, 5, 0, 10)(5)).toBe(5);
  });
});

describe('nearestIndex', () => {
  it('finds the closest value', () => {
    expect(nearestIndex([0, 10, 20], 14)).toBe(1);
    expect(nearestIndex([0, 10, 20], 16)).toBe(2);
    expect(nearestIndex([0, 10, 20], -5)).toBe(0);
    expect(nearestIndex([], 3)).toBe(-1);
  });
});
