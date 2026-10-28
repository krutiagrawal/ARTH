import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    // src/config/env.ts validates process.env at import time, so give it harmless values.
    env: {
      DATABASE_URL: 'postgresql://test:test@127.0.0.1:5432/test',
      JWT_ACCESS_SECRET: 'test-secret-test-secret-test-secret-1234',
      OWM_API_KEY: 'test',
      NODE_ENV: 'test',
    },
  },
});
