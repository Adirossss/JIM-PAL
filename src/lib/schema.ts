import { SEED_EXERCISES } from '../data/exercises';
import {
  EQUIPMENT_TYPES,
  MUSCLE_GROUPS,
  type AppData,
  type EquipmentType,
  type Exercise,
  type MuscleGroup,
  type SetEntry,
  type Workout,
  type WorkoutExercise,
} from '../types';
import { isValidDateString } from './format';
import { MAX_REPS, MAX_WEIGHT_KG } from './workout';

export const CURRENT_SCHEMA_VERSION = 1;
export const EXPORT_APP_ID = 'jim-pal';

export function emptyAppData(): AppData {
  return { schemaVersion: CURRENT_SCHEMA_VERSION, customExercises: [], workouts: [], activeWorkout: null };
}

/**
 * Upgrades raw data from version N to N + 1, keyed by N. Empty while only
 * version 1 exists; a schema change adds an entry here.
 */
type Migration = (data: Record<string, unknown>) => Record<string, unknown>;
export const MIGRATIONS: Readonly<Record<number, Migration>> = {};

export type Result<T> = { ok: true; value: T } | { ok: false; errors: string[] };

const MAX_REPORTED_ERRORS = 10;

type Obj = Record<string, unknown>;

function isObject(v: unknown): v is Obj {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isIsoTimestamp(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0 && !Number.isNaN(Date.parse(v));
}

/**
 * Collects errors while copying only known fields, so the validated result
 * never carries unexpected keys from an imported file.
 */
class Validator {
  readonly errors: string[] = [];

  fail(path: string, message: string): void {
    if (this.errors.length < MAX_REPORTED_ERRORS) this.errors.push(`${path}: ${message}`);
    else if (this.errors.length === MAX_REPORTED_ERRORS) this.errors.push('…ועוד שגיאות');
  }

  string(o: Obj, key: string, path: string, { nonEmpty = false } = {}): string {
    const v = o[key];
    if (typeof v !== 'string' || (nonEmpty && v.trim() === '')) {
      this.fail(`${path}.${key}`, nonEmpty ? 'חייב להיות טקסט לא ריק' : 'חייב להיות טקסט');
      return '';
    }
    return v;
  }

  array(o: Obj, key: string, path: string): unknown[] {
    const v = o[key];
    if (!Array.isArray(v)) {
      this.fail(`${path}.${key}`, 'חייב להיות רשימה');
      return [];
    }
    return v;
  }

  object(v: unknown, path: string): Obj | null {
    if (!isObject(v)) {
      this.fail(path, 'חייב להיות אובייקט');
      return null;
    }
    return v;
  }

  exercise(v: unknown, path: string): Exercise | null {
    const o = this.object(v, path);
    if (!o) return null;
    const id = this.string(o, 'id', path, { nonEmpty: true });
    const nameEn = this.string(o, 'nameEn', path, { nonEmpty: true });
    const nameHe = this.string(o, 'nameHe', path, { nonEmpty: true });
    const primary = o.primaryMuscle;
    if (!MUSCLE_GROUPS.includes(primary as MuscleGroup)) this.fail(`${path}.primaryMuscle`, 'קבוצת שריר לא מוכרת');
    const secondary = this.array(o, 'secondaryMuscles', path);
    secondary.forEach((m, i) => {
      if (!MUSCLE_GROUPS.includes(m as MuscleGroup)) this.fail(`${path}.secondaryMuscles[${i}]`, 'קבוצת שריר לא מוכרת');
    });
    if (!EQUIPMENT_TYPES.includes(o.equipment as EquipmentType)) this.fail(`${path}.equipment`, 'סוג ציוד לא מוכר');
    if (o.custom !== undefined && typeof o.custom !== 'boolean') this.fail(`${path}.custom`, 'חייב להיות true/false');
    return {
      id,
      nameEn,
      nameHe,
      primaryMuscle: primary as MuscleGroup,
      secondaryMuscles: secondary as MuscleGroup[],
      equipment: o.equipment as EquipmentType,
      custom: true,
    };
  }

  set(v: unknown, path: string): SetEntry | null {
    const o = this.object(v, path);
    if (!o) return null;
    const id = this.string(o, 'id', path, { nonEmpty: true });
    const { weight, reps } = o;
    if (weight !== null && !(typeof weight === 'number' && Number.isFinite(weight) && weight >= 0 && weight <= MAX_WEIGHT_KG)) {
      this.fail(`${path}.weight`, `חייב להיות null או מספר בין 0 ל-${MAX_WEIGHT_KG}`);
    }
    if (!(typeof reps === 'number' && Number.isInteger(reps) && reps >= 0 && reps <= MAX_REPS)) {
      this.fail(`${path}.reps`, `חייב להיות מספר שלם בין 0 ל-${MAX_REPS}`);
    }
    return { id, weight: weight as number | null, reps: reps as number };
  }

  workoutExercise(v: unknown, path: string): WorkoutExercise | null {
    const o = this.object(v, path);
    if (!o) return null;
    return {
      id: this.string(o, 'id', path, { nonEmpty: true }),
      exerciseId: this.string(o, 'exerciseId', path, { nonEmpty: true }),
      note: this.string(o, 'note', path),
      sets: this.array(o, 'sets', path).map((s, i) => this.set(s, `${path}.sets[${i}]`)) as SetEntry[],
    };
  }

  workout(v: unknown, path: string, finished: boolean): Workout | null {
    const o = this.object(v, path);
    if (!o) return null;
    const date = this.string(o, 'date', path);
    if (!isValidDateString(date)) this.fail(`${path}.date`, 'תאריך לא תקין (YYYY-MM-DD)');
    if (!isIsoTimestamp(o.startedAt)) this.fail(`${path}.startedAt`, 'חותמת זמן לא תקינה');
    if (finished && !isIsoTimestamp(o.finishedAt)) this.fail(`${path}.finishedAt`, 'אימון שהסתיים חייב חותמת זמן סיום');
    if (!finished && o.finishedAt !== null) this.fail(`${path}.finishedAt`, 'אימון פעיל חייב finishedAt = null');
    return {
      id: this.string(o, 'id', path, { nonEmpty: true }),
      date,
      startedAt: o.startedAt as string,
      finishedAt: (o.finishedAt ?? null) as string | null,
      note: this.string(o, 'note', path),
      exercises: this.array(o, 'exercises', path).map((e, i) =>
        this.workoutExercise(e, `${path}.exercises[${i}]`),
      ) as WorkoutExercise[],
    };
  }

  unique(ids: string[], path: string, what: string): void {
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) this.fail(path, `${what} כפול: ${id}`);
      seen.add(id);
    }
  }
}

/** Validates data in the *current* schema version and returns a clean copy. */
export function validateAppData(value: unknown): Result<AppData> {
  const v = new Validator();
  const o = v.object(value, 'root');
  if (!o) return { ok: false, errors: v.errors };

  if (o.schemaVersion !== CURRENT_SCHEMA_VERSION) {
    v.fail('root.schemaVersion', `חייב להיות ${CURRENT_SCHEMA_VERSION}`);
  }
  const customExercises = v
    .array(o, 'customExercises', 'root')
    .map((e, i) => v.exercise(e, `customExercises[${i}]`)) as Exercise[];
  const workouts = v
    .array(o, 'workouts', 'root')
    .map((w, i) => v.workout(w, `workouts[${i}]`, true)) as Workout[];
  const activeWorkout = o.activeWorkout === null ? null : v.workout(o.activeWorkout, 'activeWorkout', false);
  if (!('activeWorkout' in o)) v.fail('root.activeWorkout', 'שדה חסר');

  if (v.errors.length === 0) {
    const seedIds = new Set(SEED_EXERCISES.map((e) => e.id));
    v.unique(customExercises.map((e) => e.id), 'customExercises', 'מזהה תרגיל');
    for (const e of customExercises) {
      if (seedIds.has(e.id)) v.fail('customExercises', `המזהה ${e.id} שמור לתרגיל מהספרייה`);
    }
    v.unique([...workouts, ...(activeWorkout ? [activeWorkout] : [])].map((w) => w.id), 'workouts', 'מזהה אימון');
  }

  if (v.errors.length > 0) return { ok: false, errors: v.errors };
  return {
    ok: true,
    value: { schemaVersion: CURRENT_SCHEMA_VERSION, customExercises, workouts, activeWorkout },
  };
}

/**
 * Brings raw stored or imported data up to the current schema version, then
 * validates it. Refuses data from a newer, unknown version.
 */
export function migrateAppData(value: unknown): Result<AppData> {
  if (!isObject(value)) return { ok: false, errors: ['הקובץ אינו אובייקט JSON'] };
  const version = value.schemaVersion;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    return { ok: false, errors: ['חסר מספר גרסת סכימה (schemaVersion) תקין'] };
  }
  if (version > CURRENT_SCHEMA_VERSION) {
    return {
      ok: false,
      errors: [`הנתונים שמורים בגרסה ${version}, חדשה מהגרסה שהאפליקציה מכירה (${CURRENT_SCHEMA_VERSION})`],
    };
  }
  let data: Obj = value;
  for (let v = version; v < CURRENT_SCHEMA_VERSION; v++) {
    const migrate = MIGRATIONS[v];
    if (!migrate) return { ok: false, errors: [`אין מסלול שדרוג מגרסה ${v}`] };
    data = { ...migrate(data), schemaVersion: v + 1 };
  }
  return validateAppData(data);
}

export interface ExportFile extends AppData {
  app: typeof EXPORT_APP_ID;
  exportedAt: string;
}

export function serializeExport(data: AppData, now: Date): string {
  const file: ExportFile = { app: EXPORT_APP_ID, exportedAt: now.toISOString(), ...data };
  return JSON.stringify(file, null, 2);
}

export function exportFileName(now: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `jim-pal-backup-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`;
}

/** Parses and validates an export file. Never throws. */
export function parseImport(text: string): Result<AppData> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, errors: ['הקובץ אינו JSON תקין'] };
  }
  if (!isObject(parsed)) return { ok: false, errors: ['הקובץ אינו אובייקט JSON'] };
  if (parsed.app !== undefined && parsed.app !== EXPORT_APP_ID) {
    return { ok: false, errors: ['הקובץ לא נוצר על ידי Jim-Pal'] };
  }
  const { app: _app, exportedAt: _exportedAt, ...rest } = parsed;
  return migrateAppData(rest);
}
