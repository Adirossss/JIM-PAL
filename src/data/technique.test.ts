import { describe, expect, it } from 'vitest';
import { SEED_EXERCISES } from './exercises';
import { TECHNIQUE, demoVideoUrl } from './technique';

describe('technique', () => {
  it('covers every built-in exercise with 3–5 cues and 1–3 mistakes', () => {
    const missing = SEED_EXERCISES.filter((e) => !TECHNIQUE[e.id]).map((e) => e.id);
    expect(missing).toEqual([]);
    for (const e of SEED_EXERCISES) {
      const { cues, mistakes } = TECHNIQUE[e.id]!;
      expect(cues.length, e.id).toBeGreaterThanOrEqual(3);
      expect(cues.length, e.id).toBeLessThanOrEqual(5);
      expect(mistakes.length, e.id).toBeGreaterThanOrEqual(1);
      expect(mistakes.length, e.id).toBeLessThanOrEqual(3);
      expect(new Set(cues).size, `${e.id} repeats a cue`).toBe(cues.length);
      expect([...cues, ...mistakes].every((s) => s.trim().length > 0), e.id).toBe(true);
    }
  });

  it('has no entries for unknown exercises', () => {
    const ids = new Set(SEED_EXERCISES.map((e) => e.id));
    expect(Object.keys(TECHNIQUE).filter((id) => !ids.has(id))).toEqual([]);
  });

  it('builds a YouTube search link', () => {
    expect(demoVideoUrl("Farmer's Walk")).toBe('https://www.youtube.com/results?search_query=Farmer\'s%20Walk%20proper%20form');
  });
});
