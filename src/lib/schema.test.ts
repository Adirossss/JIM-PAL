import { describe, expect, it } from 'vitest';
import type { AppData } from '../types';
import {
  CURRENT_SCHEMA_VERSION,
  emptyAppData,
  emptySchedule,
  exportFileName,
  migrateAppData,
  parseImport,
  serializeExport,
  validateAppData,
} from './schema';

function sampleData(): AppData {
  return {
    schemaVersion: 4,
    schedule: { days: [null, 't1', null, null, 't1', null, null], reminderTime: '07:30' },
    bodyEntries: [
      { id: 'b1', date: '2026-10-20', weight: 81.4, waist: 84, chest: null, arm: 36.5, note: '' },
    ],
    favoriteExerciseIds: ['pull-up', 'custom-zercher'],
    templates: [
      { id: 't1', name: 'יום חזה', exerciseIds: ['barbell-bench-press', 'pull-up'], createdAt: '2026-10-21T08:00:00.000Z' },
    ],
    customExercises: [
      { id: 'custom-zercher', nameEn: 'Zercher Squat', nameHe: 'סקוואט זרכר', primaryMuscle: 'quads',
        secondaryMuscles: ['glutes'], equipment: 'free_weight', custom: true },
    ],
    workouts: [
      { id: 'w1', date: '2026-10-20', startedAt: '2026-10-20T15:00:00.000Z', finishedAt: '2026-10-20T16:10:00.000Z',
        note: 'good session', exercises: [
          { id: 'e1', exerciseId: 'barbell-bench-press', note: '', supersetId: 'ss1', sets: [
            { id: 's1', weight: 80, reps: 8 }, { id: 's2', weight: 82.5, reps: 6 }, { id: 's2d', weight: 60, reps: 10, drop: true },
          ] },
          { id: 'e2', exerciseId: 'pull-up', note: 'strict', supersetId: 'ss1', sets: [{ id: 's3', weight: null, reps: 10 }] },
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
    ['wrong schema version', (d) => { d.schemaVersion = 3; }],
    ['drop flag not boolean', (d) => { (d.workouts[0]!.exercises[0]!.sets[0] as unknown as Record<string, unknown>).drop = 'yes'; }],
    ['empty superset id', (d) => { d.workouts[0]!.exercises[0]!.supersetId = ' '; }],
    ['missing body entries', (d) => { delete (d as Partial<AppData>).bodyEntries; }],
    ['body entry without values', (d) => { d.bodyEntries[0] = { ...d.bodyEntries[0]!, weight: null, waist: null, arm: null }; }],
    ['body weight out of range', (d) => { d.bodyEntries[0]!.weight = 4; }],
    ['body entry with bad date', (d) => { d.bodyEntries[0]!.date = '2026-13-01'; }],
    ['duplicate body entry id', (d) => { d.bodyEntries.push({ ...d.bodyEntries[0]! }); }],
    ['favorites not a list', (d) => { (d as unknown as Record<string, unknown>).favoriteExerciseIds = 'pull-up'; }],
    ['duplicate favorite', (d) => { d.favoriteExerciseIds = ['pull-up', 'pull-up']; }],
    ['missing templates', (d) => { delete (d as Partial<AppData>).templates; }],
    ['template without name', (d) => { d.templates[0]!.name = ' '; }],
    ['template without exercises', (d) => { d.templates[0]!.exerciseIds = []; }],
    ['template with a repeated exercise', (d) => { d.templates[0]!.exerciseIds = ['pull-up', 'pull-up']; }],
    ['template with bad timestamp', (d) => { d.templates[0]!.createdAt = 'soon'; }],
    ['duplicate template id', (d) => { d.templates.push({ ...d.templates[0]! }); }],
    ['missing schedule', (d) => { delete (d as Partial<AppData>).schedule; }],
    ['schedule with 6 days', (d) => { d.schedule.days.pop(); }],
    ['schedule day not an id', (d) => { (d.schedule.days as unknown[])[0] = 3; }],
    ['bad reminder time', (d) => { d.schedule.reminderTime = '25:00'; }],
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

  it('upgrades version 1 data to the current version without changing anything existing', () => {
    const { favoriteExerciseIds: _f, templates: _t, bodyEntries: _b, schedule: _s, ...rest } = sampleData();
    const v1 = { ...rest, schemaVersion: 1 };
    const r = migrateAppData(v1);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value).toEqual({ ...rest, schemaVersion: 4, favoriteExerciseIds: [], templates: [], bodyEntries: [], schedule: emptySchedule() });
    // A v1 backup file still imports.
    expect(parseImport(JSON.stringify({ app: 'jim-pal', exportedAt: '2026-10-20T00:00:00.000Z', ...v1 })).ok).toBe(true);
  });

  it('upgrades version 2 data (favorites and templates kept)', () => {
    const { bodyEntries: _b, schedule: _s, ...rest } = sampleData();
    const r = migrateAppData({ ...rest, schemaVersion: 2 });
    expect(r).toEqual({ ok: true, value: { ...rest, schemaVersion: 4, bodyEntries: [], schedule: emptySchedule() } });
  });

  it('upgrades version 3 data with an empty weekly schedule', () => {
    const { schedule: _s, ...rest } = sampleData();
    const r = migrateAppData({ ...rest, schemaVersion: 3 });
    expect(r).toEqual({ ok: true, value: { ...rest, schemaVersion: 4, schedule: emptySchedule() } });
  });

  it('turns a schedule day whose template is gone into a rest day', () => {
    const d = sampleData();
    d.schedule.days[2] = 'deleted-template';
    const r = validateAppData(d);
    expect(r.ok && r.value.schedule.days).toEqual([null, 't1', null, null, 't1', null, null]);
  });

  it('keeps drop and superset fields only when set', () => {
    const d = sampleData();
    (d.workouts[0]!.exercises[1]!.sets[0] as unknown as Record<string, unknown>).drop = false;
    const r = validateAppData(d);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect('drop' in r.value.workouts[0]!.exercises[1]!.sets[0]!).toBe(false);
    expect('supersetId' in r.value.activeWorkout!.exercises[0]!).toBe(false);
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
