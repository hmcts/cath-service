import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const TARGETS = [{ id: "page--a" }, { id: "page--a@admin" }, { id: "page--a", viewport: "mobile" }, { id: "page--b" }, { id: "list-1" }];

describe("pip scope-targets script", () => {
  const argv = process.argv;
  let dir: string;
  let targets: string;

  beforeEach(async () => {
    vi.resetModules();
    dir = await mkdtemp(path.join(tmpdir(), "pip-scope-targets-"));
    targets = path.join(dir, "targets.json");
    await writeFile(targets, JSON.stringify(TARGETS));
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(async () => {
    process.argv = argv;
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    await rm(dir, { recursive: true, force: true });
  });

  it("should keep only the scope's pages with their variants and mobile captures", async () => {
    // Arrange
    const scope = path.join(dir, "scope.json");
    await writeFile(scope, JSON.stringify({ name: "ticket-1", publications: ["list-1"], pages: ["page--a"], journeys: [], routes: [] }));
    vi.stubEnv("UI_BASELINE_SCOPE", scope);
    process.argv = ["node", "scope-targets.ts", "pages", targets];

    // Act
    await import("./scope-targets.js");

    // Assert
    const kept = JSON.parse(await readFile(targets, "utf-8"));
    expect(kept).toEqual([{ id: "page--a" }, { id: "page--a@admin" }, { id: "page--a", viewport: "mobile" }]);
    expect(console.log).toHaveBeenCalledWith("pages: 3 of 5 targets in ticket-1");
  });

  it("should leave the targets alone in a full recording", async () => {
    // Arrange
    vi.stubEnv("UI_BASELINE_SCOPE", "");
    process.argv = ["node", "scope-targets.ts", "lists", targets];

    // Act
    await import("./scope-targets.js");

    // Assert
    expect(JSON.parse(await readFile(targets, "utf-8"))).toEqual(TARGETS);
    expect(console.log).not.toHaveBeenCalled();
  });

  it("should fail without an area and a targets file", async () => {
    // Arrange
    process.argv = ["node", "scope-targets.ts", "journeys", targets];

    // Act
    const result = import("./scope-targets.js");

    // Assert
    await expect(result).rejects.toThrow("usage: scope-targets.ts lists|pages <targets.json>");
  });
});
