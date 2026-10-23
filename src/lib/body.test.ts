import { describe, expect, it } from 'vitest';
import type { BodyEntry } from '../types';
import { bodyChange, bodySeries, createBodyEntry, formatBodyChange, measuredMetrics, sortBodyEntries } from './body';

const entry = (id: string, date: string, values: Partial<Pick<BodyEntry, 'weight' | 'waist' | 'chest' | 'arm'>>): BodyEntry => ({
  id, date, weight: null, waist: null, chest: null, arm: null, note: '', ...values,
});

describe('createBodyEntry', () => {
  const blank = { date: '2026-10-24', weight: '', waist: '', chest: '', arm: '' };

  it('reads decimals with dot or comma and skips empty fields', () => {
    const r = createBodyEntry({ ...blank, weight: '81,45', waist: '84.2' }, 'b1');
    expect(r).toEqual({ ok: true, entry: entry('b1', '2026-10-24', { weight: 81.5, waist: 84.2 }) });
  });

  it('requires at least one value and plausible ranges', () => {
    expect(createBodyEntry(blank, 'b1')).toEqual({ ok: false, errors: ['יש למלא לפחות מדידה אחת.'] });
    const r = createBodyEntry({ ...blank, weight: '8', arm: 'abc' }, 'b1');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors).toHaveLength(2);
  });
});

describe('body series', () => {
  const entries = [
    entry('a', '2026-10-01', { weight: 82.0, waist: 86 }),
    entry('b', '2026-10-08', { weight: 81.4 }),
    entry('c', '2026-10-08', { weight: 81.2 }), // same day, added later → wins
    entry('d', '2026-10-15', { weight: 80.6, arm: 37 }),
  ];

  it('sorts newest first', () => {
    expect(sortBodyEntries(entries).map((e) => e.id)).toEqual(['d', 'c', 'b', 'a']);
  });

  it('keeps one value per date, oldest first', () => {
    expect(bodySeries(entries, 'weight')).toEqual([
      { date: '2026-10-01', value: 82 },
      { date: '2026-10-08', value: 81.2 },
      { date: '2026-10-15', value: 80.6 },
    ]);
    expect(bodySeries(entries, 'chest')).toEqual([]);
  });

  it('reports the change since the previous and the first measurement', () => {
    expect(bodyChange(entries, 'weight')).toEqual({ latest: { date: '2026-10-15', value: 80.6 }, sincePrevious: -0.6, sinceFirst: -1.4 });
    expect(bodyChange(entries, 'arm')).toEqual({ latest: { date: '2026-10-15', value: 37 }, sincePrevious: null, sinceFirst: null });
    expect(bodyChange(entries, 'chest')).toBeNull();
    expect(measuredMetrics(entries)).toEqual(['weight', 'waist', 'arm']);
  });

  it('formats a change with its sign and unit', () => {
    expect(formatBodyChange(0.4, 'weight')).toBe('⁦+0.4⁩ ק"ג');
    expect(formatBodyChange(-1.2, 'waist')).toBe('⁦−1.2⁩ ס"מ');
    expect(formatBodyChange(0, 'weight')).toBe('⁦0⁩ ק"ג');
  });
});
