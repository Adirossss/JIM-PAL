import { describe, expect, it } from 'vitest';
import type { Workout } from '../types';
import {
  addExercise,
  addSet,
  deleteSet,
  duplicateLastSet,
  finishWorkout,
  lastLoggedSet,
  moveExercise,
  removeExercise,
  setExerciseNote,
  setToInputText,
  setWorkoutDate,
  setWorkoutNote,
  startWorkout,
  startWorkoutFrom,
  suggestNextExercises,
  suggestNextSet,
  stepReps,
  stepWeight,
  updateSet,
  validateSetInput,
} from './workout';

function ids() {
  let i = 0;
  return () => `id${++i}`;
}

const NOW = new Date(2026, 9, 22, 18, 30);

function workoutWithBench(): Workout {
  const newId = ids();
  let w = startWorkout(NOW, undefined, newId); // id1
  w = addExercise(w, 'bench', newId); // entry id2
  w = addSet(w, 'id2', { weight: 80, reps: 8 }, newId); // set id3
  w = addSet(w, 'id2', { weight: 82.5, reps: 6 }, newId); // set id4
  return w;
}

describe('startWorkout', () => {
  it('defaults the date to the local date and starts unfinished', () => {
    const w = startWorkout(NOW, undefined, ids());
    expect(w).toEqual({
      id: 'id1', date: '2026-10-22', startedAt: NOW.toISOString(), finishedAt: null, note: '', exercises: [],
    });
  });

  it('accepts an explicit date', () => {
    expect(startWorkout(NOW, '2026-10-01', ids()).date).toBe('2026-10-01');
  });
});

describe('editing a workout', () => {
  it('adds, edits and deletes sets without mutating the original', () => {
    const w = workoutWithBench();
    expect(w.exercises[0]?.sets).toEqual([
      { id: 'id3', weight: 80, reps: 8 },
      { id: 'id4', weight: 82.5, reps: 6 },
    ]);

    const edited = updateSet(w, 'id2', 'id3', { weight: 85, reps: 5 });
    expect(edited.exercises[0]?.sets[0]).toEqual({ id: 'id3', weight: 85, reps: 5 });
    expect(w.exercises[0]?.sets[0]).toEqual({ id: 'id3', weight: 80, reps: 8 });

    const deleted = deleteSet(edited, 'id2', 'id4');
    expect(deleted.exercises[0]?.sets.map((s) => s.id)).toEqual(['id3']);
  });

  it('sets notes on the workout and on an exercise', () => {
    let w = workoutWithBench();
    w = setWorkoutNote(w, 'leg day tomorrow');
    w = setExerciseNote(w, 'id2', 'pause reps');
    w = setWorkoutDate(w, '2026-10-21');
    expect(w.note).toBe('leg day tomorrow');
    expect(w.exercises[0]?.note).toBe('pause reps');
    expect(w.date).toBe('2026-10-21');
  });

  it('removes and reorders exercises', () => {
    const newId = ids();
    let w = startWorkout(NOW, undefined, newId);
    w = addExercise(w, 'a', newId); // id2
    w = addExercise(w, 'b', newId); // id3
    w = addExercise(w, 'c', newId); // id4
    expect(moveExercise(w, 'id4', -1).exercises.map((e) => e.exerciseId)).toEqual(['a', 'c', 'b']);
    expect(moveExercise(w, 'id2', -1)).toBe(w);
    expect(moveExercise(w, 'id4', 1)).toBe(w);
    expect(removeExercise(w, 'id3').exercises.map((e) => e.exerciseId)).toEqual(['a', 'c']);
  });
});

describe('lastLoggedSet (pre-fill source)', () => {
  const history: Workout[] = [
    { id: 'h1', date: '2026-10-01', startedAt: '2026-10-01T10:00:00Z', finishedAt: '2026-10-01T11:00:00Z', note: '',
      exercises: [{ id: 'x', exerciseId: 'bench', note: '', sets: [{ id: 'a', weight: 70, reps: 10 }] }] },
    { id: 'h2', date: '2026-10-15', startedAt: '2026-10-15T10:00:00Z', finishedAt: '2026-10-15T11:00:00Z', note: '',
      exercises: [{ id: 'y', exerciseId: 'bench', note: '', sets: [
        { id: 'b', weight: 77.5, reps: 8 }, { id: 'c', weight: 75, reps: 9 },
      ] }] },
  ];

  it('uses the last set of the exercise in the current workout first', () => {
    expect(lastLoggedSet('bench', workoutWithBench(), history)).toEqual({ id: 'id4', weight: 82.5, reps: 6 });
  });

  it('falls back to the last set of the most recent past session', () => {
    const fresh = addExercise(startWorkout(NOW, undefined, ids()), 'bench', ids());
    expect(lastLoggedSet('bench', fresh, history)?.id).toBe('c');
    expect(lastLoggedSet('bench', null, [...history].reverse())?.id).toBe('c');
  });

  it('returns null for a never-logged exercise', () => {
    expect(lastLoggedSet('squat', workoutWithBench(), history)).toBeNull();
  });

  it('converts a set to form text', () => {
    expect(setToInputText({ id: 's', weight: 82.5, reps: 6 })).toEqual({ weight: '82.5', reps: '6' });
    expect(setToInputText({ id: 's', weight: null, reps: 12 })).toEqual({ weight: '', reps: '12' });
    expect(setToInputText(null)).toEqual({ weight: '', reps: '' });
  });
});

describe('duplicateLastSet', () => {
  it('copies the last set of the entry with a new id', () => {
    const w = duplicateLastSet(workoutWithBench(), 'id2', [], () => 'dup');
    expect(w.exercises[0]?.sets.at(-1)).toEqual({ id: 'dup', weight: 82.5, reps: 6 });
    expect(w.exercises[0]?.sets).toHaveLength(3);
  });

  it('copies from history when the entry has no sets yet', () => {
    const history = [workoutWithBench()];
    const fresh = addExercise(startWorkout(NOW, undefined, () => 'w2'), 'bench', () => 'e2');
    const w = duplicateLastSet(fresh, 'e2', history, () => 'dup');
    expect(w.exercises[0]?.sets).toEqual([{ id: 'dup', weight: 82.5, reps: 6 }]);
  });

  it('does nothing when there is nothing to copy', () => {
    const fresh = addExercise(startWorkout(NOW, undefined, () => 'w2'), 'squat', () => 'e2');
    expect(duplicateLastSet(fresh, 'e2', [], () => 'dup')).toBe(fresh);
    expect(duplicateLastSet(fresh, 'missing', [], () => 'dup')).toBe(fresh);
  });
});

describe('validateSetInput', () => {
  it('accepts decimal weights with dot or comma', () => {
    expect(validateSetInput('82,5', '6', 'free_weight')).toEqual({ ok: true, values: { weight: 82.5, reps: 6 } });
    expect(validateSetInput('40.25', '10', 'machine')).toEqual({ ok: true, values: { weight: 40.25, reps: 10 } });
  });

  it('requires weight except for bodyweight exercises', () => {
    expect(validateSetInput('', '8', 'machine').ok).toBe(false);
    expect(validateSetInput('', '8', 'bodyweight')).toEqual({ ok: true, values: { weight: null, reps: 8 } });
    expect(validateSetInput('10', '8', 'bodyweight')).toEqual({ ok: true, values: { weight: 10, reps: 8 } });
    expect(validateSetInput('0', '8', 'bodyweight')).toEqual({ ok: true, values: { weight: null, reps: 8 } });
  });

  it('rejects invalid weight and reps', () => {
    expect(validateSetInput('-5', '8', 'cable').ok).toBe(false);
    expect(validateSetInput('abc', '8', 'cable').ok).toBe(false);
    expect(validateSetInput('1001', '8', 'cable').ok).toBe(false);
    expect(validateSetInput('50', '0', 'cable').ok).toBe(false);
    expect(validateSetInput('50', '7.5', 'cable').ok).toBe(false);
    expect(validateSetInput('50', '', 'cable').ok).toBe(false);
  });
});

describe('repeat and suggestions', () => {
  const set = (weight: number, reps: number, id: string) => ({ id, weight, reps });
  const past = (id: string, date: string, ids: string[]): Workout => ({
    id, date, startedAt: `${date}T10:00:00.000Z`, finishedAt: `${date}T11:00:00.000Z`, note: '',
    exercises: ids.map((exerciseId, i) => ({ id: `${id}-${i}`, exerciseId, note: '', sets: [set(50, 10, `${id}-${i}-s`)] })),
  });
  const chestDay = past('chest', '2026-10-15', ['bench', 'incline', 'fly', 'pushdown']);
  const legDay = past('legs', '2026-10-20', ['squat', 'leg-press', 'bench']);

  it('starts a workout with the same exercises, once each, and no sets', () => {
    const withDup: Workout = { ...chestDay, exercises: [...chestDay.exercises, chestDay.exercises[0]!] };
    const w = startWorkoutFrom(withDup, NOW, undefined, ids());
    expect(w.date).toBe('2026-10-22');
    expect(w.finishedAt).toBeNull();
    expect(w.exercises.map((e) => e.exerciseId)).toEqual(['bench', 'incline', 'fly', 'pushdown']);
    expect(w.exercises.every((e) => e.sets.length === 0 && e.note === '')).toBe(true);
  });

  it('suggests what followed the current exercise last time, after-first', () => {
    let w = addExercise(startWorkout(NOW, undefined, () => 'cur'), 'incline', () => 'e1');
    expect(suggestNextExercises(w, [chestDay, legDay])).toBeNull(); // no sets yet
    w = addSet(w, 'e1', { weight: 30, reps: 10 }, () => 's1');
    const s = suggestNextExercises(w, [chestDay, legDay]);
    expect(s?.sourceDate).toBe('2026-10-15');
    expect(s?.afterExerciseId).toBe('incline');
    expect(s?.items.map((i) => i.exerciseId)).toEqual(['fly', 'pushdown', 'bench']);
    expect(suggestNextExercises(w, [chestDay], 2)?.items).toHaveLength(2);
  });

  it('uses the most recent workout with the exercise and skips ones already added', () => {
    let w = addExercise(startWorkout(NOW, undefined, () => 'cur'), 'bench', () => 'e1');
    w = addSet(w, 'e1', { weight: 80, reps: 8 }, () => 's1');
    w = addExercise(w, 'squat', () => 'e2');
    // 'bench' was last done on leg day (newest): after it nothing, before it squat (added) and leg-press.
    expect(suggestNextExercises(w, [chestDay, legDay])?.items.map((i) => i.exerciseId)).toEqual(['leg-press']);
  });

  it('returns null when there is nothing new to suggest', () => {
    let w = addExercise(startWorkout(NOW, undefined, () => 'cur'), 'deadlift', () => 'e1');
    w = addSet(w, 'e1', { weight: 120, reps: 5 }, () => 's1');
    expect(suggestNextExercises(w, [chestDay, legDay])).toBeNull(); // never done before
    expect(suggestNextExercises(w, [])).toBeNull();
  });
});

describe('suggestNextSet (progressive overload)', () => {
  const session = (date: string, exerciseId: string, sets: Array<[number | null, number, boolean?]>): Workout => ({
    id: `w-${date}`, date, startedAt: `${date}T10:00:00.000Z`, finishedAt: `${date}T11:00:00.000Z`, note: '',
    exercises: [{ id: `e-${date}`, exerciseId, note: '', sets: sets.map(([weight, reps, drop], i) => ({ id: `s${i}`, weight, reps, ...(drop ? { drop } : {}) })) }],
  });

  it('adds 2.5 kg when two or more top-weight sets held their reps', () => {
    const s = suggestNextSet('bench', [session('2026-10-20', 'bench', [[80, 8], [82.5, 6], [82.5, 6]])], 'free_weight');
    expect(s).toEqual({ weight: 85, reps: 6, kind: 'increase', basis: { weight: 82.5, reps: 6, sets: 2, date: '2026-10-20' } });
  });

  it('aims for one more rep when the top weight was a single set or reps dropped', () => {
    expect(suggestNextSet('lp', [session('2026-10-20', 'lp', [[140, 10], [150, 8], [160, 6]])], 'machine'))
      .toMatchObject({ weight: 160, reps: 7, kind: 'add-rep' });
    expect(suggestNextSet('row', [session('2026-10-20', 'row', [[60, 10], [60, 8]])], 'cable'))
      .toMatchObject({ weight: 60, reps: 9, kind: 'add-rep' });
  });

  it('uses the most recent session and ignores drop sets', () => {
    const history = [
      session('2026-10-10', 'bench', [[70, 10], [70, 10]]),
      session('2026-10-20', 'bench', [[80, 8], [80, 8], [60, 12, true]]),
    ];
    expect(suggestNextSet('bench', history, 'free_weight')).toMatchObject({ weight: 82.5, reps: 8, kind: 'increase' });
  });

  it('handles bodyweight with and without added load', () => {
    expect(suggestNextSet('pu', [session('2026-10-20', 'pu', [[null, 10], [null, 10]])], 'bodyweight'))
      .toMatchObject({ weight: null, reps: 11, kind: 'add-rep' });
    expect(suggestNextSet('pu', [session('2026-10-20', 'pu', [[null, 10], [10, 6], [10, 6]])], 'bodyweight'))
      .toMatchObject({ weight: 12.5, reps: 6, kind: 'increase' });
  });

  it('returns null without history', () => {
    expect(suggestNextSet('bench', [], 'free_weight')).toBeNull();
  });
});

describe('steppers', () => {
  it('moves the weight by the step, never below zero', () => {
    expect(stepWeight('80', 2.5, 'free_weight')).toBe('82.5');
    expect(stepWeight('82,5', -2.5, 'machine')).toBe('80');
    expect(stepWeight('', 2.5, 'cable')).toBe('2.5');
    expect(stepWeight('1', -2.5, 'machine')).toBe('0');
    expect(stepWeight('abc', 2.5, 'machine')).toBe('2.5');
    expect(stepWeight('999', 2.5, 'machine')).toBe('1000');
  });

  it('shows no added load as empty on bodyweight exercises', () => {
    expect(stepWeight('2.5', -2.5, 'bodyweight')).toBe('');
    expect(stepWeight('', -2.5, 'bodyweight')).toBe('');
    expect(stepWeight('', 2.5, 'bodyweight')).toBe('2.5');
  });

  it('moves reps by one, between 1 and the maximum', () => {
    expect(stepReps('8', 1)).toBe('9');
    expect(stepReps('8', -1)).toBe('7');
    expect(stepReps('1', -1)).toBe('1');
    expect(stepReps('', 1)).toBe('1');
    expect(stepReps('1000', 1)).toBe('1000');
  });
});

describe('finishWorkout', () => {
  it('stamps finishedAt and drops exercises without sets', () => {
    const later = new Date(2026, 9, 22, 19, 45);
    const w = addExercise(workoutWithBench(), 'unused', () => 'empty');
    const r = finishWorkout(w, later);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.workout.finishedAt).toBe(later.toISOString());
    expect(r.workout.exercises.map((e) => e.exerciseId)).toEqual(['bench']);
  });

  it('refuses to finish a workout with no sets', () => {
    const w = addExercise(startWorkout(NOW, undefined, ids()), 'bench', ids());
    expect(finishWorkout(w, NOW).ok).toBe(false);
  });
});
