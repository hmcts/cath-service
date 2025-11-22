import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    passWithNoTests: true,
    setupFiles: [path.join(__dirname, "vitest.setup.ts")],
    coverage: {
      reporter: ["lcov", "text"],
      reportsDirectory: "coverage",
    },
  },
});
