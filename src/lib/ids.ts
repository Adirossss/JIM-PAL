let counter = 0;

/**
 * Short unique-enough ID for local records. Deliberately not
 * crypto.randomUUID(): that is unavailable on plain-http origins, which is
 * how the dev server is reached from a phone on the local network.
 */
export function createId(prefix = ''): string {
  counter = (counter + 1) % 1296;
  const time = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8).padEnd(6, '0');
  return `${prefix}${time}${counter.toString(36).padStart(2, '0')}${rand}`;
}

export type IdFactory = () => string;
