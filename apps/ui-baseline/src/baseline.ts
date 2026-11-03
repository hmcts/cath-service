import { existsSync } from "node:fs";
import { readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { StoredBaseline } from "../baseline-store.js";
import type { BlobContainer } from "../core/index.js";
import type { PinnedBaseline } from "./runs.js";

// Keeps stored pip baselines on this pod's disk for checks to compare against, each in a directory
// of its own named by its id. A directory is written once and never replaced, because a check's
// report links into the baseline it ran against: pulling a newer baseline must not change the
// reports of checks that ran before it. One fetch per baseline at a time, however many ask.
//
// A baseline is several hundred megabytes and the pod's disk is its ephemeral storage (the nodejs
// chart can mount only config maps, so no size-limited volume), so after each fetch the cache keeps
// the latest baseline and the most recently used others, and deletes the rest. A baseline being
// fetched, or held by a check running against it, is never deleted. A report whose baseline was
// deleted fetches it again when it is next opened.
const MARKER = ".stored-baseline.json";
// Besides the latest: enough for the reports people are looking at without filling the disk
const KEPT_RECENT = 2;

export function createBaselineCache(options: BaselineCacheOptions) {
  const fetching = new Map<string, Promise<void>>();
  // How many holders each baseline has; a held baseline is in use and kept
  const holds = new Map<string, number>();
  // When each baseline was last asked for, as a running count, newest highest
  const lastUsed = new Map<string, number>();
  let uses = 0;
  let lookingUp: Promise<StoredBaseline> | null = null;
  let latest: StoredBaseline | null = null;

  const hold = (id: string): PinnedBaseline => {
    holds.set(id, (holds.get(id) ?? 0) + 1);
    lastUsed.set(id, ++uses);
    let released = false;
    return {
      id,
      dir: path.join(options.root, id),
      release: () => {
        if (released) return;
        released = true;
        const left = (holds.get(id) ?? 1) - 1;
        if (left > 0) holds.set(id, left);
        else holds.delete(id);
      }
    };
  };

  const prune = async () => {
    const names = await readdir(options.root).catch(() => [] as string[]);
    // Directories left from before this pod started were never used by it, so they go first
    const recent = names
      .filter((name) => name !== latest?.id)
      .sort((a, b) => (lastUsed.get(b) ?? 0) - (lastUsed.get(a) ?? 0))
      .slice(0, KEPT_RECENT);
    const kept = new Set([...recent, ...holds.keys(), ...fetching.keys(), ...(latest ? [latest.id] : [])]);
    await Promise.all(names.filter((name) => !kept.has(name)).map((name) => rm(path.join(options.root, name), { recursive: true, force: true })));
  };

  const fetch = (id: string): Promise<void> => {
    const existing = fetching.get(id);
    if (existing) return existing;
    const dir = path.join(options.root, id);
    // The marker is written last, so a directory without one was cut short and is fetched again
    if (existsSync(path.join(dir, MARKER))) return Promise.resolve();
    const pending = (async () => {
      await options.pull(dir, id);
      await writeFile(path.join(dir, MARKER), JSON.stringify({ id }));
    })().finally(() => fetching.delete(id));
    fetching.set(id, pending);
    return pending.then(() => prune().catch((error: Error) => console.error(`[ui-baseline] could not remove old baselines: ${error.message}`)));
  };

  // Held from before the fetch starts, so a prune elsewhere cannot delete it while it arrives
  const pinned = async (id: string): Promise<PinnedBaseline> => {
    const held = hold(id);
    try {
      await fetch(id);
      return held;
    } catch (error) {
      held.release();
      throw error;
    }
  };

  return {
    // The baseline with the given id, or the latest stored one, held until the caller releases it
    async ensure(id?: string): Promise<PinnedBaseline> {
      if (id) return pinned(id);
      lookingUp ??= options.latest(options.store).finally(() => {
        lookingUp = null;
      });
      const stored = await lookingUp;
      latest = stored;
      return pinned(stored.id);
    },
    async status(): Promise<{ ready: boolean; description: string }> {
      if (latest && existsSync(path.join(options.root, latest.id, MARKER)))
        return { ready: true, description: `recorded ${new Date(latest.finishedAt).toUTCString()} from ${latest.pip}` };
      return { ready: false, description: fetching.size || lookingUp ? "being fetched" : "not fetched yet" };
    }
  };
}

export interface BaselineCacheOptions {
  // Each baseline is kept in <root>/<id>
  root: string;
  store: BlobContainer;
  latest: (store: BlobContainer) => Promise<StoredBaseline>;
  pull: (dir: string, id: string) => Promise<unknown>;
}
