import { mkdtemp } from "node:fs/promises";
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

async function cache(latestId: { value: string }) {
  const dir = await mkdtemp(path.join(tmpdir(), "baseline-"));
  const pull = vi.fn(async (_dir: string, _id: string) => {});
  const baselines = createBaselineCache({ dir, store: {} as BlobContainer, latest: async () => stored(latestId.value), pull });
  return { baselines, pull, dir };
}

describe("createBaselineCache", () => {
  it("should fetch the latest baseline once, however many ask at the same time", async () => {
    // Arrange
    const { baselines, pull, dir } = await cache({ value: "one" });

    // Act
    const dirs = await Promise.all([baselines.ensure(), baselines.ensure(), baselines.ensure()]);

    // Assert
    expect(dirs).toEqual([dir, dir, dir]);
    expect(pull).toHaveBeenCalledTimes(1);
    expect(pull).toHaveBeenCalledWith(dir, "one");
  });

  it("should fetch again only when a newer baseline has been stored", async () => {
    // Arrange
    const latest = { value: "one" };
    const { baselines, pull } = await cache(latest);
    await baselines.ensure();

    // Act
    await baselines.ensure();
    latest.value = "two";
    await baselines.ensure();

    // Assert
    expect(pull.mock.calls.map(([, id]) => id)).toEqual(["one", "two"]);
  });

  it("should say which baseline it has", async () => {
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
