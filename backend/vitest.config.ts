import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    pool: 'forks',
    testTimeout: 60000,
    hookTimeout: 120000,
    fileParallelism: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../frontend/src'),
    },
  },
});
