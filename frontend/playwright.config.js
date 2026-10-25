import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  workers: 1,
  retries: 0,
  timeout: 60000,
  webServer: [
    {
      command: 'node ../backend/dist/main.js',
      url: 'http://127.0.0.1:3001/api/v1/health/ready',
      env: {
        PORT: '3001',
        HOST: '127.0.0.1',
        APP_ORIGIN: 'http://127.0.0.1:5174',
      },
      reuseExistingServer: false,
      timeout: 30000,
    },
    {
      command:
        'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5174 --strictPort',
      url: 'http://127.0.0.1:5174',
      env: { BACKEND_URL: 'http://127.0.0.1:3001' },
      reuseExistingServer: false,
      timeout: 30000,
    },
  ],
  use: {
    baseURL: 'http://127.0.0.1:5174',
    channel: 'chrome',
    headless: true,
    trace: 'off',
    screenshot: 'off',
  },
  reporter: 'list',
});
