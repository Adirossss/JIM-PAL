import { useState } from 'react';
import { THEME_COLORS, resolveTheme, type ThemePreference } from '../lib/theme';
import { browserStore, loadThemePreference, memoryStore, saveThemePreference, type KeyValueStore } from '../lib/storage';

let store: KeyValueStore | null = null;
function themeStore(): KeyValueStore {
  store ??= browserStore() ?? memoryStore();
  return store;
}

/**
 * Puts the preference on <html data-theme> (the CSS picks the palette from it;
 * "system" follows the phone via a media query) and colors the status bar.
 */
export function applyTheme(preference: ThemePreference): void {
  document.documentElement.dataset.theme = preference;
  for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
    // Each meta carries a prefers-color-scheme media query; "system" keeps them
    // apart, an explicit choice gives both the same color.
    const metaScheme = meta.media.includes('dark') ? 'dark' : 'light';
    const effective = preference === 'system' ? metaScheme : resolveTheme(preference, false);
    meta.content = THEME_COLORS[effective];
  }
}

/** Applies the saved preference; call before the first render to avoid a flash. */
export function applySavedTheme(): void {
  applyTheme(loadThemePreference(themeStore()));
}

export function useThemePreference(): [ThemePreference, (preference: ThemePreference) => void] {
  const [preference, setPreference] = useState(() => loadThemePreference(themeStore()));
  const choose = (next: ThemePreference) => {
    saveThemePreference(themeStore(), next);
    applyTheme(next);
    setPreference(next);
  };
  return [preference, choose];
}
