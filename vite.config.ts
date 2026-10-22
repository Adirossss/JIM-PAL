import { defineConfig } from 'vitest/config';

// JSX is compiled by Vite's built-in esbuild (no @vitejs/plugin-react, to keep
// dependencies to the allowed list). The trade-off: no React Fast Refresh, so
// edits trigger a full page reload during development.
export default defineConfig({
  esbuild: {
    jsx: 'automatic',
  },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
