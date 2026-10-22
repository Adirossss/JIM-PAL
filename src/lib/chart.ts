/**
 * Axis helpers for the SVG progress chart (presentation math only, no DOM).
 */

export interface NiceScale {
  min: number;
  max: number;
  step: number;
  ticks: number[];
}

/**
 * Rounds a value range out to clean tick values (steps of 1, 2, 2.5 or 5 ×
 * 10^n), never below 0. A flat range is padded so a single value sits mid-chart.
 */
export function niceScale(dataMin: number, dataMax: number, targetTicks = 4): NiceScale {
  let lo = Math.min(dataMin, dataMax);
  let hi = Math.max(dataMin, dataMax);
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) {
    lo = 0;
    hi = 1;
  }
  if (hi - lo < 1e-9) {
    const pad = Math.max(Math.abs(hi) * 0.1, 1);
    lo -= pad;
    hi += pad;
  }
  lo = Math.max(0, lo);

  const rawStep = (hi - lo) / Math.max(1, targetTicks);
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalized = rawStep / magnitude;
  const factor = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 2.5 ? 2.5 : normalized <= 5 ? 5 : 10;
  const step = factor * magnitude;

  const min = Math.floor(lo / step) * step;
  const max = Math.ceil(hi / step) * step;
  const ticks: number[] = [];
  for (let v = min; v <= max + step / 2; v += step) {
    ticks.push(Math.round(v * 1e6) / 1e6);
  }
  return { min: ticks[0] ?? min, max: ticks[ticks.length - 1] ?? max, step, ticks };
}

/** Day number for a YYYY-MM-DD date (UTC-based, so DST never skews spacing). */
export function dayNumber(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return Math.round(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1) / 86_400_000);
}

/** Linear map from [d0, d1] to [r0, r1]; a zero-width domain maps to the middle. */
export function linear(d0: number, d1: number, r0: number, r1: number): (v: number) => number {
  if (d1 === d0) return () => (r0 + r1) / 2;
  return (v) => r0 + ((v - d0) / (d1 - d0)) * (r1 - r0);
}

/** Index of the value in a sorted list closest to `target`. -1 for an empty list. */
export function nearestIndex(sortedValues: readonly number[], target: number): number {
  let best = -1;
  let bestDist = Infinity;
  sortedValues.forEach((v, i) => {
    const dist = Math.abs(v - target);
    if (dist < bestDist) {
      best = i;
      bestDist = dist;
    }
  });
  return best;
}
