import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import type { BlobContainer } from "../core/index.js";
import { createBaselineCache } from "./baseline.js";

const stored = (id: string) => ({
  id,
  blob: `baselines/${id}.tar.gz`,
  pip: "pip-frontend@f9ccef8a",
  finishedAt: "2026-10-30T09:00:00Z",
  pushedAt: "2026-10-30T10:00:00Z"
});

async function cache(latestId: { value: string }, root?: string) {
  const dir = root ?? (await mkdtemp(path.join(tmpdir(), "baseline-")));
  // As pullBaseline does, the baseline is unpacked into the directory it is given
  const pull = vi.fn(async (into: string, _id: string) => {
    await mkdir(into, { recursive: true });
  });
  const latest = vi.fn(async () => stored(latestId.value));
  const baselines = createBaselineCache({ root: dir, store: {} as BlobContainer, latest, pull });
  return { baselines, pull, latest, root: dir };
}

const kept = async (root: string) => (await readdir(root)).sort();

describe("createBaselineCache", () => {
  it("should refuse a baseline id that reaches outside the baselines folder, without fetching it", async () => {
    // Arrange
    const { baselines, pull } = await cache({ value: "one" });

    // Act
    const asked = baselines.ensure("../runs");

    // Assert
    await expect(asked).rejects.toThrow('"../runs" is not a baseline id');
    expect(pull).not.toHaveBeenCalled();
  });

  it("should fetch the latest baseline once, however many ask at the same time", async () => {
    // Arrange
    const { baselines, pull, root } = await cache({ value: "one" });

    // Act
    const pinned = await Promise.all([baselines.ensure(), baselines.ensure(), baselines.ensure()]);

    // Assert
    expect(pinned.map(({ id, dir }) => ({ id, dir }))).toEqual(Array(3).fill({ id: "one", dir: path.join(root, "one") }));
    expect(pull).toHaveBeenCalledTimes(1);
    expect(pull).toHaveBeenCalledWith(path.join(root, "one"), "one");
  });

  it("should fetch again only when a newer baseline has been stored, into a directory of its own", async () => {
    // Arrange
    const latest = { value: "one" };
    const { baselines, pull, root } = await cache(latest);
    const first = await baselines.ensure();

    // Act
    await baselines.ensure();
    latest.value = "two";
    const second = await baselines.ensure();

    // Assert
    expect(pull.mock.calls.map(([, id]) => id)).toEqual(["one", "two"]);
    expect(first.dir).toBe(path.join(root, "one"));
    expect(second.dir).toBe(path.join(root, "two"));
  });

  it("should fetch a baseline by its id without looking up the latest", async () => {
    // Arrange
    const { baselines, pull, latest, root } = await cache({ value: "two" });

    // Act
    const pinned = await baselines.ensure("one");

    // Assert
    expect(pinned).toMatchObject({ id: "one", dir: path.join(root, "one") });
    expect(pull).toHaveBeenCalledWith(path.join(root, "one"), "one");
    expect(latest).not.toHaveBeenCalled();
  });

  it("should keep a fetched baseline's directory rather than fetch it again", async () => {
    // Arrange
    const earlierPod = await cache({ value: "one" });
    await earlierPod.baselines.ensure();
    const { baselines, pull } = await cache({ value: "one" }, earlierPod.root);

    // Act
    await baselines.ensure();
    await baselines.ensure("one");

    // Assert
    expect(pull).not.toHaveBeenCalled();
  });

  it("should fetch again a baseline whose directory was cut short", async () => {
    // Arrange
    const root = await mkdtemp(path.join(tmpdir(), "baseline-"));
    await mkdir(path.join(root, "one"), { recursive: true });
    const { baselines, pull } = await cache({ value: "one" }, root);

    // Act
    await baselines.ensure();

    // Assert
    expect(pull).toHaveBeenCalledWith(path.join(root, "one"), "one");
  });

  it("should keep only the latest and the two most recently used others once released", async () => {
    // Arrange
    const { baselines, root } = await cache({ value: "latest" });
    (await baselines.ensure()).release();
    for (const id of ["a", "b", "c"]) (await baselines.ensure(id)).release();

    // Act
    (await baselines.ensure("d")).release();

    // Assert
    expect(await kept(root)).toEqual(["c", "d", "latest"]);
  });

  it("should not remove a baseline a check still holds, however long ago it was asked for", async () => {
    // Arrange
    const { baselines, root } = await cache({ value: "latest" });
    const running = await baselines.ensure("old");
    for (const id of ["a", "b", "c"]) (await baselines.ensure(id)).release();

    // Act
    const keptWhileHeld = await kept(root);
    running.release();
    (await baselines.ensure("d")).release();

    // Assert
    expect(keptWhileHeld).toContain("old");
    expect(await kept(root)).not.toContain("old");
  });

  it("should remove baselines left on disk from before, once it fetches one", async () => {
    // Arrange
    const root = await mkdtemp(path.join(tmpdir(), "baseline-"));
    for (const id of ["left-1", "left-2", "left-3"]) await mkdir(path.join(root, id));
    const { baselines } = await cache({ value: "latest" }, root);

    // Act
    (await baselines.ensure()).release();

    // Assert
    expect(existsSync(path.join(root, "latest"))).toBe(true);
    expect(await kept(root)).toHaveLength(3);
    expect(await kept(root)).toContain("latest");
  });

  it("should say which baseline it has once it is on disk", async () => {
    // Arrange
    const { baselines } = await cache({ value: "one" });

    // Act
    const before = await baselines.status();
    await baselines.ensure();
    const after = await baselines.status();

    // Assert
    expect(before).toEqual({ ready: false, description: "not fetched yet" });
    expect(after).toEqual({ ready: true, description: "recorded Fri, 30 Oct 2026 09:00:00 GMT from pip-frontend@f9ccef8a" });
  });
});
