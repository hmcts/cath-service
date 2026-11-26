import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      reporter: ["lcov", "text"],
      reportsDirectory: "coverage",
      exclude: ["prisma/seed.ts", "dist/**", "**/*.config.ts", "**/*.config.js"]
    }
  }
});
