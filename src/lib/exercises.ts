import { SEED_EXERCISES } from '../data/exercises';
import {
  EQUIPMENT_TYPES,
  MUSCLE_GROUPS,
  type EquipmentType,
  type Exercise,
  type MuscleGroup,
} from '../types';

/** Seed library followed by the user's custom exercises. */
export function mergeExercises(customExercises: readonly Exercise[]): Exercise[] {
  return [...SEED_EXERCISES, ...customExercises];
}

export function indexExercises(exercises: readonly Exercise[]): Map<string, Exercise> {
  return new Map(exercises.map((e) => [e.id, e]));
}

/**
 * Lower-cases, strips punctuation that users rarely type (hyphens, apostrophes,
 * Hebrew geresh/gershayim, brackets) and collapses whitespace, so that
 * "pull up" matches "Pull-Up" and "סמית" matches "סמית'".
 */
export function normalizeSearchText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[-–—_'’`"״׳().,/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface ExerciseFilter {
  query?: string;
  muscle?: MuscleGroup | null;
  equipment?: EquipmentType | null;
}

/**
 * Filters by primary muscle and equipment, then by query. Every word of the
 * query must appear in the English or Hebrew name. Exercises whose name starts
 * with the query are listed first; otherwise the input order is kept.
 */
export function searchExercises(exercises: readonly Exercise[], filter: ExerciseFilter): Exercise[] {
  const query = normalizeSearchText(filter.query ?? '');
  const tokens = query ? query.split(' ') : [];

  const matches = exercises.filter((e) => {
    if (filter.muscle && e.primaryMuscle !== filter.muscle) return false;
    if (filter.equipment && e.equipment !== filter.equipment) return false;
    if (tokens.length === 0) return true;
    const haystack = `${normalizeSearchText(e.nameEn)} ${normalizeSearchText(e.nameHe)}`;
    return tokens.every((t) => haystack.includes(t));
  });

  if (!query) return matches;
  const startsWithQuery = (e: Exercise) =>
    normalizeSearchText(e.nameEn).startsWith(query) || normalizeSearchText(e.nameHe).startsWith(query);
  return [...matches.filter(startsWithQuery), ...matches.filter((e) => !startsWithQuery(e))];
}

export interface CustomExerciseInput {
  nameEn: string;
  nameHe: string;
  primaryMuscle: MuscleGroup | '';
  secondaryMuscles: MuscleGroup[];
  equipment: EquipmentType | '';
}

export type CustomExerciseResult =
  | { ok: true; exercise: Exercise }
  | { ok: false; errors: string[] };

/**
 * Validates form input and builds a custom exercise. At least one name is
 * required; a missing name is filled with the other one so every exercise
 * keeps both fields. Names must not duplicate an existing exercise.
 */
export function createCustomExercise(
  input: CustomExerciseInput,
  existing: readonly Exercise[],
  id: string,
): CustomExerciseResult {
  const errors: string[] = [];
  const nameEn = input.nameEn.trim();
  const nameHe = input.nameHe.trim();

  if (!nameEn && !nameHe) errors.push('יש להזין שם לתרגיל (בעברית או באנגלית).');
  if (!input.primaryMuscle || !MUSCLE_GROUPS.includes(input.primaryMuscle)) {
    errors.push('יש לבחור שריר עיקרי.');
  }
  if (!input.equipment || !EQUIPMENT_TYPES.includes(input.equipment)) {
    errors.push('יש לבחור סוג ציוד.');
  }

  const taken = new Set(
    existing.flatMap((e) => [normalizeSearchText(e.nameEn), normalizeSearchText(e.nameHe)]),
  );
  if ((nameEn && taken.has(normalizeSearchText(nameEn))) || (nameHe && taken.has(normalizeSearchText(nameHe)))) {
    errors.push('כבר קיים תרגיל בשם הזה.');
  }

  if (errors.length > 0 || !input.primaryMuscle || !input.equipment) {
    return { ok: false, errors };
  }

  const primaryMuscle = input.primaryMuscle;
  const secondaryMuscles = MUSCLE_GROUPS.filter(
    (m) => m !== primaryMuscle && input.secondaryMuscles.includes(m),
  );

  return {
    ok: true,
    exercise: {
      id,
      nameEn: nameEn || nameHe,
      nameHe: nameHe || nameEn,
      primaryMuscle,
      secondaryMuscles,
      equipment: input.equipment,
      custom: true,
    },
  };
}
