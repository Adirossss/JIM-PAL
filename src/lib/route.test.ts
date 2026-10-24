import { describe, expect, it } from 'vitest';
import { parseRoute, routeToHash, tabOf, type Route } from './route';

describe('routes', () => {
  const routes: Route[] = [
    { name: 'workout' },
    { name: 'history' },
    { name: 'workoutDetail', workoutId: 'abc123' },
    { name: 'workoutEdit', workoutId: 'abc123' },
    { name: 'body' },
    { name: 'schedule' },
    { name: 'exercises' },
    { name: 'exerciseDetail', exerciseId: 'leg-press' },
    { name: 'exerciseDetail', exerciseId: 'id with/slash' },
    { name: 'newExercise' },
    { name: 'data' },
  ];

  it.each(routes)('round-trips %o', (route) => {
    expect(parseRoute(routeToHash(route))).toEqual(route);
  });

  it('falls back to the workout tab for empty or unknown hashes', () => {
    expect(parseRoute('')).toEqual({ name: 'workout' });
    expect(parseRoute('#/')).toEqual({ name: 'workout' });
    expect(parseRoute('#/nope')).toEqual({ name: 'workout' });
  });

  it('tolerates malformed escapes', () => {
    expect(parseRoute('#/history/%E0%A4%A')).toEqual({ name: 'workoutDetail', workoutId: '%E0%A4%A' });
  });

  it('maps routes to tabs', () => {
    expect(tabOf({ name: 'workoutDetail', workoutId: 'x' })).toBe('history');
    expect(tabOf({ name: 'newExercise' })).toBe('exercises');
    expect(tabOf({ name: 'workoutEdit', workoutId: 'x' })).toBe('history');
    expect(tabOf({ name: 'body' })).toBe('workout');
    expect(tabOf({ name: 'schedule' })).toBe('workout');
    expect(tabOf({ name: 'data' })).toBe('data');
  });
});
