import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  seed: "",
  captureDownloads: vi.fn(),
  loadDownloads: vi.fn(),
  seedResolver: vi.fn(),
  loadUsers: vi.fn(),
  loadRecordingScope: vi.fn()
}));

vi.mock("../downloads.js", () => ({ captureDownloads: mocks.captureDownloads, loadDownloads: mocks.loadDownloads, seedResolver: mocks.seedResolver }));
vi.mock("../fixtures/manifest.js", () => ({ loadUsers: mocks.loadUsers }));
vi.mock("../scope.js", () => ({ loadRecordingScope: mocks.loadRecordingScope }));
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

const SEED = { seededAt: "2026-01-01T00:00:00.000Z", publications: { a: { artefactId: "a1" } }, records: { r: { id: "r1" } } };
const SPECS = [
  { id: "one", pip: { path: "/download-one" }, cath: { path: "/cath-one" } },
  { id: "two", pip: { path: "/download-two" }, cath: { path: "/cath-two" } }
];

describe("pip record-downloads script", () => {
  const argv = process.argv;
  const resolve = vi.fn();

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.seed = JSON.stringify(SEED);
    vi.spyOn(console, "log").mockImplementation(() => {});
    mocks.loadDownloads.mockResolvedValue(SPECS);
    mocks.seedResolver.mockReturnValue(resolve);
    mocks.loadUsers.mockResolvedValue([
      { id: "admin", provenance: "SSO", provenanceUserId: "admin-oid", role: "SYSTEM_ADMIN", email: "a", forenames: "A", surname: "B" }
    ]);
    mocks.loadRecordingScope.mockResolvedValue(null);
    mocks.captureDownloads.mockResolvedValue({ entries: [{ id: "one" }], notServed: ["two: 404"] });
    process.argv = ["node", "record-downloads.ts", "/tmp/out/downloads"];
  });

  afterEach(() => {
    process.argv = argv;
    vi.restoreAllMocks();
  });

  it("should capture every download as its user through pip's local sign-in", async () => {
    // Act
    await import("./record-downloads.js");

    // Assert
    expect(mocks.seedResolver).toHaveBeenCalledWith(SEED.publications, SEED.records);
    const options = mocks.captureDownloads.mock.calls[0][0];
    expect(options).toMatchObject({ app: "pip", baseUrl: "https://localhost:8180", specs: SPECS, resolve, out: "/tmp/out/downloads", seededAt: SEED.seededAt });
    expect(await options.session("admin")).toEqual({ setup: ["https://localhost:8180/parity-login?oid=admin-oid&flow=SSO&redirect=/"] });
    expect(await options.session("nobody")).toBeNull();
    expect(console.log).toHaveBeenCalledWith("recorded 1 downloads → /tmp/out/downloads");
    expect(console.log).toHaveBeenCalledWith("  not recorded: two: 404");
  });

  it("should capture only the downloads of the routes a ticket recording names", async () => {
    // Arrange
    mocks.loadRecordingScope.mockResolvedValue({ routes: ["/cath-two"] });

    // Act
    await import("./record-downloads.js");

    // Assert
    expect(mocks.captureDownloads.mock.calls[0][0].specs).toEqual([SPECS[1]]);
  });

  it("should fail without an output directory", async () => {
    // Arrange
    process.argv = ["node", "record-downloads.ts"];

    // Act
    const result = import("./record-downloads.js");

    // Assert
    await expect(result).rejects.toThrow("usage: record-downloads.ts <out dir>");
  });
});
