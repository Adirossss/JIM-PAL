import { browserStore, memoryStore, type KeyValueStore } from '../lib/storage';

let store: KeyValueStore | null = null;

/** Storage for per-device settings (theme, backup reminder); opened once. */
export function deviceStore(): KeyValueStore {
  store ??= browserStore() ?? memoryStore();
  return store;
}
