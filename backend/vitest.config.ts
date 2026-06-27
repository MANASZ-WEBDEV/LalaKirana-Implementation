import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    pool: 'forks',
    testTimeout: 60000,
    hookTimeout: 120000,
    fileParallelism: false,
  },
});
