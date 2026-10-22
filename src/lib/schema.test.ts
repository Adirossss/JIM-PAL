import { describe, expect, it } from 'vitest';
import type { AppData } from '../types';
import {
  CURRENT_SCHEMA_VERSION,
  emptyAppData,
  exportFileName,
  migrateAppData,
  parseImport,
  serializeExport,
  validateAppData,
} from './schema';

function sampleData(): AppData {
  return {
    schemaVersion: 1,
    customExercises: [
      { id: 'custom-zercher', nameEn: 'Zercher Squat', nameHe: 'סקוואט זרכר', primaryMuscle: 'quads',
        secondaryMuscles: ['glutes'], equipment: 'free_weight', custom: true },
    ],
    workouts: [
      { id: 'w1', date: '2026-10-20', startedAt: '2026-10-20T15:00:00.000Z', finishedAt: '2026-10-20T16:10:00.000Z',
        note: 'good session', exercises: [
          { id: 'e1', exerciseId: 'barbell-bench-press', note: '', sets: [
            { id: 's1', weight: 80, reps: 8 }, { id: 's2', weight: 82.5, reps: 6 },
          ] },
          { id: 'e2', exerciseId: 'pull-up', note: 'strict', sets: [{ id: 's3', weight: null, reps: 10 }] },
        ] },
    ],
    activeWorkout: {
      id: 'w2', date: '2026-10-22', startedAt: '2026-10-22T15:00:00.000Z', finishedAt: null, note: '',
      exercises: [{ id: 'e3', exerciseId: 'custom-zercher', note: '', sets: [] }],
    },
  };
}

describe('validateAppData', () => {
  it('accepts valid data and empty data', () => {
    expect(validateAppData(sampleData())).toEqual({ ok: true, value: sampleData() });
    expect(validateAppData(emptyAppData())).toEqual({ ok: true, value: emptyAppData() });
  });

  it('strips unknown keys', () => {
    const data = { ...sampleData(), extra: 1 } as unknown as AppData & { extra: number };
    (data.workouts[0] as unknown as Record<string, unknown>).junk = 'x';
    const r = validateAppData(data);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect('extra' in r.value).toBe(false);
    expect('junk' in r.value.workouts[0]!).toBe(false);
  });

  const broken: Array<[string, (d: AppData) => void]> = [
    ['non-array workouts', (d) => { (d as unknown as Record<string, unknown>).workouts = {}; }],
    ['missing activeWorkout', (d) => { delete (d as Partial<AppData>).activeWorkout; }],
    ['string weight', (d) => { (d.workouts[0]!.exercises[0]!.sets[0] as unknown as Record<string, unknown>).weight = '80'; }],
    ['negative weight', (d) => { d.workouts[0]!.exercises[0]!.sets[0]!.weight = -1; }],
    ['fractional reps', (d) => { d.workouts[0]!.exercises[0]!.sets[0]!.reps = 2.5; }],
    ['invalid date', (d) => { d.workouts[0]!.date = '2026-02-30'; }],
    ['bad timestamp', (d) => { d.workouts[0]!.startedAt = 'yesterday'; }],
    ['finished workout without finishedAt', (d) => { d.workouts[0]!.finishedAt = null; }],
    ['active workout with finishedAt', (d) => { d.activeWorkout!.finishedAt = '2026-10-22T16:00:00.000Z'; }],
    ['unknown muscle', (d) => { (d.customExercises[0] as unknown as Record<string, unknown>).primaryMuscle = 'neck'; }],
    ['unknown equipment', (d) => { (d.customExercises[0] as unknown as Record<string, unknown>).equipment = 'band'; }],
    ['empty exercise name', (d) => { d.customExercises[0]!.nameHe = '  '; }],
    ['duplicate workout id', (d) => { d.activeWorkout!.id = 'w1'; }],
    ['custom id clashing with seed', (d) => { d.customExercises[0]!.id = 'deadlift'; }],
    ['wrong schema version', (d) => { d.schemaVersion = 2; }],
  ];

  it.each(broken)('rejects %s', (_name, breakIt) => {
    const d = sampleData();
    breakIt(d);
    const r = validateAppData(d);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.length).toBeGreaterThan(0);
  });

  it('caps the number of reported errors', () => {
    const d = sampleData();
    d.workouts = Array.from({ length: 30 }, (_, i) => ({ ...d.workouts[0]!, id: `w${i}`, date: 'bad' }));
    const r = validateAppData(d);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.length).toBe(11);
  });
});

describe('migrateAppData', () => {
  it('passes current-version data through validation', () => {
    expect(migrateAppData(sampleData())).toEqual({ ok: true, value: sampleData() });
  });

  it('refuses missing, invalid or newer versions', () => {
    const { schemaVersion: _v, ...noVersion } = sampleData();
    expect(migrateAppData(noVersion).ok).toBe(false);
    expect(migrateAppData({ ...sampleData(), schemaVersion: '1' }).ok).toBe(false);
    expect(migrateAppData({ ...sampleData(), schemaVersion: 0 }).ok).toBe(false);
    const newer = migrateAppData({ ...sampleData(), schemaVersion: CURRENT_SCHEMA_VERSION + 1 });
    expect(newer.ok).toBe(false);
    if (!newer.ok) expect(newer.errors[0]).toContain('חדשה');
    expect(migrateAppData(null).ok).toBe(false);
    expect(migrateAppData([]).ok).toBe(false);
  });
});

describe('export / import', () => {
  const NOW = new Date('2026-10-22T20:00:00.000Z');

  it('round-trips all data', () => {
    const text = serializeExport(sampleData(), NOW);
    const parsed = JSON.parse(text);
    expect(parsed.app).toBe('jim-pal');
    expect(parsed.exportedAt).toBe(NOW.toISOString());
    expect(parseImport(text)).toEqual({ ok: true, value: sampleData() });
  });

  it('accepts a file without the app/exportedAt envelope', () => {
    expect(parseImport(JSON.stringify(sampleData())).ok).toBe(true);
  });

  it('refuses malformed files', () => {
    expect(parseImport('').ok).toBe(false);
    expect(parseImport('{not json').ok).toBe(false);
    expect(parseImport('[]').ok).toBe(false);
    expect(parseImport('"text"').ok).toBe(false);
    expect(parseImport(JSON.stringify({ app: 'other-app', ...sampleData() })).ok).toBe(false);
    expect(parseImport(JSON.stringify({ schemaVersion: 1 })).ok).toBe(false);
    const bad = sampleData();
    bad.workouts[0]!.exercises[0]!.sets[0]!.reps = -3;
    expect(parseImport(serializeExport(bad, NOW)).ok).toBe(false);
  });

  it('names the export file by local date', () => {
    expect(exportFileName(new Date(2026, 0, 5, 12))).toBe('jim-pal-backup-2026-01-05.json');
  });
});
