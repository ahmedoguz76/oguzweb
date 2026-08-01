import { defineConfig } from "playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:4173",
    ignoreHTTPSErrors: true,
  },
  webServer: {
    command: "node tools/build.js && node tools/serve.js",
    url: "http://localhost:4173",
    reuseExistingServer: true,
    timeout: 30000,
  },
});
