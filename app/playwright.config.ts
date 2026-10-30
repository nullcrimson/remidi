import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? undefined : process.env.E2E_WORKERS ?? '25%',
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: process.env.CI ? 'on-first-retry' : 'off',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] }, testIgnore: [/touch\.spec/, /readme\.screenshot\.spec/], grepInvert: /@phone/ },
    {
      name: 'phone',
      use: { ...devices['Pixel 7'] },
      testMatch: /\b(touch|convert|layout|files|editor|presets|presetChips|missing|channel|source|review|summary|donePanel|session|sitelinks|footer|tip|site|drumMaps|rack|translated)\.spec/,
    },
  ],
  webServer: {
    command: `npx vite preview --port ${PORT} --strictPort`,
    port: PORT,
    reuseExistingServer: !process.env.CI,
  },
});
