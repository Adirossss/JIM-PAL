/** Contents of version.json, written next to index.html by every build. */
export interface VersionInfo {
  version: string;
  builtAt: string;
}

/** Parses version.json; null for anything malformed. */
export function parseVersionInfo(value: unknown): VersionInfo | null {
  if (typeof value !== 'object' || value === null) return null;
  const { version, builtAt } = value as Record<string, unknown>;
  if (typeof version !== 'string' || version.trim() === '') return null;
  return { version, builtAt: typeof builtAt === 'string' ? builtAt : '' };
}

/** True when the deployed build differs from the one running. */
export function isUpdateAvailable(running: string, deployed: VersionInfo | null): boolean {
  return deployed !== null && deployed.version !== running;
}

/**
 * URL to reload into the new version. The `v` query makes it a URL no cache
 * has seen, so the browser and the CDN serve the fresh index.html; the hash
 * keeps the user on the same screen.
 */
export function updateUrl(location: { pathname: string; hash: string }, version: string): string {
  return `${location.pathname}?v=${encodeURIComponent(version)}${location.hash}`;
}
