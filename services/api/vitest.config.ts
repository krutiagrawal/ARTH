import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    // src/config/env.ts validates process.env at import time, so give it harmless values.
    env: {
      // With RUN_DB_TESTS=1 the real DATABASE_URL from .env is used instead.
      ...(process.env.RUN_DB_TESTS === '1' ? {} : { DATABASE_URL: 'postgresql://test:test@127.0.0.1:5432/test' }),
      ...(process.env.RUN_DB_TESTS === '1' ? {} : { JWT_ACCESS_SECRET: 'test-secret-test-secret-test-secret-1234', OWM_API_KEY: 'test' }),
      NODE_ENV: 'test',
    },
  },
});
