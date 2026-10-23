import { defineConfig } from 'vitest/config';

// Identifies this build. On GitHub Actions it is the commit; locally a timestamp.
const APP_VERSION = process.env.GITHUB_SHA?.slice(0, 7) ?? `local-${Date.now().toString(36)}`;
const BUILT_AT = new Date().toISOString();

// JSX is compiled by Vite's built-in esbuild (no @vitejs/plugin-react, to keep
// dependencies to the allowed list). The trade-off: no React Fast Refresh, so
// edits trigger a full page reload during development.
export default defineConfig({
  // Relative asset paths, so the build works at any sub-path such as
  // https://<user>.github.io/jim-pal/ (GitHub Pages).
  base: './',
  esbuild: {
    jsx: 'automatic',
  },
  define: {
    __APP_VERSION__: JSON.stringify(APP_VERSION),
    __BUILT_AT__: JSON.stringify(BUILT_AT),
  },
  plugins: [
    {
      // Writes version.json next to index.html; running apps poll it to
      // notice that a newer build was deployed.
      name: 'jim-pal-version-file',
      apply: 'build',
      generateBundle() {
        this.emitFile({
          type: 'asset',
          fileName: 'version.json',
          source: JSON.stringify({ version: APP_VERSION, builtAt: BUILT_AT }),
        });
      },
    },
  ],
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
