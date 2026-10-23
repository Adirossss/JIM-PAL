import { useCallback, useEffect, useState } from 'react';
import { isUpdateAvailable, parseVersionInfo, updateUrl, type VersionInfo } from '../lib/version';

const POLL_MS = 5 * 60 * 1000;

/**
 * Watches for a newer deployed build: checks shortly after start, whenever
 * the app comes back to the foreground, and every few minutes. Does nothing
 * in development, where no version.json is served.
 */
export function useUpdateCheck(): { update: VersionInfo | null; apply: () => void } {
  const [update, setUpdate] = useState<VersionInfo | null>(null);

  useEffect(() => {
    if (import.meta.env.DEV) return;
    let cancelled = false;

    const check = async () => {
      try {
        const res = await fetch(`./version.json?t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) return;
        const info = parseVersionInfo(await res.json());
        if (!cancelled && isUpdateAvailable(__APP_VERSION__, info)) setUpdate(info);
      } catch {
        // Offline or a bad response: try again on the next trigger.
      }
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible') void check();
    };
    const first = window.setTimeout(check, 2000);
    const timer = window.setInterval(check, POLL_MS);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', check);
    return () => {
      cancelled = true;
      window.clearTimeout(first);
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', check);
    };
  }, []);

  const apply = useCallback(() => {
    if (update) window.location.replace(updateUrl(window.location, update.version));
  }, [update]);

  return { update, apply };
}
