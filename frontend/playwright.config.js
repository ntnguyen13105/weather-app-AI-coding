import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  workers: 1,
  retries: 0,
  timeout: 60000,
  use: {
    baseURL: 'http://127.0.0.1:5173',
    channel: 'chrome',
    headless: true,
    trace: 'off',
    screenshot: 'off',
  },
  reporter: 'list',
});
