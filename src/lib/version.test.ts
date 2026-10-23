import { describe, expect, it } from 'vitest';
import { isUpdateAvailable, parseVersionInfo, updateUrl } from './version';

describe('parseVersionInfo', () => {
  it('reads a valid version file', () => {
    expect(parseVersionInfo({ version: 'abc1234', builtAt: '2026-10-24T10:00:00Z' })).toEqual({
      version: 'abc1234',
      builtAt: '2026-10-24T10:00:00Z',
    });
    expect(parseVersionInfo({ version: 'abc1234' })).toEqual({ version: 'abc1234', builtAt: '' });
  });

  it('rejects malformed input', () => {
    expect(parseVersionInfo(null)).toBeNull();
    expect(parseVersionInfo('abc')).toBeNull();
    expect(parseVersionInfo({})).toBeNull();
    expect(parseVersionInfo({ version: '  ' })).toBeNull();
    expect(parseVersionInfo({ version: 7 })).toBeNull();
  });
});

describe('isUpdateAvailable', () => {
  it('is true only when the deployed version differs', () => {
    expect(isUpdateAvailable('abc1234', { version: 'def5678', builtAt: '' })).toBe(true);
    expect(isUpdateAvailable('abc1234', { version: 'abc1234', builtAt: '' })).toBe(false);
    expect(isUpdateAvailable('abc1234', null)).toBe(false);
  });
});

describe('updateUrl', () => {
  it('adds a cache-busting version and keeps the current screen', () => {
    expect(updateUrl({ pathname: '/JIM-PAL/', hash: '#/history' }, 'def5678')).toBe('/JIM-PAL/?v=def5678#/history');
    expect(updateUrl({ pathname: '/', hash: '' }, 'a b')).toBe('/?v=a%20b');
  });
});
