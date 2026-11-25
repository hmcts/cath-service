import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Turborepo only rebuilds the hosted image, and runs these tests, when a workspace package that
// package.json depends on changes. cath/seed.ts loads every list-type package (for its converters)
// and imports the libs below, so each must be declared, or a change to it would skip ui-baseline.
const DIR = path.dirname(fileURLToPath(import.meta.url));
const LIBS = ["@hmcts/azure-blob", "@hmcts/list-types-common", "@hmcts/location", "@hmcts/postgres-prisma", "@hmcts/publication"];

async function declared(): Promise<Record<string, string>> {
  return (JSON.parse(await readFile(path.join(DIR, "package.json"), "utf-8")) as { dependencies: Record<string, string> }).dependencies;
}

describe("package.json", () => {
  it("should depend on every list-type package, as seeding loads each of them", async () => {
    // Arrange
    const listTypesDir = path.join(DIR, "../../libs/list-types");
    const entries = (await readdir(listTypesDir, { withFileTypes: true })).filter((entry) => entry.isDirectory());
    const listTypes = await Promise.all(
      entries.map(async (entry) => (JSON.parse(await readFile(path.join(listTypesDir, entry.name, "package.json"), "utf-8")) as { name: string }).name)
    );

    // Act
    const dependencies = await declared();

    // Assert
    expect(listTypes.filter((name) => dependencies[name] !== "workspace:*")).toEqual([]);
  });

  it("should depend on the workspace libs the tool imports", async () => {
    // Act
    const dependencies = await declared();

    // Assert
    expect(LIBS.filter((name) => dependencies[name] !== "workspace:*")).toEqual([]);
  });
});
