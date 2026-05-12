import { defineConfig, devices } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "https://copt.localhost";

/**
 * Playwright config for post-stack scroll regression tests.
 *
 * Reuses the running dev server (portless at https://copt.localhost) so the
 * tests can be run alongside an active dev session without restart. If no
 * server is running, Playwright will start one via `bun run dev` and wait
 * for the named portless URL to come up.
 */
export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: BASE_URL,
    ignoreHTTPSErrors: true,
    trace: "retain-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "bun run dev",
    url: BASE_URL,
    reuseExistingServer: true,
    ignoreHTTPSErrors: true,
    timeout: 120_000,
  },
});
