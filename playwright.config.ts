import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: true,
  forbidOnly: !!process.env["CI"],
  retries: process.env["CI"] ? 1 : 0,
  use: { baseURL: "http://localhost:4179" },
  webServer: {
    command: "bunx vite --port 4179 --strictPort",
    url: "http://localhost:4179/tests/browser/fixtures/index.html",
    reuseExistingServer: !process.env["CI"],
  },
});
