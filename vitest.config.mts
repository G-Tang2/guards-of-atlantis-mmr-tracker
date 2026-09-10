import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // e2e/ holds Playwright specs (npm run test:e2e) — they use
    // @playwright/test's own test()/expect(), not vitest's, and need a
    // real browser + running app rather than vitest's JS environment.
    exclude: ["**/node_modules/**", "e2e/**"],
  },
  resolve: {
    // Mirrors tsconfig.json's "@/*" -> "./*" path mapping — vitest
    // doesn't read tsconfig paths on its own.
    alias: {
      "@": import.meta.dirname,
    },
  },
});
