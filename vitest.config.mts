import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Mirrors tsconfig.json's "@/*" -> "./*" path mapping — vitest
    // doesn't read tsconfig paths on its own.
    alias: {
      "@": import.meta.dirname,
    },
  },
});
