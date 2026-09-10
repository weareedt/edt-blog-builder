import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Without this, vitest's default glob also picks up the *.test.js
    // files tsc --watch compiles into lib/ alongside the real *.test.ts
    // sources under src/ — two copies of every suite, and the compiled
    // CommonJS copies fail outright (vitest is ESM-only).
    include: ['src/**/*.test.ts'],
  },
});
