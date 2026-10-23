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
