import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BASELINE_CONTAINER, baselineContainer, latestBaseline, pullBaseline, pushBaseline } from "./baseline-store.js";
import type { BlobContainer, StorageSpec } from "./core/index.js";
import type { Environment } from "./environments.js";

const { openBlobContainer } = vi.hoisted(() => ({ openBlobContainer: vi.fn() }));

vi.mock("./core/index.js", () => ({ openBlobContainer }));

const RUN = { pip: "pip-frontend@f9ccef8a", finishedAt: "2026-10-01T12:34:56.789Z", failedCaptures: 0, failedJourneys: [] };

describe("baseline-store", () => {
  let store: ReturnType<typeof memoryStore>;

  beforeEach(() => {
    vi.clearAllMocks();
    store = memoryStore();
    openBlobContainer.mockImplementation((_storage: StorageSpec) => store);
  });

  describe("pushBaseline", () => {
    it("should store the baseline as an archive and name it the latest", async () => {
      // Arrange
      const dir = await baselineDir(RUN);

      // Act
      const stored = await pushBaseline(environment(), dir);

      // Assert
      expect(stored).toMatchObject({
        id: "2026-10-01T12-34-56-789Z",
        blob: "baselines/2026-10-01T12-34-56-789Z.tar.gz",
        pip: RUN.pip,
        finishedAt: RUN.finishedAt
      });
      expect(store.blobs.has(stored.blob)).toBe(true);
      expect(JSON.parse((store.blobs.get("baselines/latest.json") as Buffer).toString("utf-8"))).toEqual(stored);
      expect(openBlobContainer).toHaveBeenCalledWith({ connectionString: "UseDevelopmentStorage=true", accountName: undefined, container: BASELINE_CONTAINER });
    });

    it("should refuse a directory with no run.json", async () => {
      // Arrange
      const dir = await mkdtemp(path.join(tmpdir(), "baseline-"));

      // Act and assert
      await expect(pushBaseline(environment(), dir)).rejects.toThrow(`no run.json in ${dir}`);
      expect(store.blobs.size).toBe(0);
    });

    it("should refuse a baseline with failed captures", async () => {
      // Arrange
      const dir = await baselineDir({ ...RUN, failedCaptures: 2 });

      // Act and assert
      await expect(pushBaseline(environment(), dir)).rejects.toThrow("is incomplete");
      expect(store.blobs.size).toBe(0);
    });

    it("should refuse a baseline with failed journeys", async () => {
      // Arrange
      const dir = await baselineDir({ ...RUN, failedJourneys: ["subscription-basket"] });

      // Act and assert
      await expect(pushBaseline(environment(), dir)).rejects.toThrow("is incomplete");
    });

    it("should refuse a baseline with pages that were asked for and never captured", async () => {
      // Arrange
      const dir = await baselineDir({ ...RUN, missingCaptures: 3 });

      // Act and assert
      await expect(pushBaseline(environment(), dir)).rejects.toThrow("is incomplete");
      expect(store.blobs.size).toBe(0);
    });

    it("should refuse a recording of a deployed pip, but store a local one", async () => {
      // Arrange
      const deployed = await baselineDir({ ...RUN, environment: "aat" });
      const local = await baselineDir({ ...RUN, environment: "local" });

      // Act and assert
      await expect(pushBaseline(environment(), deployed)).rejects.toThrow("was recorded from pip in aat, not a local pinned pip");
      expect(store.blobs.size).toBe(0);
      await expect(pushBaseline(environment(), local)).resolves.toMatchObject({ finishedAt: RUN.finishedAt });
    });

    it("should refuse a ticket recording", async () => {
      // Arrange
      const dir = await baselineDir({ ...RUN, scope: { name: "ticket-312" } });

      // Act and assert
      await expect(pushBaseline(environment(), dir)).rejects.toThrow("is a ticket recording (ticket-312), not all of pip");
      expect(store.blobs.size).toBe(0);
    });
  });

  describe("pullBaseline", () => {
    it("should fetch the latest stored baseline into the directory, replacing what is there", async () => {
      // Arrange
      const stored = await pushBaseline(environment(), await baselineDir(RUN));
      const target = await mkdtemp(path.join(tmpdir(), "pulled-"));
      await writeFile(path.join(target, "stale.txt"), "old");

      // Act
      const pulled = await pullBaseline(environment(), target);

      // Assert
      expect(pulled).toEqual(stored);
      expect(await readFile(path.join(target, "pages/index.jsonl"), "utf-8")).toBe("{}\n");
      expect(await readFile(path.join(target, "linked.txt"), "utf-8")).toBe("followed");
      expect(existsSync(path.join(target, "stale.txt"))).toBe(false);
    });

    it("should fetch a stored baseline by its id", async () => {
      // Arrange
      const older = await pushBaseline(environment(), await baselineDir(RUN));
      await pushBaseline(environment(), await baselineDir({ ...RUN, finishedAt: "2026-10-02T00:00:00.000Z" }));
      const target = path.join(await mkdtemp(path.join(tmpdir(), "pulled-")), "baseline");

      // Act
      const pulled = await pullBaseline(environment(), target, older.id);

      // Assert
      expect(pulled).toEqual({ id: older.id, blob: older.blob });
      expect(JSON.parse(await readFile(path.join(target, "run.json"), "utf-8")).finishedAt).toBe(RUN.finishedAt);
    });
  });

  it("should refuse to pull into a directory outside the output, temp and data folders, leaving it alone", async () => {
    // Arrange
    await pushBaseline(environment(), await baselineDir(RUN));
    const outside = process.cwd();

    // Act and assert
    await expect(pullBaseline(environment(), outside)).rejects.toThrow("the baseline directory must be inside");
    expect(existsSync(path.join(outside, "package.json"))).toBe(true);
  });

  describe("latestBaseline", () => {
    it("should say how to store one when none has been stored", async () => {
      // Act and assert
      await expect(latestBaseline(store)).rejects.toThrow("no baseline has been stored in memory yet");
    });
  });

  describe("baselineContainer", () => {
    it("should open the ui-baseline container in CaTH's storage", () => {
      // Act
      const container = baselineContainer(environment({ accountName: "cathsaperftest" }));

      // Assert
      expect(container).toBe(store);
      expect(openBlobContainer).toHaveBeenCalledWith({ connectionString: undefined, accountName: "cathsaperftest", container: "ui-baseline" });
    });
  });
});

function environment(storage: Environment["cath"]["storage"] = { connectionString: "UseDevelopmentStorage=true" }): Environment {
  return {
    name: "local",
    cath: { baseUrl: "http://localhost:8080", apiUrl: "http://localhost:3001", signIn: "session", storage, filesWaitSeconds: 0 },
    pip: { storage: {} },
    secret: async () => null
  };
}

async function baselineDir(run: Record<string, unknown>): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), "baseline-"));
  await writeFile(path.join(dir, "run.json"), JSON.stringify(run));
  await mkdir(path.join(dir, "pages"));
  await writeFile(path.join(dir, "pages/index.jsonl"), "{}\n");
  const outside = path.join(await mkdtemp(path.join(tmpdir(), "outside-")), "target.txt");
  await writeFile(outside, "followed");
  await symlink(outside, path.join(dir, "linked.txt"));
  return dir;
}

function memoryStore(): BlobContainer & { blobs: Map<string, Buffer> } {
  const blobs = new Map<string, Buffer>();
  return {
    name: "memory",
    blobs,
    async download(blobName) {
      return blobs.get(blobName) ?? null;
    },
    async size(blobName) {
      return blobs.get(blobName)?.length ?? null;
    },
    async upload(blobName, data) {
      blobs.set(blobName, data);
    },
    async uploadFile(blobName, file) {
      blobs.set(blobName, await readFile(file));
    },
    async downloadToFile(blobName, file) {
      const data = blobs.get(blobName);
      if (!data) throw new Error(`no blob ${blobName}`);
      await writeFile(file, data);
    },
    async list(prefix) {
      return [...blobs.keys()].filter((name) => name.startsWith(prefix));
    }
  };
}
