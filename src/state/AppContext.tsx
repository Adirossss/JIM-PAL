import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { indexExercises, mergeExercises } from '../lib/exercises';
import { parseRoute, routeToHash, type Route } from '../lib/route';
import {
  browserStore,
  loadAppData,
  memoryStore,
  saveAppData,
  subscribeToExternalChanges,
  type KeyValueStore,
  type LoadResult,
} from '../lib/storage';
import type { AppData, Exercise, Workout } from '../types';

interface AppContextValue {
  data: AppData;
  update: (fn: (data: AppData) => AppData) => void;
  /** Applies fn to the active workout; no-op when there is none. */
  updateActive: (fn: (workout: Workout) => Workout) => void;
  exercises: Exercise[];
  exerciseById: Map<string, Exercise>;
  route: Route;
  /** `replace` swaps the current history entry (e.g. after deleting the page's subject). */
  navigate: (route: Route, options?: { replace?: boolean }) => void;
  /** Goes back in browser history if possible, otherwise to `fallback`. */
  goBack: (fallback: Route) => void;
  loadResult: LoadResult;
  saveError: string | null;
  /** false when localStorage is unavailable and data lives only in memory. */
  persistent: boolean;
}

const AppContext = createContext<AppContextValue | null>(null);

function historyDepth(): number | null {
  const state: unknown = window.history.state;
  if (typeof state === 'object' && state !== null && typeof (state as { depth?: unknown }).depth === 'number') {
    return (state as { depth: number }).depth;
  }
  return null;
}

export interface InitialState {
  store: KeyValueStore;
  persistent: boolean;
  loadResult: LoadResult;
}

/**
 * Opens storage and loads the data once, before React renders. Loading can
 * write (a backup of unreadable data), so it must not run inside a render or
 * state initializer, which StrictMode deliberately calls twice.
 */
export function loadInitialState(): InitialState {
  const s = browserStore();
  const store = s ?? memoryStore();
  return { store, persistent: s !== null, loadResult: loadAppData(store) };
}

export function AppProvider({ initial, children }: { initial: InitialState; children: ReactNode }) {
  const { store, persistent, loadResult } = initial;
  const [data, setData] = useState<AppData>(loadResult.data);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    const result = saveAppData(store, data);
    setSaveError(result.ok ? null : result.error);
  }, [store, data]);

  // Another tab saved newer data: adopt it rather than overwrite it later.
  useEffect(() => subscribeToExternalChanges(window, setData), []);

  const [route, setRoute] = useState<Route>(() => parseRoute(window.location.hash));

  useEffect(() => {
    // Every in-app history entry records its depth, so goBack knows whether
    // history.back() stays inside the app.
    if (historyDepth() === null) window.history.replaceState({ depth: 0 }, '');
    const sync = () => setRoute(parseRoute(window.location.hash));
    window.addEventListener('popstate', sync);
    window.addEventListener('hashchange', sync);
    return () => {
      window.removeEventListener('popstate', sync);
      window.removeEventListener('hashchange', sync);
    };
  }, []);

  const navigate = useCallback((next: Route, options?: { replace?: boolean }) => {
    const hash = routeToHash(next);
    if (options?.replace) {
      window.history.replaceState({ depth: historyDepth() ?? 0 }, '', hash);
    } else if (window.location.hash !== hash) {
      window.history.pushState({ depth: (historyDepth() ?? 0) + 1 }, '', hash);
    }
    setRoute(next);
    window.scrollTo(0, 0);
  }, []);

  const goBack = useCallback((fallback: Route) => {
    if ((historyDepth() ?? 0) > 0) {
      window.history.back();
    } else {
      window.history.replaceState({ depth: 0 }, '', routeToHash(fallback));
      setRoute(fallback);
      window.scrollTo(0, 0);
    }
  }, []);

  const update = useCallback((fn: (d: AppData) => AppData) => setData(fn), []);
  const updateActive = useCallback(
    (fn: (w: Workout) => Workout) =>
      setData((d) => (d.activeWorkout ? { ...d, activeWorkout: fn(d.activeWorkout) } : d)),
    [],
  );

  const exercises = useMemo(() => mergeExercises(data.customExercises), [data.customExercises]);
  const exerciseById = useMemo(() => indexExercises(exercises), [exercises]);

  const value = useMemo<AppContextValue>(
    () => ({
      data, update, updateActive, exercises, exerciseById, route, navigate, goBack, loadResult, saveError, persistent,
    }),
    [data, update, updateActive, exercises, exerciseById, route, navigate, goBack, loadResult, saveError, persistent],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}
