import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { include: ['packages/**/*.test.ts', 'server/**/*.test.ts', 'apps/mobile/src/**/*.test.ts'] },
});
