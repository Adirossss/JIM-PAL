import type { EquipmentType, SetEntry, Workout, WorkoutExercise } from '../types';
import { parseReps, parseWeight, toLocalDateString } from './format';
import { createId, type IdFactory } from './ids';
import { sortWorkoutsNewestFirst } from './stats';

export const MAX_WEIGHT_KG = 1000;
export const MAX_REPS = 1000;

export function startWorkout(now: Date, date = toLocalDateString(now), newId: IdFactory = createId): Workout {
  return {
    id: newId(),
    date,
    startedAt: now.toISOString(),
    finishedAt: null,
    note: '',
    exercises: [],
  };
}

/**
 * "Repeat a past workout": a new workout with the same exercises in the same
 * order (each once) and no sets; each set form then pre-fills from history.
 */
export function startWorkoutFrom(
  source: Workout,
  now: Date,
  date = toLocalDateString(now),
  newId: IdFactory = createId,
): Workout {
  return startWorkoutWith(source.exercises.map((e) => e.exerciseId), now, date, newId);
}

/** A new workout with these exercises (duplicates dropped, order kept) and no sets. */
export function startWorkoutWith(
  exerciseIds: readonly string[],
  now: Date,
  date = toLocalDateString(now),
  newId: IdFactory = createId,
): Workout {
  let workout = startWorkout(now, date, newId);
  for (const id of new Set(exerciseIds)) workout = addExercise(workout, id, newId);
  return workout;
}

export interface SuggestedExercise {
  exerciseId: string;
  /** The sets done in the past workout the suggestion comes from. */
  sets: SetEntry[];
}

export interface Suggestions {
  sourceDate: string;
  /** The current exercise the suggestions follow. */
  afterExerciseId: string;
  items: SuggestedExercise[];
}

/**
 * "What else did you do last time?": takes the latest exercise in the current
 * workout that has sets, finds the most recent past workout with it, and
 * suggests that workout's other exercises (those after it first) that are not
 * in the current workout yet. Null when there is nothing to suggest.
 */
export function suggestNextExercises(
  current: Workout,
  history: readonly Workout[],
  limit = 3,
): Suggestions | null {
  const anchor = [...current.exercises].reverse().find((e) => e.sets.length > 0);
  if (!anchor) return null;
  const inCurrent = new Set(current.exercises.map((e) => e.exerciseId));

  for (const w of sortWorkoutsNewestFirst(history)) {
    if (w.id === current.id) continue;
    const index = w.exercises.findIndex((e) => e.exerciseId === anchor.exerciseId);
    if (index < 0) continue;
    const items: SuggestedExercise[] = [];
    for (const e of [...w.exercises.slice(index + 1), ...w.exercises.slice(0, index)]) {
      if (inCurrent.has(e.exerciseId) || e.sets.length === 0) continue;
      if (items.some((i) => i.exerciseId === e.exerciseId)) continue;
      items.push({ exerciseId: e.exerciseId, sets: e.sets });
      if (items.length === limit) break;
    }
    return items.length > 0 ? { sourceDate: w.date, afterExerciseId: anchor.exerciseId, items } : null;
  }
  return null;
}

export function setWorkoutDate(workout: Workout, date: string): Workout {
  return { ...workout, date };
}

export function setWorkoutNote(workout: Workout, note: string): Workout {
  return { ...workout, note };
}

export function addExercise(workout: Workout, exerciseId: string, newId: IdFactory = createId): Workout {
  const entry: WorkoutExercise = { id: newId(), exerciseId, note: '', sets: [] };
  return { ...workout, exercises: [...workout.exercises, entry] };
}

export function removeExercise(workout: Workout, entryId: string): Workout {
  return { ...workout, exercises: workout.exercises.filter((e) => e.id !== entryId) };
}

/** Moves an exercise entry one position up (-1) or down (+1). */
export function moveExercise(workout: Workout, entryId: string, direction: -1 | 1): Workout {
  const i = workout.exercises.findIndex((e) => e.id === entryId);
  const j = i + direction;
  if (i < 0 || j < 0 || j >= workout.exercises.length) return workout;
  const exercises = [...workout.exercises];
  [exercises[i], exercises[j]] = [exercises[j]!, exercises[i]!];
  return { ...workout, exercises };
}

function updateEntry(
  workout: Workout,
  entryId: string,
  update: (entry: WorkoutExercise) => WorkoutExercise,
): Workout {
  return {
    ...workout,
    exercises: workout.exercises.map((e) => (e.id === entryId ? update(e) : e)),
  };
}

export function setExerciseNote(workout: Workout, entryId: string, note: string): Workout {
  return updateEntry(workout, entryId, (e) => ({ ...e, note }));
}

export interface SetValues {
  weight: number | null;
  reps: number;
}

export function addSet(workout: Workout, entryId: string, values: SetValues, newId: IdFactory = createId): Workout {
  return updateEntry(workout, entryId, (e) => ({
    ...e,
    sets: [...e.sets, { id: newId(), weight: values.weight, reps: values.reps }],
  }));
}

export function updateSet(workout: Workout, entryId: string, setId: string, values: SetValues): Workout {
  return updateEntry(workout, entryId, (e) => ({
    ...e,
    sets: e.sets.map((s) => (s.id === setId ? { ...s, weight: values.weight, reps: values.reps } : s)),
  }));
}

export function deleteSet(workout: Workout, entryId: string, setId: string): Workout {
  return updateEntry(workout, entryId, (e) => ({ ...e, sets: e.sets.filter((s) => s.id !== setId) }));
}

/**
 * The most recently logged set of an exercise: the last set of that exercise
 * in the current workout if there is one, otherwise the last set of the most
 * recent finished workout that contains it.
 */
export function lastLoggedSet(
  exerciseId: string,
  current: Workout | null,
  history: readonly Workout[],
): SetEntry | null {
  const fromWorkout = (w: Workout): SetEntry | null => {
    const sets = w.exercises.filter((e) => e.exerciseId === exerciseId).flatMap((e) => e.sets);
    return sets[sets.length - 1] ?? null;
  };
  if (current) {
    const s = fromWorkout(current);
    if (s) return s;
  }
  for (const w of sortWorkoutsNewestFirst(history)) {
    if (current && w.id === current.id) continue;
    const s = fromWorkout(w);
    if (s) return s;
  }
  return null;
}

/**
 * Appends a copy of the entry's last set. If the entry has no sets yet, copies
 * the last logged set of the same exercise from history. Returns the workout
 * unchanged when there is nothing to copy.
 */
export function duplicateLastSet(
  workout: Workout,
  entryId: string,
  history: readonly Workout[],
  newId: IdFactory = createId,
): Workout {
  const entry = workout.exercises.find((e) => e.id === entryId);
  if (!entry) return workout;
  const source = entry.sets[entry.sets.length - 1] ?? lastLoggedSet(entry.exerciseId, null, history);
  if (!source) return workout;
  return addSet(workout, entryId, { weight: source.weight, reps: source.reps }, newId);
}

export type SetInputResult = { ok: true; values: SetValues } | { ok: false; error: string };

/**
 * Validates the weight and reps typed for a set. Weight is required except
 * for bodyweight exercises, where it is the optional added load.
 */
export function validateSetInput(weightText: string, repsText: string, equipment: EquipmentType): SetInputResult {
  const weight = parseWeight(weightText);
  const reps = parseReps(repsText);

  if (weight === null && equipment !== 'bodyweight') {
    return { ok: false, error: 'יש להזין משקל.' };
  }
  if (weight !== null && (Number.isNaN(weight) || weight > MAX_WEIGHT_KG)) {
    return { ok: false, error: `משקל לא תקין (0–${MAX_WEIGHT_KG} ק"ג).` };
  }
  if (Number.isNaN(reps) || reps < 1 || reps > MAX_REPS) {
    return { ok: false, error: 'מספר חזרות לא תקין (מספר שלם, 1 ומעלה).' };
  }
  // Treat an explicit 0 kg on a bodyweight exercise as "no added load".
  const normalizedWeight = equipment === 'bodyweight' && weight === 0 ? null : weight;
  return { ok: true, values: { weight: normalizedWeight, reps } };
}

/**
 * The weight stepper's − / + : moves the typed weight by `delta` kg, never
 * below 0. On a bodyweight exercise 0 means "no added load" and shows empty.
 */
export function stepWeight(text: string, delta: number, equipment: EquipmentType): string {
  const current = parseWeight(text);
  const base = current === null || Number.isNaN(current) ? 0 : current;
  const next = Math.min(MAX_WEIGHT_KG, Math.max(0, Math.round((base + delta) * 100) / 100));
  if (equipment === 'bodyweight' && next === 0) return '';
  return String(next);
}

/** The reps stepper's − / + : moves the typed reps by `delta`, kept between 1 and MAX_REPS. */
export function stepReps(text: string, delta: number): string {
  const current = parseReps(text);
  const base = Number.isNaN(current) ? 0 : current;
  return String(Math.min(MAX_REPS, Math.max(1, base + delta)));
}

/** Text to pre-fill the set form with, from a previous set. */
export function setToInputText(set: SetEntry | null): { weight: string; reps: string } {
  if (!set) return { weight: '', reps: '' };
  return { weight: set.weight === null ? '' : String(set.weight), reps: String(set.reps) };
}

export type FinishResult = { ok: true; workout: Workout } | { ok: false; error: string };

/**
 * Completes a workout. Exercises without any sets are dropped; a workout with
 * no sets at all cannot be finished.
 */
export function finishWorkout(workout: Workout, now: Date): FinishResult {
  const exercises = workout.exercises.filter((e) => e.sets.length > 0);
  if (exercises.length === 0) {
    return { ok: false, error: 'אי אפשר לסיים אימון בלי אף סט. הוסף סט או בטל את האימון.' };
  }
  return { ok: true, workout: { ...workout, exercises, finishedAt: now.toISOString() } };
}
