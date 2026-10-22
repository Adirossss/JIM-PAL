import { defineConfig } from 'vitest/config';

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
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
