import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    clearMocks: true,
    coverage: {
      provider: "v8",
      reporter: ["lcov", "text"],
      reportsDirectory: "coverage",
      exclude: [
        "**/node_modules/**",
        "**/dist/**",
        "**/*.test.ts",
        "**/*.spec.ts",
        "**/vite.build.ts",
        "**/vitest.config.ts",
        "**/server.ts",
        "**/src/assets/css/**",
        "**/src/assets/vite-config/**"
      ]
    }
  }
});
