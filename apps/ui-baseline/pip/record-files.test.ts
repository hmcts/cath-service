import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  seed: "",
  collectFiles: vi.fn(),
  openBlobContainer: vi.fn(),
  loadEnvironment: vi.fn(),
  filesStorage: vi.fn(),
  loadManifest: vi.fn()
}));

vi.mock("../core/index.js", () => ({ collectFiles: mocks.collectFiles, openBlobContainer: mocks.openBlobContainer }));
vi.mock("../environments.js", () => ({ loadEnvironment: mocks.loadEnvironment, filesStorage: mocks.filesStorage }));
vi.mock("../fixtures/manifest.js", () => ({ loadManifest: mocks.loadManifest }));
// pip's seed is read from output/seed/pip.json, which the test supplies
vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return {
    ...actual,
    readFile: vi.fn(async (file: string, options?: unknown) =>
      String(file).endsWith(path.join("output", "seed", "pip.json")) ? mocks.seed : actual.readFile(file, options as never)
    )
  };
});

const SEED = {
  seededAt: "2026-01-01T00:00:00.000Z",
  publications: { "json-list": { artefactId: "a1" }, "other-list": { artefactId: "a2" }, "flat-list": { artefactId: "a3" } }
};

describe("pip record-files script", () => {
  const argv = process.argv;
  const container = { name: "publications" };

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.seed = JSON.stringify(SEED);
    vi.stubEnv("UI_BASELINE_SCOPE", "");
    vi.spyOn(console, "log").mockImplementation(() => {});
    mocks.loadManifest.mockResolvedValue({
      publications: [
        { id: "json-list", format: "json" },
        { id: "other-list", format: "excel" },
        { id: "flat-list", format: "flat-file" }
      ]
    });
    mocks.loadEnvironment.mockResolvedValue({ name: "local", pip: { storage: {} } });
    mocks.filesStorage.mockReturnValue({ container: "publications" });
    mocks.openBlobContainer.mockReturnValue(container);
    mocks.collectFiles.mockResolvedValue([
      { id: "json-list", file: "a.pdf" },
      { id: "json-list", file: "a.xlsx" },
      { id: "other-list", file: "b.pdf" }
    ]);
  });

  afterEach(() => {
    process.argv = argv;
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("should collect the files pip generated for every seeded publication but flat files", async () => {
    // Arrange
    process.argv = ["node", "record-files.ts", "/tmp/out/files"];

    // Act
    await import("./record-files.js");

    // Assert
    expect(mocks.loadEnvironment).toHaveBeenCalledWith("local");
    expect(mocks.filesStorage).toHaveBeenCalledWith("pip", { storage: {} });
    expect(mocks.collectFiles).toHaveBeenCalledWith({
      container,
      out: "/tmp/out/files",
      waitSeconds: 60,
      publications: [
        { id: "json-list", artefactId: "a1", seededAt: SEED.seededAt },
        { id: "other-list", artefactId: "a2", seededAt: SEED.seededAt }
      ]
    });
    expect(console.log).toHaveBeenCalledWith("recorded 3 files for 2 publications → /tmp/out/files");
  });

  it("should fail without an output directory", async () => {
    // Arrange
    process.argv = ["node", "record-files.ts"];

    // Act
    const result = import("./record-files.js");

    // Assert
    await expect(result).rejects.toThrow("usage: record-files.ts <out dir>");
  });
});
