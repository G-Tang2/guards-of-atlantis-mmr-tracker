import { defineConfig, devices } from "@playwright/test";

// End-to-end tests only — vitest (npm test) still owns unit tests. Kept
// separate (own config, own directory, own script) since Playwright
// needs a real running app + real browser, not just a JS environment.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3200",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // Always a fresh production build on its own port, never the everyday
  // `next dev` server (which usually stays running continuously on 3000
  // during normal work on this repo) — two real bugs in a row turned out
  // to be masked by dev-mode Fast Refresh not fully re-registering native
  // event listeners set up inside a `useEffect(() => {...}, [])` after an
  // edit to the function body, so a passing run against dev could still
  // reflect stale logic. `next build && next start` has no such
  // ambiguity, and (unlike a second `next dev`) doesn't conflict with
  // the `.next` cache lock a dev server already running on 3000 holds.
  webServer: {
    command: "npm run build && npm run start -- -p 3200",
    url: "http://localhost:3200",
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
