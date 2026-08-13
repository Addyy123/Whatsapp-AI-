import { defineConfig } from 'vitest/config';
import path from 'path';
import dotenv from 'dotenv';

// Load .env.local for tests
dotenv.config({ path: '.env.local' });

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    testTimeout: 30000,
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    // We will run cleanup after all tests to remove any test data
    setupFiles: ['./src/lib/agent/__tests__/setup.ts']
  },
});
