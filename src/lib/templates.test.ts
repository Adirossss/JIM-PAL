import { describe, expect, it } from 'vitest';
import type { Workout } from '../types';
import { createTemplate, sortTemplates, toggleFavorite } from './templates';
import { startWorkoutWith } from './workout';

const NOW = new Date('2026-10-23T12:00:00.000Z');

const workout: Workout = {
  id: 'w1', date: '2026-10-23', startedAt: '2026-10-23T10:00:00.000Z', finishedAt: '2026-10-23T11:00:00.000Z', note: '',
  exercises: [
    { id: 'a', exerciseId: 'squat', note: '', sets: [{ id: 's1', weight: 100, reps: 5 }] },
    { id: 'b', exerciseId: 'leg-press', note: '', sets: [] },
    { id: 'c', exerciseId: 'squat', note: '', sets: [{ id: 's2', weight: 80, reps: 8 }] },
  ],
};

describe('toggleFavorite', () => {
  it('adds new favorites first and removes existing ones', () => {
    expect(toggleFavorite([], 'bench')).toEqual(['bench']);
    expect(toggleFavorite(['bench'], 'squat')).toEqual(['squat', 'bench']);
    expect(toggleFavorite(['squat', 'bench'], 'squat')).toEqual(['bench']);
  });
});

describe('createTemplate', () => {
  it('keeps each exercise once, in order, with a trimmed name', () => {
    expect(createTemplate('  יום רגליים ', workout, 't1', NOW)).toEqual({
      ok: true,
      template: { id: 't1', name: 'יום רגליים', exerciseIds: ['squat', 'leg-press'], createdAt: NOW.toISOString() },
    });
  });

  it('requires a name of reasonable length and at least one exercise', () => {
    expect(createTemplate('   ', workout, 't1', NOW).ok).toBe(false);
    expect(createTemplate('x'.repeat(61), workout, 't1', NOW).ok).toBe(false);
    expect(createTemplate('ריק', { ...workout, exercises: [] }, 't1', NOW).ok).toBe(false);
  });
});

describe('templates', () => {
  it('sorts newest first and starts a workout from a template', () => {
    const a = { id: 'a', name: 'A', exerciseIds: ['x'], createdAt: '2026-10-01T00:00:00.000Z' };
    const b = { id: 'b', name: 'B', exerciseIds: ['y'], createdAt: '2026-10-20T00:00:00.000Z' };
    expect(sortTemplates([a, b]).map((t) => t.id)).toEqual(['b', 'a']);

    let n = 0;
    const w = startWorkoutWith(['squat', 'leg-press', 'squat'], NOW, '2026-10-23', () => `id${++n}`);
    expect(w.exercises.map((e) => e.exerciseId)).toEqual(['squat', 'leg-press']);
    expect(w.exercises.every((e) => e.sets.length === 0)).toBe(true);
    expect(w.finishedAt).toBeNull();
  });
});
