import type { Workout, WorkoutTemplate } from '../types';
import { MAX_TEMPLATE_NAME } from './schema';

/** Stars or un-stars an exercise; a newly starred one goes first. */
export function toggleFavorite(favorites: readonly string[], exerciseId: string): string[] {
  return favorites.includes(exerciseId)
    ? favorites.filter((id) => id !== exerciseId)
    : [exerciseId, ...favorites];
}

export type TemplateResult = { ok: true; template: WorkoutTemplate } | { ok: false; error: string };

/** Builds a template from a workout's exercises (each once, in order). */
export function createTemplate(name: string, workout: Workout, id: string, now: Date): TemplateResult {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: 'יש לתת שם לתבנית.' };
  if (trimmed.length > MAX_TEMPLATE_NAME) return { ok: false, error: `השם ארוך מדי (עד ${MAX_TEMPLATE_NAME} תווים).` };
  const exerciseIds = [...new Set(workout.exercises.map((e) => e.exerciseId))];
  if (exerciseIds.length === 0) return { ok: false, error: 'אין באימון תרגילים לשמור.' };
  return { ok: true, template: { id, name: trimmed, exerciseIds, createdAt: now.toISOString() } };
}

/** Templates newest first. */
export function sortTemplates(templates: readonly WorkoutTemplate[]): WorkoutTemplate[] {
  return [...templates].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
