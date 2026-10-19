import { defineConfig, devices } from '@playwright/test';

// The happy-path test runs the production build against its own database.
const PORT = 3100;
export const E2E_ENV = {
  DATABASE_URL: process.env.E2E_DATABASE_URL ?? 'postgresql://tracker:tracker@localhost:5433/tracker_e2e',
  AUTH_SECRET: 'e2e-only-secret-not-for-production-0000000000',
  AUTH_DEV_LOGIN: '1',
  AUTH_URL: `http://localhost:${PORT}`,
  SEED_ADMIN_EMAIL: 'michael@e2e.test',
  UPLOAD_DIR: '.uploads-e2e',
  BLOB_READ_WRITE_TOKEN: '',
};

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  workers: 1,
  globalSetup: './tests/e2e/global-setup.ts',
  use: { baseURL: `http://localhost:${PORT}`, trace: 'retain-on-failure' },
  projects: [{ name: 'mobile', use: { ...devices['Pixel 7'] } }],
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/signin`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: E2E_ENV,
  },
});
