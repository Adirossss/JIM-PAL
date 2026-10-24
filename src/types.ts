export const MUSCLE_GROUPS = [
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'forearms',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'core',
] as const;

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

export const EQUIPMENT_TYPES = ['machine', 'free_weight', 'cable', 'bodyweight'] as const;

export type EquipmentType = (typeof EQUIPMENT_TYPES)[number];

export interface Exercise {
  id: string;
  nameEn: string;
  nameHe: string;
  primaryMuscle: MuscleGroup;
  secondaryMuscles: MuscleGroup[];
  equipment: EquipmentType;
  /** true for exercises the user created; absent/false for the seed library. */
  custom?: boolean;
}

export interface SetEntry {
  id: string;
  /**
   * Weight in kg. For bodyweight exercises this is the *added* load
   * (e.g. a dip belt) and `null` means no added load.
   */
  weight: number | null;
  reps: number;
  /** A drop set (lighter weight right after a set, no rest). Absent = normal set. */
  drop?: boolean;
}

export interface WorkoutExercise {
  id: string;
  exerciseId: string;
  note: string;
  sets: SetEntry[];
  /**
   * Consecutive exercises sharing this id form a superset, done back to back
   * without rest (schema v3). Absent = not in a superset.
   */
  supersetId?: string;
}

/** A body-weight / measurements entry (schema v3). At least one value is set. */
export interface BodyEntry {
  id: string;
  /** Local calendar date, YYYY-MM-DD. */
  date: string;
  /** Body weight in kg. */
  weight: number | null;
  /** Circumferences in cm. */
  waist: number | null;
  chest: number | null;
  arm: number | null;
  note: string;
}

export interface Workout {
  id: string;
  /** Local calendar date, YYYY-MM-DD. */
  date: string;
  /** ISO timestamp. */
  startedAt: string;
  /** ISO timestamp; null while the workout is in progress. */
  finishedAt: string | null;
  note: string;
  exercises: WorkoutExercise[];
}

/** A named list of exercises to start a workout from (schema v2). */
export interface WorkoutTemplate {
  id: string;
  name: string;
  /** In workout order, each id once. */
  exerciseIds: string[];
  /** ISO timestamp. */
  createdAt: string;
}

/** A template per weekday, plus when the calendar reminder fires (schema v4). */
export interface WeeklySchedule {
  /** Seven entries, Sunday first: a template id, or null for a rest day. */
  days: Array<string | null>;
  /** Reminder time of day, "HH:MM" (24h). */
  reminderTime: string;
}

export interface AppData {
  schemaVersion: number;
  customExercises: Exercise[];
  /** Finished workouts. */
  workouts: Workout[];
  /** The in-progress workout, if any. */
  activeWorkout: Workout | null;
  /** Exercises starred by the user, most recently starred first (schema v2). */
  favoriteExerciseIds: string[];
  /** Saved workout templates (schema v2). */
  templates: WorkoutTemplate[];
  /** Body weight and measurements, any order (schema v3). */
  bodyEntries: BodyEntry[];
  /** Fixed weekly workouts (schema v4). */
  schedule: WeeklySchedule;
}

export const MUSCLE_LABELS_HE: Record<MuscleGroup, string> = {
  chest: 'חזה',
  back: 'גב',
  shoulders: 'כתפיים',
  biceps: 'יד קדמית',
  triceps: 'יד אחורית',
  forearms: 'אמות',
  quads: 'ארבע ראשי',
  hamstrings: 'ירך אחורית',
  glutes: 'ישבן',
  calves: 'תאומים',
  core: 'בטן וליבה',
};

export const EQUIPMENT_LABELS_HE: Record<EquipmentType, string> = {
  machine: 'מכונה',
  free_weight: 'משקל חופשי',
  cable: 'כבלים',
  bodyweight: 'משקל גוף',
};
