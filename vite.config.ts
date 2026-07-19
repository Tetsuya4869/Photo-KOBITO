/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Relative base so the built bundle works when served from any sub-path
  // (or opened via `vite preview`) without absolute-root assumptions.
  base: './',
  worker: {
    format: 'es',
  },
  test: {
    // Pure-function core runs under Node. DOM-touching specs opt in per-file
    // with a `// @vitest-environment jsdom` docblock.
    environment: 'node',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/core/**', 'src/pipeline/**'],
    },
  },
});
