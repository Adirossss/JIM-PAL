export type Route =
  | { name: 'workout' }
  | { name: 'history' }
  | { name: 'workoutDetail'; workoutId: string }
  | { name: 'workoutEdit'; workoutId: string }
  | { name: 'body' }
  | { name: 'exercises' }
  | { name: 'exerciseDetail'; exerciseId: string }
  | { name: 'newExercise' }
  | { name: 'data' };

export type Tab = 'workout' | 'history' | 'exercises' | 'data';

/** Parses a location hash such as "#/history/abc" into a route. Unknown hashes go to the workout tab. */
export function parseRoute(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(safeDecode);
  const [first, second, third] = parts;
  switch (first) {
    case 'history':
      if (second && third === 'edit') return { name: 'workoutEdit', workoutId: second };
      return second ? { name: 'workoutDetail', workoutId: second } : { name: 'history' };
    case 'exercises':
      if (second === 'new') return { name: 'newExercise' };
      return second ? { name: 'exerciseDetail', exerciseId: second } : { name: 'exercises' };
    case 'data':
      return { name: 'data' };
    case 'body':
      return { name: 'body' };
    default:
      return { name: 'workout' };
  }
}

export function routeToHash(route: Route): string {
  switch (route.name) {
    case 'workout':
      return '#/workout';
    case 'history':
      return '#/history';
    case 'workoutDetail':
      return `#/history/${encodeURIComponent(route.workoutId)}`;
    case 'workoutEdit':
      return `#/history/${encodeURIComponent(route.workoutId)}/edit`;
    case 'body':
      return '#/body';
    case 'exercises':
      return '#/exercises';
    case 'exerciseDetail':
      return `#/exercises/${encodeURIComponent(route.exerciseId)}`;
    case 'newExercise':
      return '#/exercises/new';
    case 'data':
      return '#/data';
  }
}

export function tabOf(route: Route): Tab {
  switch (route.name) {
    case 'workout':
    case 'body':
      return 'workout';
    case 'history':
    case 'workoutDetail':
    case 'workoutEdit':
      return 'history';
    case 'exercises':
    case 'exerciseDetail':
    case 'newExercise':
      return 'exercises';
    case 'data':
      return 'data';
  }
}

function safeDecode(part: string): string {
  try {
    return decodeURIComponent(part);
  } catch {
    return part;
  }
}
