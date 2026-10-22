import { describe, expect, it } from 'vitest';
import { SEED_EXERCISES } from '../data/exercises';
import { EQUIPMENT_TYPES, MUSCLE_GROUPS, type Exercise } from '../types';
import {
  createCustomExercise,
  indexExercises,
  mergeExercises,
  normalizeSearchText,
  searchExercises,
  type CustomExerciseInput,
} from './exercises';

describe('seed exercise library', () => {
  it('has at least 120 exercises', () => {
    expect(SEED_EXERCISES.length).toBeGreaterThanOrEqual(120);
  });

  it('has unique ids and unique names in both languages', () => {
    const ids = SEED_EXERCISES.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    const en = SEED_EXERCISES.map((e) => e.nameEn.toLowerCase());
    expect(new Set(en).size).toBe(en.length);
    const he = SEED_EXERCISES.map((e) => e.nameHe);
    expect(new Set(he).size).toBe(he.length);
  });

  it('covers every muscle group as a primary muscle', () => {
    for (const m of MUSCLE_GROUPS) {
      expect(SEED_EXERCISES.some((e) => e.primaryMuscle === m), m).toBe(true);
    }
  });

  it('uses every equipment type, with a real mix of machine and free-weight', () => {
    for (const eq of EQUIPMENT_TYPES) {
      expect(SEED_EXERCISES.some((e) => e.equipment === eq), eq).toBe(true);
    }
    expect(SEED_EXERCISES.filter((e) => e.equipment === 'machine').length).toBeGreaterThanOrEqual(25);
    expect(SEED_EXERCISES.filter((e) => e.equipment === 'free_weight').length).toBeGreaterThanOrEqual(25);
  });

  it('includes the exercises named in the requirements', () => {
    const ids = new Set(SEED_EXERCISES.map((e) => e.id));
    for (const id of [
      'leg-press', 'chest-press-machine', 'lat-pulldown', 'seated-cable-row', 'leg-extension',
      'lying-leg-curl', 'pec-deck', 'barbell-bench-press', 'back-squat', 'deadlift',
      'dumbbell-curl', 'romanian-deadlift',
    ]) {
      expect(ids.has(id), id).toBe(true);
    }
  });

  it('has well-formed entries', () => {
    for (const e of SEED_EXERCISES) {
      expect(e.id).toMatch(/^[a-z0-9-]+$/);
      expect(e.nameEn.trim()).not.toBe('');
      expect(e.nameHe).toMatch(/[֐-׿]/);
      expect(MUSCLE_GROUPS).toContain(e.primaryMuscle);
      expect(EQUIPMENT_TYPES).toContain(e.equipment);
      for (const s of e.secondaryMuscles) expect(MUSCLE_GROUPS).toContain(s);
      expect(e.secondaryMuscles).not.toContain(e.primaryMuscle);
      expect(new Set(e.secondaryMuscles).size).toBe(e.secondaryMuscles.length);
      expect(e.custom).toBeFalsy();
    }
  });
});

describe('normalizeSearchText', () => {
  it('lower-cases, strips punctuation and collapses spaces', () => {
    expect(normalizeSearchText('  Pull-Up  ')).toBe('pull up');
    expect(normalizeSearchText("Farmer's Walk")).toBe('farmer s walk');
    expect(normalizeSearchText("סמית'")).toBe('סמית');
    expect(normalizeSearchText('הרמת ירך-ישבן (GHR)')).toBe('הרמת ירך ישבן ghr');
  });
});

describe('searchExercises', () => {
  const all = mergeExercises([]);

  it('returns everything for an empty filter', () => {
    expect(searchExercises(all, {})).toHaveLength(all.length);
    expect(searchExercises(all, { query: '   ' })).toHaveLength(all.length);
  });

  it('finds by English name, case-insensitively', () => {
    const ids = searchExercises(all, { query: 'LEG PRESS' }).map((e) => e.id);
    expect(ids).toContain('leg-press');
    expect(ids[0]).toBe('leg-press');
  });

  it('finds by Hebrew name', () => {
    const ids = searchExercises(all, { query: 'לחיצת רגליים' }).map((e) => e.id);
    expect(ids).toContain('leg-press');
  });

  it('matches across hyphens and partial words', () => {
    expect(searchExercises(all, { query: 'pull up' }).map((e) => e.id)).toContain('pull-up');
    expect(searchExercises(all, { query: 'pulldown lat' }).map((e) => e.id)).toContain('lat-pulldown');
    expect(searchExercises(all, { query: 'סמית' }).length).toBeGreaterThanOrEqual(4);
  });

  it('filters by primary muscle and equipment, combined with a query', () => {
    const machinesForChest = searchExercises(all, { muscle: 'chest', equipment: 'machine' });
    expect(machinesForChest.length).toBeGreaterThan(0);
    expect(machinesForChest.every((e) => e.primaryMuscle === 'chest' && e.equipment === 'machine')).toBe(true);

    const curls = searchExercises(all, { query: 'curl', equipment: 'cable' });
    expect(curls.length).toBeGreaterThan(0);
    expect(curls.every((e) => e.equipment === 'cable')).toBe(true);
  });

  it('returns nothing for a non-matching query', () => {
    expect(searchExercises(all, { query: 'zzzz' })).toEqual([]);
  });

  it('includes custom exercises', () => {
    const custom: Exercise = {
      id: 'custom-1', nameEn: 'Zercher Squat', nameHe: 'סקוואט זרכר',
      primaryMuscle: 'quads', secondaryMuscles: [], equipment: 'free_weight', custom: true,
    };
    const merged = mergeExercises([custom]);
    expect(merged).toHaveLength(SEED_EXERCISES.length + 1);
    expect(searchExercises(merged, { query: 'זרכר' })).toEqual([custom]);
    expect(indexExercises(merged).get('custom-1')).toBe(custom);
  });
});

describe('createCustomExercise', () => {
  const base: CustomExerciseInput = {
    nameEn: 'Zercher Squat',
    nameHe: 'סקוואט זרכר',
    primaryMuscle: 'quads',
    secondaryMuscles: ['glutes', 'quads', 'core'],
    equipment: 'free_weight',
  };

  it('creates a valid custom exercise and drops the primary from secondaries', () => {
    const r = createCustomExercise(base, SEED_EXERCISES, 'c1');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.exercise).toEqual({
      id: 'c1', nameEn: 'Zercher Squat', nameHe: 'סקוואט זרכר', primaryMuscle: 'quads',
      secondaryMuscles: ['glutes', 'core'], equipment: 'free_weight', custom: true,
    });
  });

  it('fills a missing name from the other language', () => {
    const r = createCustomExercise({ ...base, nameEn: '  ' }, SEED_EXERCISES, 'c1');
    expect(r.ok && r.exercise.nameEn).toBe('סקוואט זרכר');
  });

  it('rejects missing names, muscle and equipment', () => {
    const r = createCustomExercise(
      { nameEn: '', nameHe: '', primaryMuscle: '', secondaryMuscles: [], equipment: '' },
      SEED_EXERCISES,
      'c1',
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors).toHaveLength(3);
  });

  it('rejects a name that already exists', () => {
    const r = createCustomExercise({ ...base, nameEn: 'leg press', nameHe: '' }, SEED_EXERCISES, 'c1');
    expect(r.ok).toBe(false);
  });
});
