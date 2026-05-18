import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "tests/e2e/html-report" }],
  ],
  use: {
    baseURL: "http://localhost:3000",
    headless: false,
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    viewport: { width: 1280, height: 900 },
    locale: "es-AR",
    timezoneId: "America/Argentina/Buenos_Aires",
  },
  projects: [
    {
      name: "chromium",
      use: {
        channel: "chromium",
        launchOptions: { headless: false, slowMo: 80 },
      },
    },
  ],
});
