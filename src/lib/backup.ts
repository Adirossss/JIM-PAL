import type { Workout } from '../types';

const DAY_MS = 86_400_000;
/** How long "אחר כך" hides the reminder. */
export const BACKUP_SNOOZE_DAYS = 3;
/** Remind when the last backup is at least this old and newer workouts exist. */
export const BACKUP_INTERVAL_DAYS = 7;
/** Never backed up: remind once there are this many workouts to lose. */
export const FIRST_BACKUP_AFTER_WORKOUTS = 3;

export interface BackupReminderInput {
  /** ISO timestamp of the last export, or null if never. */
  lastBackupAt: string | null;
  /** ISO timestamp until which the reminder is snoozed, or null. */
  snoozedUntil: string | null;
  now: Date;
  workouts: readonly Workout[];
}

/** Whether to nudge the user to export a backup (the data lives only on this device). */
export function shouldRemindBackup({ lastBackupAt, snoozedUntil, now, workouts }: BackupReminderInput): boolean {
  if (snoozedUntil && now.getTime() < Date.parse(snoozedUntil)) return false;
  const finished = workouts.filter((w) => w.finishedAt !== null);
  if (finished.length === 0) return false;
  if (!lastBackupAt) return finished.length >= FIRST_BACKUP_AFTER_WORKOUTS;
  const last = Date.parse(lastBackupAt);
  if (Number.isNaN(last)) return true;
  const newSince = finished.some((w) => Date.parse(w.finishedAt!) > last);
  return newSince && now.getTime() - last >= BACKUP_INTERVAL_DAYS * DAY_MS;
}

/** Whole days since the last backup (null if never). */
export function daysSinceBackup(lastBackupAt: string | null, now: Date): number | null {
  if (!lastBackupAt) return null;
  const last = Date.parse(lastBackupAt);
  return Number.isNaN(last) ? null : Math.floor((now.getTime() - last) / DAY_MS);
}

export function snoozeUntil(now: Date): string {
  return new Date(now.getTime() + BACKUP_SNOOZE_DAYS * DAY_MS).toISOString();
}
