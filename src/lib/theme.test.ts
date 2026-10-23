import { describe, expect, it } from 'vitest';
import { DEFAULT_THEME, parseThemePreference, resolveTheme } from './theme';

describe('theme preference', () => {
  it('defaults to light for missing or unknown values', () => {
    expect(DEFAULT_THEME).toBe('light');
    expect(parseThemePreference(null)).toBe('light');
    expect(parseThemePreference('purple')).toBe('light');
    expect(parseThemePreference('dark')).toBe('dark');
    expect(parseThemePreference('system')).toBe('system');
  });

  it('resolves "system" from the phone setting and keeps explicit choices', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
  });
});
