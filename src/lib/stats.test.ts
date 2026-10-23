import { describe, expect, it } from 'vitest';
import type { SetEntry, Workout, WorkoutExercise } from '../types';
import {
  bestSet,
  countWorkoutsThisWeek,
  estimateOneRepMax,
  percentChange,
  recentHighlights,
  recentVolumes,
  startOfWeek,
  exerciseSessions,
  exerciseStats,
  groupWorkoutsByMonth,
  oneRepMaxProgress,
  recentlyUsedExerciseIds,
  setVolume,
  sortWorkoutsNewestFirst,
  summarizeWorkout,
  totalVolume,
} from './stats';

let n = 0;
const set = (weight: number | null, reps: number): SetEntry => ({ id: `s${++n}`, weight, reps });
const entry = (exerciseId: string, sets: SetEntry[], note = ''): WorkoutExercise => ({
  id: `e${++n}`, exerciseId, note, sets,
});
const workout = (id: string, date: string, exercises: WorkoutExercise[], startedAt = `${date}T10:00:00.000Z`): Workout => ({
  id, date, startedAt, finishedAt: startedAt, note: '', exercises,
});

describe('volume', () => {
  it('is weight × reps summed over sets', () => {
    expect(setVolume(set(100, 5))).toBe(500);
    expect(totalVolume([set(100, 5), set(82.5, 8), set(60, 0)])).toBe(500 + 660);
    expect(totalVolume([])).toBe(0);
  });

  it('counts bodyweight sets without added load as 0', () => {
    expect(totalVolume([set(null, 10), set(10, 8)])).toBe(80);
  });
});

describe('estimateOneRepMax (Epley)', () => {
  it('applies weight × (1 + reps / 30)', () => {
    expect(estimateOneRepMax(100, 10)).toBeCloseTo(133.333, 3);
    expect(estimateOneRepMax(100, 1)).toBeCloseTo(103.333, 3);
    expect(estimateOneRepMax(60, 30)).toBe(120);
    expect(estimateOneRepMax(82.5, 6)).toBeCloseTo(99, 10);
  });

  it('is 0 without reps or load', () => {
    expect(estimateOneRepMax(100, 0)).toBe(0);
    expect(estimateOneRepMax(0, 10)).toBe(0);
  });
});

describe('bestSet', () => {
  it('picks the highest estimated 1RM, not simply the heaviest weight', () => {
    const heavySingle = set(100, 1); // 103.3
    const volumeSet = set(90, 6); // 108
    expect(bestSet([heavySingle, volumeSet])).toBe(volumeSet);
  });

  it('breaks 1RM ties by heavier weight', () => {
    const a = set(60, 30); // 120
    const b = set(100, 6); // 120
    expect(bestSet([a, b])).toBe(b);
  });

  it('picks the most reps for unloaded bodyweight sets', () => {
    const a = set(null, 8);
    const b = set(null, 12);
    expect(bestSet([a, b])).toBe(b);
    expect(bestSet([b, set(5, 6)])?.weight).toBe(5);
  });

  it('ignores zero-rep sets and handles empty input', () => {
    expect(bestSet([])).toBeNull();
    expect(bestSet([set(200, 0)])).toBeNull();
  });
});

describe('date ordering and grouping', () => {
  const w1 = workout('w1', '2026-09-30', []);
  const w2 = workout('w2', '2026-10-02', []);
  const w3a = workout('w3a', '2026-10-20', [], '2026-10-20T06:00:00.000Z');
  const w3b = workout('w3b', '2026-10-20', [], '2026-10-20T18:00:00.000Z');
  const w4 = workout('w4', '2025-10-20', []);

  it('sorts newest first by date then start time, without mutating', () => {
    const input = [w1, w3a, w4, w2, w3b];
    expect(sortWorkoutsNewestFirst(input).map((w) => w.id)).toEqual(['w3b', 'w3a', 'w2', 'w1', 'w4']);
    expect(input.map((w) => w.id)).toEqual(['w1', 'w3a', 'w4', 'w2', 'w3b']);
  });

  it('finds the Sunday that starts the week and counts this week\'s workouts', () => {
    expect(startOfWeek('2026-10-24')).toBe('2026-10-18'); // Saturday → Sunday before
    expect(startOfWeek('2026-10-18')).toBe('2026-10-18'); // Sunday itself
    expect(startOfWeek('2026-11-03')).toBe('2026-11-01'); // across a month
    expect(countWorkoutsThisWeek([w1, w2, w3a, w3b, w4], '2026-10-22')).toBe(2);
    expect(countWorkoutsThisWeek([w1, w2], '2026-10-22')).toBe(0);
  });

  it('groups by month with Hebrew labels, newest first', () => {
    const groups = groupWorkoutsByMonth([w1, w3a, w4, w2, w3b]);
    expect(groups.map((g) => [g.key, g.label, g.workouts.map((w) => w.id)])).toEqual([
      ['2026-10', 'אוקטובר 2026', ['w3b', 'w3a', 'w2']],
      ['2026-09', 'ספטמבר 2026', ['w1']],
      ['2025-10', 'אוקטובר 2025', ['w4']],
    ]);
    expect(groupWorkoutsByMonth([])).toEqual([]);
  });
});

describe('per-exercise history', () => {
  const history = [
    workout('old', '2026-09-01', [entry('bench', [set(80, 5), set(80, 5)]), entry('squat', [set(100, 5)])]),
    workout('mid', '2026-09-15', [entry('bench', [set(85, 5)], 'felt strong')]),
    workout('new', '2026-10-01', [
      entry('bench', [set(90, 3)]),
      entry('bench', [set(70, 10)], 'back-off'),
    ]),
    workout('none', '2026-10-05', [entry('squat', [set(110, 3)])]),
  ];

  it('lists every session newest first with best set and volume', () => {
    const sessions = exerciseSessions(history, 'bench');
    expect(sessions.map((s) => s.workoutId)).toEqual(['new', 'mid', 'old']);
    const [newest, mid, oldest] = sessions;
    // Two entries of the same exercise in one workout are combined.
    expect(newest?.sets).toHaveLength(2);
    expect(newest?.volume).toBe(270 + 700);
    expect(newest?.bestSet?.weight).toBe(90); // 90×3 → 99 beats 70×10 → 93.3
    expect(newest?.note).toBe('back-off');
    expect(mid?.note).toBe('felt strong');
    expect(oldest?.volume).toBe(800);
  });

  it('computes overall best set and total volume', () => {
    const stats = exerciseStats(history, 'bench');
    expect(stats.totalVolume).toBe(800 + 425 + 970);
    expect(stats.totalSets).toBe(5);
    // 85×5 → 99.17 beats the heavier 90×3 → 99.
    expect(stats.bestSet?.weight).toBe(85);
    expect(stats.bestSetDate).toBe('2026-09-15');
  });

  it('returns empty stats for an unused exercise', () => {
    const stats = exerciseStats(history, 'deadlift');
    expect(stats.sessions).toEqual([]);
    expect(stats.bestSet).toBeNull();
    expect(stats.bestSetDate).toBeNull();
    expect(stats.totalVolume).toBe(0);
  });

  it('builds a 1RM progress series oldest first, one point per date', () => {
    const extraSameDay = workout('new-pm', '2026-10-01', [entry('bench', [set(95, 2)])], '2026-10-01T18:00:00.000Z');
    const points = oneRepMaxProgress([...history, extraSameDay], 'bench');
    expect(points.map((p) => p.date)).toEqual(['2026-09-01', '2026-09-15', '2026-10-01']);
    expect(points[0]?.oneRepMax).toBeCloseTo(80 * (1 + 5 / 30));
    // 95×2 → 101.33 (later the same day) beats 90×3 → 99.
    expect(points[2]?.oneRepMax).toBeCloseTo(95 * (1 + 2 / 30));
    expect(points[2]?.set).toMatchObject({ weight: 95, reps: 2 });
  });

  it('leaves unloaded bodyweight sessions out of the 1RM series', () => {
    const bw = [workout('a', '2026-10-01', [entry('pull-up', [set(null, 10)])]),
      workout('b', '2026-10-08', [entry('pull-up', [set(10, 5)])])];
    expect(oneRepMaxProgress(bw, 'pull-up').map((p) => p.date)).toEqual(['2026-10-08']);
  });

  it('builds the volume bars, change and highlights for the home screen', () => {
    expect(recentVolumes(history, 3).map((v) => [v.workoutId, v.volume])).toEqual([
      ['mid', 425], ['new', 970], ['none', 330],
    ]);
    expect(recentVolumes([], 6)).toEqual([]);
    expect(percentChange(970, 330)).toBe(-66);
    expect(percentChange(400, 500)).toBe(25);
    expect(percentChange(0, 500)).toBeNull();
    expect(recentHighlights(history, 2).map((h) => h.exerciseId)).toEqual(['squat', 'bench']);
    expect(recentHighlights(history, 1)[0]?.bestOneRepMax).toBeCloseTo(110 * 1.1);
  });

  it('summarizes a workout and lists recently used exercises', () => {
    expect(summarizeWorkout(history[0]!)).toEqual({ exerciseCount: 2, setCount: 3, volume: 1300 });
    expect(recentlyUsedExerciseIds(history)).toEqual(['squat', 'bench']);
  });
});
