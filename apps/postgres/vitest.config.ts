import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      exclude: ["prisma/seed.ts", "dist/**", "**/*.config.ts", "**/*.config.js"]
    }
  }
});
