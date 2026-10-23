import type { BodyEntry } from '../types';
import { formatKg, parseWeight } from './format';
import { BODY_CM_RANGE, BODY_WEIGHT_RANGE } from './schema';

export const BODY_METRICS = ['weight', 'waist', 'chest', 'arm'] as const;
export type BodyMetric = (typeof BODY_METRICS)[number];

export const BODY_METRIC_LABELS_HE: Record<BodyMetric, string> = {
  weight: 'משקל',
  waist: 'מותניים',
  chest: 'חזה',
  arm: 'זרוע',
};

export const BODY_METRIC_UNITS_HE: Record<BodyMetric, string> = {
  weight: 'ק"ג',
  waist: 'ס"מ',
  chest: 'ס"מ',
  arm: 'ס"מ',
};

export interface BodyEntryInput {
  date: string;
  weight: string;
  waist: string;
  chest: string;
  arm: string;
}

export type BodyEntryResult = { ok: true; entry: BodyEntry } | { ok: false; errors: string[] };

/** Validates the form (dot or comma decimals; empty fields are skipped) and builds an entry. */
export function createBodyEntry(input: BodyEntryInput, id: string): BodyEntryResult {
  const errors: string[] = [];
  const read = (metric: BodyMetric): number | null => {
    const value = parseWeight(input[metric]);
    if (value === null) return null;
    const range = metric === 'weight' ? BODY_WEIGHT_RANGE : BODY_CM_RANGE;
    if (Number.isNaN(value) || value < range.min || value > range.max) {
      errors.push(`${BODY_METRIC_LABELS_HE[metric]}: מספר בין ${range.min} ל-${range.max} ${BODY_METRIC_UNITS_HE[metric]}.`);
      return null;
    }
    return Math.round(value * 10) / 10;
  };
  const entry: BodyEntry = {
    id,
    date: input.date,
    weight: read('weight'),
    waist: read('waist'),
    chest: read('chest'),
    arm: read('arm'),
    note: '',
  };
  if (errors.length === 0 && BODY_METRICS.every((m) => entry[m] === null)) {
    errors.push('יש למלא לפחות מדידה אחת.');
  }
  return errors.length > 0 ? { ok: false, errors } : { ok: true, entry };
}

/** Newest first (by date; among the same date, the one added last first). */
export function sortBodyEntries(entries: readonly BodyEntry[]): BodyEntry[] {
  return entries
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => b.entry.date.localeCompare(a.entry.date) || b.index - a.index)
    .map((x) => x.entry);
}

export interface BodyPoint {
  date: string;
  value: number;
}

/** One value per date (the latest entry of that date), oldest first. */
export function bodySeries(entries: readonly BodyEntry[], metric: BodyMetric): BodyPoint[] {
  const byDate = new Map<string, number>();
  for (const e of [...sortBodyEntries(entries)].reverse()) {
    const value = e[metric];
    if (value !== null) byDate.set(e.date, value);
  }
  return [...byDate.entries()].map(([date, value]) => ({ date, value })).sort((a, b) => a.date.localeCompare(b.date));
}

export interface BodyChange {
  latest: BodyPoint;
  /** Change from the previous measurement, or null if there is only one. */
  sincePrevious: number | null;
  /** Change from the first measurement, or null if there is only one. */
  sinceFirst: number | null;
}

export function bodyChange(entries: readonly BodyEntry[], metric: BodyMetric): BodyChange | null {
  const series = bodySeries(entries, metric);
  const latest = series.at(-1);
  if (!latest) return null;
  const round = (n: number) => Math.round(n * 10) / 10;
  const previous = series.at(-2);
  return {
    latest,
    sincePrevious: previous ? round(latest.value - previous.value) : null,
    sinceFirst: series.length > 1 ? round(latest.value - series[0]!.value) : null,
  };
}

/**
 * "+0.4 ק"ג" / "−1.2 ס"מ" / "0 ק"ג", for changes between measurements. The
 * signed number is isolated left-to-right so the sign stays before it in RTL text.
 */
export function formatBodyChange(value: number, metric: BodyMetric): string {
  const sign = value > 0 ? '+' : value < 0 ? '−' : '';
  return `⁦${sign}${formatKg(Math.abs(value))}⁩ ${BODY_METRIC_UNITS_HE[metric]}`;
}

/** Metrics that have at least one value, in display order. */
export function measuredMetrics(entries: readonly BodyEntry[]): BodyMetric[] {
  return BODY_METRICS.filter((m) => entries.some((e) => e[m] !== null));
}
