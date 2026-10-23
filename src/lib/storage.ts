/**
 * The single data-access module: the only code that touches localStorage.
 * All data lives under one key as one JSON document carrying `schemaVersion`.
 */
import type { AppData } from '../types';
import { CURRENT_SCHEMA_VERSION, emptyAppData, migrateAppData } from './schema';
import { DEFAULT_THEME, parseThemePreference, type ThemePreference } from './theme';

export const STORAGE_KEY = 'jim-pal:data';
export const CORRUPT_BACKUP_PREFIX = 'jim-pal:data:unreadable:';

/** The subset of the Web Storage API we use (injectable for tests). */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export type LoadResult =
  | { status: 'empty'; data: AppData }
  | { status: 'loaded'; data: AppData }
  /** Stored data was unreadable; it was copied to `backupKey` and the app starts empty. */
  | { status: 'recovered'; data: AppData; backupKey: string | null; errors: string[] };

export function loadAppData(store: KeyValueStore, now: Date = new Date()): LoadResult {
  const raw = store.getItem(STORAGE_KEY);
  if (raw === null) return { status: 'empty', data: emptyAppData() };

  let errors: string[];
  try {
    const parsed: unknown = JSON.parse(raw);
    const result = migrateAppData(parsed);
    if (result.ok) {
      const storedVersion = (parsed as { schemaVersion?: unknown }).schemaVersion;
      if (storedVersion !== CURRENT_SCHEMA_VERSION) saveAppData(store, result.value);
      return { status: 'loaded', data: result.value };
    }
    errors = result.errors;
  } catch {
    errors = ['הנתונים השמורים אינם JSON תקין'];
  }

  // Keep the unreadable data instead of overwriting it on the next save.
  const backupKey = `${CORRUPT_BACKUP_PREFIX}${now.toISOString()}`;
  try {
    store.setItem(backupKey, raw);
    return { status: 'recovered', data: emptyAppData(), backupKey, errors };
  } catch {
    return { status: 'recovered', data: emptyAppData(), backupKey: null, errors };
  }
}

export type SaveResult = { ok: true } | { ok: false; error: string };

export function saveAppData(store: KeyValueStore, data: AppData): SaveResult {
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(data));
    return { ok: true };
  } catch (e) {
    const quota = e instanceof DOMException && (e.name === 'QuotaExceededError' || e.code === 22);
    return { ok: false, error: quota ? 'אין מספיק מקום באחסון הדפדפן.' : 'שמירת הנתונים נכשלה.' };
  }
}

/**
 * Calls `onData` when another tab saves new data, so a stale tab adopts it
 * instead of overwriting it on its next save. Unreadable values are ignored.
 * Returns an unsubscribe function.
 */
export function subscribeToExternalChanges(
  target: Pick<EventTarget, 'addEventListener' | 'removeEventListener'>,
  onData: (data: AppData) => void,
): () => void {
  const handler = (e: Event) => {
    const { key, newValue } = e as StorageEvent;
    if (key !== STORAGE_KEY || newValue === null) return;
    try {
      const result = migrateAppData(JSON.parse(newValue));
      if (result.ok) onData(result.value);
    } catch {
      // Ignore: the other tab wrote something unreadable; keep our state.
    }
  };
  target.addEventListener('storage', handler);
  return () => target.removeEventListener('storage', handler);
}

/**
 * The light/dark preference is a per-device display setting, kept under its
 * own key: it is not workout data and is not exported.
 */
export const THEME_KEY = 'jim-pal:theme';

export function loadThemePreference(store: KeyValueStore): ThemePreference {
  try {
    return parseThemePreference(store.getItem(THEME_KEY));
  } catch {
    return DEFAULT_THEME;
  }
}

export function saveThemePreference(store: KeyValueStore, preference: ThemePreference): void {
  try {
    store.setItem(THEME_KEY, preference);
  } catch {
    // Storage full or blocked: the choice still applies until the app is closed.
  }
}

/** window.localStorage, or null when unavailable (e.g. blocked by privacy settings). */
export function browserStore(): KeyValueStore | null {
  try {
    const s = window.localStorage;
    const probe = `${STORAGE_KEY}:probe`;
    s.setItem(probe, '1');
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}

/** In-memory fallback so the app still runs (without persistence) when storage is blocked. */
export function memoryStore(): KeyValueStore {
  const map = new Map<string, string>();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
  };
}
