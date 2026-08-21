import { defineConfig } from '@playwright/test'

// services/api (port 4000) must be running separately — the NGO dashboard
// has no data of its own, everything comes from the backend via the
// /api/ngo/proxy route. `reuseExistingServer` lets this run against a dev
// server you already have open instead of always spawning a fresh one.
export default defineConfig({
  testDir: './e2e',
  globalSetup: require.resolve('./e2e/global-setup.ts'),
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 60_000,
  },
})
