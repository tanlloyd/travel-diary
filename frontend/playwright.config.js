import { defineConfig, devices } from '@playwright/test'
import process from 'node:process'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['line'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://127.0.0.1:5174',
    trace: 'on-first-retry',
    ...devices['Desktop Chrome'],
  },
  webServer: [
    {
      command: 'PORT=3101 node ../backend/scripts/e2e-server.js',
      url: 'http://127.0.0.1:3101/api/health',
      name: 'Backend',
      timeout: 120_000,
      reuseExistingServer: false,
    },
    {
      command: 'VITE_API_URL=http://127.0.0.1:3101/api npm run dev -- --host 127.0.0.1 --port 5174',
      url: 'http://127.0.0.1:5174',
      name: 'Frontend',
      timeout: 120_000,
      reuseExistingServer: false,
    },
  ],
})
