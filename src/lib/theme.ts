export const THEME_PREFERENCES = ['light', 'dark', 'system'] as const;
export type ThemePreference = (typeof THEME_PREFERENCES)[number];

/** Light unless the user picks otherwise (the phone's dark mode is opt-in). */
export const DEFAULT_THEME: ThemePreference = 'light';

/** Status-bar / browser chrome color per resolved theme (matches --bg). */
export const THEME_COLORS: Record<'light' | 'dark', string> = { light: '#eef0f2', dark: '#0f1113' };

export const THEME_LABELS_HE: Record<ThemePreference, string> = {
  light: 'בהיר',
  dark: 'כהה',
  system: 'לפי הטלפון',
};

/** Any stored value → a valid preference (unknown or missing → the default). */
export function parseThemePreference(value: unknown): ThemePreference {
  return THEME_PREFERENCES.includes(value as ThemePreference) ? (value as ThemePreference) : DEFAULT_THEME;
}

/** The theme actually shown. */
export function resolveTheme(preference: ThemePreference, systemPrefersDark: boolean): 'light' | 'dark' {
  if (preference === 'system') return systemPrefersDark ? 'dark' : 'light';
  return preference;
}
