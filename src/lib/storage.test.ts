import { describe, expect, it } from 'vitest';
import type { AppData } from '../types';
import { emptyAppData } from './schema';
import {
  CORRUPT_BACKUP_PREFIX,
  STORAGE_KEY,
  loadAppData,
  memoryStore,
  saveAppData,
  subscribeToExternalChanges,
  type KeyValueStore,
} from './storage';

const NOW = new Date('2026-10-22T20:00:00.000Z');

function dataWithActiveWorkout(): AppData {
  return {
    ...emptyAppData(),
    activeWorkout: {
      id: 'w1', date: '2026-10-22', startedAt: '2026-10-22T18:00:00.000Z', finishedAt: null, note: 'in progress',
      exercises: [{ id: 'e1', exerciseId: 'leg-press', note: '', sets: [{ id: 's1', weight: 140, reps: 10 }] }],
    },
  };
}

describe('storage', () => {
  it('starts empty when nothing is stored', () => {
    expect(loadAppData(memoryStore(), NOW)).toEqual({ status: 'empty', data: emptyAppData() });
  });

  it('saves under one key with a schema version and loads it back (survives reload)', () => {
    const store = memoryStore();
    expect(saveAppData(store, dataWithActiveWorkout())).toEqual({ ok: true });
    const raw = JSON.parse(store.getItem(STORAGE_KEY)!);
    expect(raw.schemaVersion).toBe(2);
    expect(loadAppData(store, NOW)).toEqual({ status: 'loaded', data: dataWithActiveWorkout() });
  });

  it('upgrades version 1 data on load and saves it back as version 2', () => {
    const store = memoryStore();
    const { favoriteExerciseIds: _f, templates: _t, ...v1 } = { ...dataWithActiveWorkout(), schemaVersion: 1 };
    store.setItem(STORAGE_KEY, JSON.stringify(v1));
    const r = loadAppData(store, NOW);
    expect(r).toEqual({ status: 'loaded', data: dataWithActiveWorkout() });
    expect(JSON.parse(store.getItem(STORAGE_KEY)!).schemaVersion).toBe(2);
  });

  it('backs up unreadable JSON instead of discarding it', () => {
    const store = memoryStore();
    store.setItem(STORAGE_KEY, '{broken');
    const r = loadAppData(store, NOW);
    expect(r.status).toBe('recovered');
    if (r.status !== 'recovered') return;
    expect(r.data).toEqual(emptyAppData());
    expect(r.backupKey).toBe(`${CORRUPT_BACKUP_PREFIX}${NOW.toISOString()}`);
    expect(store.getItem(r.backupKey!)).toBe('{broken');
  });

  it('backs up data that fails validation', () => {
    const store = memoryStore();
    store.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: 1, workouts: 'nope' }));
    const r = loadAppData(store, NOW);
    expect(r.status).toBe('recovered');
    if (r.status === 'recovered') expect(r.errors.length).toBeGreaterThan(0);
  });

  it('adopts valid data saved by another tab and ignores everything else', () => {
    const target = new EventTarget();
    const received: AppData[] = [];
    const unsubscribe = subscribeToExternalChanges(target, (d) => received.push(d));
    const fire = (key: string | null, newValue: string | null) =>
      target.dispatchEvent(Object.assign(new Event('storage'), { key, newValue }));

    fire(STORAGE_KEY, JSON.stringify(dataWithActiveWorkout()));
    fire('other-key', JSON.stringify(dataWithActiveWorkout()));
    fire(STORAGE_KEY, '{broken');
    fire(STORAGE_KEY, JSON.stringify({ schemaVersion: 1, workouts: 'nope' }));
    fire(STORAGE_KEY, null);
    expect(received).toEqual([dataWithActiveWorkout()]);

    unsubscribe();
    fire(STORAGE_KEY, JSON.stringify(emptyAppData()));
    expect(received).toHaveLength(1);
  });

  it('reports a failed save without throwing', () => {
    const full: KeyValueStore = {
      getItem: () => null,
      setItem: () => { throw new DOMException('full', 'QuotaExceededError'); },
    };
    expect(saveAppData(full, emptyAppData())).toEqual({ ok: false, error: 'אין מספיק מקום באחסון הדפדפן.' });
    const broken: KeyValueStore = { getItem: () => null, setItem: () => { throw new Error('x'); } };
    expect(saveAppData(broken, emptyAppData()).ok).toBe(false);
  });
});
