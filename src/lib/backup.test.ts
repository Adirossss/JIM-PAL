import { describe, expect, it } from 'vitest';
import type { Workout } from '../types';
import { daysSinceBackup, shouldRemindBackup, snoozeUntil } from './backup';

const NOW = new Date('2026-10-24T12:00:00.000Z');
const done = (id: string, finishedAt: string | null): Workout => ({
  id, date: finishedAt?.slice(0, 10) ?? '2026-10-24', startedAt: '2026-10-01T10:00:00.000Z', finishedAt, note: '', exercises: [],
});
const three = [done('a', '2026-10-10T11:00:00.000Z'), done('b', '2026-10-15T11:00:00.000Z'), done('c', '2026-10-20T11:00:00.000Z')];

describe('shouldRemindBackup', () => {
  it('stays quiet with nothing to back up', () => {
    expect(shouldRemindBackup({ lastBackupAt: null, snoozedUntil: null, now: NOW, workouts: [] })).toBe(false);
  });

  it('asks for a first backup after three workouts', () => {
    expect(shouldRemindBackup({ lastBackupAt: null, snoozedUntil: null, now: NOW, workouts: three.slice(0, 2) })).toBe(false);
    expect(shouldRemindBackup({ lastBackupAt: null, snoozedUntil: null, now: NOW, workouts: three })).toBe(true);
  });

  it('reminds a week after the last backup only if newer workouts exist', () => {
    expect(shouldRemindBackup({ lastBackupAt: '2026-10-16T09:00:00.000Z', snoozedUntil: null, now: NOW, workouts: three })).toBe(true);
    expect(shouldRemindBackup({ lastBackupAt: '2026-10-21T09:00:00.000Z', snoozedUntil: null, now: NOW, workouts: three })).toBe(false); // < 7 days
    expect(shouldRemindBackup({ lastBackupAt: '2026-10-16T09:00:00.000Z', snoozedUntil: null, now: NOW, workouts: three.slice(0, 2) })).toBe(false); // nothing new
  });

  it('respects "later"', () => {
    expect(shouldRemindBackup({ lastBackupAt: null, snoozedUntil: snoozeUntil(NOW), now: NOW, workouts: three })).toBe(false);
    expect(snoozeUntil(NOW)).toBe('2026-10-27T12:00:00.000Z');
    expect(shouldRemindBackup({ lastBackupAt: null, snoozedUntil: '2026-10-23T00:00:00.000Z', now: NOW, workouts: three })).toBe(true);
  });

  it('ignores the unfinished workout and counts days since backup', () => {
    expect(shouldRemindBackup({ lastBackupAt: null, snoozedUntil: null, now: NOW, workouts: [...three.slice(0, 2), done('x', null)] })).toBe(false);
    expect(daysSinceBackup('2026-10-16T09:00:00.000Z', NOW)).toBe(8);
    expect(daysSinceBackup(null, NOW)).toBeNull();
  });
});
