import type { SetEntry, Workout } from '../types';

/** Load counted for a set: bodyweight sets with no added load count as 0 kg. */
export function setLoad(set: SetEntry): number {
  return set.weight ?? 0;
}

/** weight × reps for one set. */
export function setVolume(set: SetEntry): number {
  return setLoad(set) * set.reps;
}

/** Sum of weight × reps. */
export function totalVolume(sets: readonly SetEntry[]): number {
  return sets.reduce((sum, s) => sum + setVolume(s), 0);
}

/** Epley estimated one-rep max: weight × (1 + reps / 30). 0 for sets with no reps. */
export function estimateOneRepMax(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  return weight * (1 + reps / 30);
}

export function setOneRepMax(set: SetEntry): number {
  return estimateOneRepMax(setLoad(set), set.reps);
}

/**
 * Best set = highest estimated 1RM; ties go to the heavier set, then to more
 * reps. For unloaded bodyweight sets (1RM 0) that means the set with the most
 * reps. Returns null when there are no sets with reps.
 */
export function bestSet(sets: readonly SetEntry[]): SetEntry | null {
  let best: SetEntry | null = null;
  for (const s of sets) {
    if (s.reps <= 0) continue;
    if (!best || compareSets(s, best) > 0) best = s;
  }
  return best;
}

function compareSets(a: SetEntry, b: SetEntry): number {
  return (
    setOneRepMax(a) - setOneRepMax(b) ||
    setLoad(a) - setLoad(b) ||
    a.reps - b.reps
  );
}

/** Newest first: by date, then by start time. Does not mutate the input. */
export function sortWorkoutsNewestFirst(workouts: readonly Workout[]): Workout[] {
  return [...workouts].sort(
    (a, b) => b.date.localeCompare(a.date) || b.startedAt.localeCompare(a.startedAt),
  );
}

const HEBREW_MONTHS = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
];

export interface MonthGroup {
  /** YYYY-MM */
  key: string;
  /** e.g. "אוקטובר 2026" */
  label: string;
  workouts: Workout[];
}

/** Groups workouts by calendar month, newest month first, newest workout first within a month. */
export function groupWorkoutsByMonth(workouts: readonly Workout[]): MonthGroup[] {
  const groups: MonthGroup[] = [];
  for (const w of sortWorkoutsNewestFirst(workouts)) {
    const key = w.date.slice(0, 7);
    let group = groups[groups.length - 1];
    if (!group || group.key !== key) {
      const monthIndex = Number(key.slice(5, 7)) - 1;
      group = { key, label: `${HEBREW_MONTHS[monthIndex] ?? key} ${key.slice(0, 4)}`, workouts: [] };
      groups.push(group);
    }
    group.workouts.push(w);
  }
  return groups;
}

export interface WorkoutSummary {
  exerciseCount: number;
  setCount: number;
  volume: number;
}

export function summarizeWorkout(workout: Workout): WorkoutSummary {
  const sets = workout.exercises.flatMap((e) => e.sets);
  return {
    exerciseCount: workout.exercises.length,
    setCount: sets.length,
    volume: totalVolume(sets),
  };
}

export interface ExerciseSession {
  workoutId: string;
  date: string;
  startedAt: string;
  note: string;
  sets: SetEntry[];
  bestSet: SetEntry | null;
  bestOneRepMax: number;
  volume: number;
}

/**
 * Every past session of one exercise, newest first. If an exercise appears
 * twice in one workout, its sets are combined into one session.
 */
export function exerciseSessions(workouts: readonly Workout[], exerciseId: string): ExerciseSession[] {
  const sessions: ExerciseSession[] = [];
  for (const w of sortWorkoutsNewestFirst(workouts)) {
    const entries = w.exercises.filter((e) => e.exerciseId === exerciseId);
    if (entries.length === 0) continue;
    const sets = entries.flatMap((e) => e.sets);
    if (sets.length === 0) continue;
    const best = bestSet(sets);
    sessions.push({
      workoutId: w.id,
      date: w.date,
      startedAt: w.startedAt,
      note: entries.map((e) => e.note.trim()).filter(Boolean).join(' · '),
      sets,
      bestSet: best,
      bestOneRepMax: best ? setOneRepMax(best) : 0,
      volume: totalVolume(sets),
    });
  }
  return sessions;
}

export interface ExerciseStats {
  sessions: ExerciseSession[];
  /** Best set across all sessions (same rule as bestSet). */
  bestSet: SetEntry | null;
  bestSetDate: string | null;
  totalVolume: number;
  totalSets: number;
}

export function exerciseStats(workouts: readonly Workout[], exerciseId: string): ExerciseStats {
  const sessions = exerciseSessions(workouts, exerciseId);
  let best: SetEntry | null = null;
  let bestDate: string | null = null;
  // Oldest first, so on a full tie the first time it was achieved wins.
  for (const s of [...sessions].reverse()) {
    if (s.bestSet && (!best || compareSets(s.bestSet, best) > 0)) {
      best = s.bestSet;
      bestDate = s.date;
    }
  }
  return {
    sessions,
    bestSet: best,
    bestSetDate: bestDate,
    totalVolume: sessions.reduce((sum, s) => sum + s.volume, 0),
    totalSets: sessions.reduce((sum, s) => sum + s.sets.length, 0),
  };
}

export interface ProgressPoint {
  date: string;
  oneRepMax: number;
  /** The set that produced oneRepMax. */
  set: SetEntry;
}

/**
 * Best estimated 1RM per calendar date, oldest first. Dates whose best is 0
 * (e.g. unloaded bodyweight work) are left out.
 */
export function oneRepMaxProgress(workouts: readonly Workout[], exerciseId: string): ProgressPoint[] {
  const byDate = new Map<string, ProgressPoint>();
  for (const s of exerciseSessions(workouts, exerciseId)) {
    if (!s.bestSet || s.bestOneRepMax <= 0) continue;
    const existing = byDate.get(s.date);
    if (!existing || s.bestOneRepMax > existing.oneRepMax) {
      byDate.set(s.date, { date: s.date, oneRepMax: s.bestOneRepMax, set: s.bestSet });
    }
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/** Ids of exercises that appear in at least one workout, most recently used first. */
export function recentlyUsedExerciseIds(workouts: readonly Workout[]): string[] {
  const seen = new Set<string>();
  for (const w of sortWorkoutsNewestFirst(workouts)) {
    for (const e of w.exercises) seen.add(e.exerciseId);
  }
  return [...seen];
}
