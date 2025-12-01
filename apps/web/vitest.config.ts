import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    coverage: {
      provider: "v8",
      exclude: [
        "**/node_modules/**",
        "**/dist/**",
        "**/*.test.ts",
        "**/*.spec.ts",
        "**/vite.build.ts",
        "**/vitest.config.ts",
        "**/server.ts",
        "**/src/assets/**"
      ]
    }
  }
});
