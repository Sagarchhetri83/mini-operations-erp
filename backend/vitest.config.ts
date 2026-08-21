import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Run tests sequentially (important for DB state correctness)
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    // Load test environment variables
    env: {
      NODE_ENV: 'test',
    },
    // Global test setup
    globalSetup: ['./src/__tests__/globalSetup.ts'],
    setupFiles: ['./src/__tests__/setup.ts'],
    // Test file pattern
    include: ['src/__tests__/**/*.test.ts'],
    // Timeout for slow DB operations
    testTimeout: 30000,
  },
});
