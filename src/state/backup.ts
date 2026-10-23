import { useCallback, useState } from 'react';
import { daysSinceBackup, shouldRemindBackup, snoozeUntil } from '../lib/backup';
import { exportFileName, serializeExport } from '../lib/schema';
import { loadBackupState, recordBackup, snoozeBackupReminder } from '../lib/storage';
import type { AppData } from '../types';
import { deviceStore } from './deviceStore';

export type BackupResult = { kind: 'shared' | 'downloaded'; fileName: string } | { kind: 'cancelled' };

/**
 * Exports all data. On a phone it opens the share sheet with the file
 * (save to Files, send on WhatsApp or by mail), which works in a home-screen
 * app where plain downloads often do not; elsewhere it downloads the file.
 */
export async function exportBackup(data: AppData): Promise<BackupResult> {
  const now = new Date();
  const fileName = exportFileName(now);
  const json = serializeExport(data, now);

  const touch = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  if (touch && typeof File !== 'undefined' && navigator.canShare) {
    const file = new File([json], fileName, { type: 'application/json' });
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'גיבוי Jim-Pal' });
        recordBackup(deviceStore(), now);
        return { kind: 'shared', fileName };
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return { kind: 'cancelled' };
        // Sharing failed for another reason: fall back to a download.
      }
    }
  }

  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  recordBackup(deviceStore(), now);
  return { kind: 'downloaded', fileName };
}

/** Whether to show the backup reminder, with actions that update it. */
export function useBackupReminder(data: AppData) {
  const [state, setState] = useState(() => loadBackupState(deviceStore()));
  const now = new Date();
  const show = shouldRemindBackup({ ...state, now, workouts: data.workouts });
  const days = daysSinceBackup(state.lastBackupAt, now);

  const refresh = useCallback(() => setState(loadBackupState(deviceStore())), []);
  const snooze = useCallback(() => {
    snoozeBackupReminder(deviceStore(), snoozeUntil(new Date()));
    refresh();
  }, [refresh]);

  return { show, days, lastBackupAt: state.lastBackupAt, snooze, refresh };
}
