import type { MuscleGroup, SetEntry, Workout } from '../types';

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

/**
 * Ids of sets that beat the exercise's previous best estimated 1RM, going
 * through the workouts in date order. An exercise's first session only sets
 * the baseline (no records there), and a later set in the same workout must
 * also beat that workout's earlier sets.
 */
export function personalRecordSetIds(workouts: readonly Workout[]): Set<string> {
  const ordered = [...workouts].sort((a, b) => a.date.localeCompare(b.date) || a.startedAt.localeCompare(b.startedAt));
  const best = new Map<string, number>();
  const records = new Set<string>();
  for (const w of ordered) {
    const inWorkout = new Map<string, number>();
    for (const e of w.exercises) {
      const before = best.get(e.exerciseId);
      for (const s of e.sets) {
        const value = setOneRepMax(s);
        if (value <= 0) continue;
        const bar = Math.max(before ?? -Infinity, inWorkout.get(e.exerciseId) ?? -Infinity);
        if (before !== undefined && value > bar + 1e-9) records.add(s.id);
        inWorkout.set(e.exerciseId, Math.max(inWorkout.get(e.exerciseId) ?? 0, value));
      }
    }
    for (const [id, value] of inWorkout) best.set(id, Math.max(best.get(id) ?? 0, value));
  }
  return records;
}

/** Sunday that starts the week of a YYYY-MM-DD date (weeks start on Sunday in Israel). */
export function startOfWeek(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const utc = new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1));
  utc.setUTCDate(utc.getUTCDate() - utc.getUTCDay());
  return utc.toISOString().slice(0, 10);
}

/** YYYY-MM-DD shifted by whole days (UTC-based, so DST never skews it). */
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const utc = new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, (d ?? 1) + days));
  return utc.toISOString().slice(0, 10);
}

/**
 * Consecutive weeks (Sunday–Saturday) with at least one workout, counting
 * back from this week. A week not trained yet does not break the streak
 * until it is over, so the count starts from last week in that case.
 */
export function weekStreak(workouts: readonly Workout[], today: string): number {
  const weeks = new Set(workouts.filter((w) => w.date <= today).map((w) => startOfWeek(w.date)));
  let week = startOfWeek(today);
  if (!weeks.has(week)) week = addDays(week, -7);
  let streak = 0;
  while (weeks.has(week)) {
    streak += 1;
    week = addDays(week, -7);
  }
  return streak;
}

export interface WeeklySummary {
  workouts: number;
  sets: number;
  volume: number;
  /** Volume of the same days last week (Sunday up to the same weekday), for a fair comparison. */
  previousVolume: number;
  streak: number;
  /** Sets per primary muscle group this week. */
  muscleSets: Partial<Record<MuscleGroup, number>>;
}

/** This week's training at a glance. `muscleOf` maps an exercise id to its primary muscle. */
export function weeklySummary(
  workouts: readonly Workout[],
  today: string,
  muscleOf: (exerciseId: string) => MuscleGroup | undefined,
): WeeklySummary {
  const start = startOfWeek(today);
  const thisWeek = workouts.filter((w) => w.date >= start && w.date <= today);
  const lastWeekSameDays = workouts.filter((w) => w.date >= addDays(start, -7) && w.date <= addDays(today, -7));
  const muscleSets: Partial<Record<MuscleGroup, number>> = {};
  for (const w of thisWeek) {
    for (const e of w.exercises) {
      const muscle = muscleOf(e.exerciseId);
      if (muscle && e.sets.length > 0) muscleSets[muscle] = (muscleSets[muscle] ?? 0) + e.sets.length;
    }
  }
  return {
    workouts: thisWeek.length,
    sets: thisWeek.reduce((n, w) => n + summarizeWorkout(w).setCount, 0),
    volume: thisWeek.reduce((n, w) => n + summarizeWorkout(w).volume, 0),
    previousVolume: lastWeekSameDays.reduce((n, w) => n + summarizeWorkout(w).volume, 0),
    streak: weekStreak(workouts, today),
    muscleSets,
  };
}

/** Finished workouts dated in the same week as `today`. */
export function countWorkoutsThisWeek(workouts: readonly Workout[], today: string): number {
  const from = startOfWeek(today);
  return workouts.filter((w) => w.date >= from && w.date <= today).length;
}

export interface VolumePoint {
  workoutId: string;
  date: string;
  volume: number;
}

/** Total volume of the last `count` workouts, oldest first. */
export function recentVolumes(workouts: readonly Workout[], count: number): VolumePoint[] {
  return sortWorkoutsNewestFirst(workouts)
    .slice(0, count)
    .reverse()
    .map((w) => ({ workoutId: w.id, date: w.date, volume: summarizeWorkout(w).volume }));
}

/** Percent change from `previous` to `current`, rounded; null when there is no base to compare. */
export function percentChange(previous: number, current: number): number | null {
  if (!(previous > 0)) return null;
  return Math.round(((current - previous) / previous) * 100);
}

export interface ExerciseHighlight {
  exerciseId: string;
  bestOneRepMax: number;
}

/** Best estimated 1RM of the most recently used loaded exercises, most recent first. */
export function recentHighlights(workouts: readonly Workout[], count: number): ExerciseHighlight[] {
  const result: ExerciseHighlight[] = [];
  for (const exerciseId of recentlyUsedExerciseIds(workouts)) {
    const best = exerciseStats(workouts, exerciseId).bestSet;
    const oneRepMax = best ? setOneRepMax(best) : 0;
    if (oneRepMax > 0) result.push({ exerciseId, bestOneRepMax: oneRepMax });
    if (result.length === count) break;
  }
  return result;
}

export interface RecentExercise {
  exerciseId: string;
  /** The last set logged for it, in its most recent session. */
  lastSet: SetEntry;
  lastDate: string;
}

/** The most recently used exercises with their last set, for one-tap re-adding. */
export function recentExercises(workouts: readonly Workout[], count: number): RecentExercise[] {
  const result: RecentExercise[] = [];
  for (const exerciseId of recentlyUsedExerciseIds(workouts)) {
    const session = exerciseSessions(workouts, exerciseId)[0];
    const lastSet = session?.sets[session.sets.length - 1];
    if (session && lastSet) result.push({ exerciseId, lastSet, lastDate: session.date });
    if (result.length === count) break;
  }
  return result;
}

/** Ids of exercises that appear in at least one workout, most recently used first. */
export function recentlyUsedExerciseIds(workouts: readonly Workout[]): string[] {
  const seen = new Set<string>();
  for (const w of sortWorkoutsNewestFirst(workouts)) {
    for (const e of w.exercises) seen.add(e.exerciseId);
  }
  return [...seen];
}
