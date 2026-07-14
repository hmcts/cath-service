import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LIST_TYPES_ROOT = path.resolve(__dirname, "../../../");

describe("guard: every list-type package with a schema must export a validate* function", () => {
  it("should find no packages that have a schema but no validate* export", () => {
    const entries = readdirSync(LIST_TYPES_ROOT, { withFileTypes: true });

    const violations: string[] = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const packageName = entry.name;

      if (packageName === "common") continue;

      const schemasDir = path.join(LIST_TYPES_ROOT, packageName, "src", "schemas");
      if (!existsSync(schemasDir)) continue;

      const schemaFiles = readdirSync(schemasDir).filter((f) => f.endsWith(".json"));
      if (schemaFiles.length === 0) continue;

      const indexPath = path.join(LIST_TYPES_ROOT, packageName, "src", "index.ts");
      if (!existsSync(indexPath)) {
        violations.push(`${packageName}: has schema(s) but no src/index.ts`);
        continue;
      }

      const indexContent = readFileSync(indexPath, "utf-8");
      const hasValidateExport = /export\s+.*validate[A-Z]/.test(indexContent);

      if (!hasValidateExport) {
        violations.push(`${packageName}: has schema(s) but exports no validate* function`);
      }
    }

    expect(violations).toEqual([]);
  });
});
