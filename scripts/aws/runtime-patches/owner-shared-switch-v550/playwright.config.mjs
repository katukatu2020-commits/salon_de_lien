import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { defineConfig } = require('@playwright/test')

export default defineConfig({
  testDir: '.',
  testMatch: 'browser-regression.spec.mjs',
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  reporter: 'line',
  use: {
    channel: 'chrome',
    headless: true,
    trace: 'retain-on-failure',
  },
})
