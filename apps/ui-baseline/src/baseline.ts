import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { BlobContainer } from "@hmcts/ui-baseline";
import type { StoredBaseline } from "@hmcts/ui-baseline/baseline-store";

// Keeps the newest stored pip baseline on this pod's disk for checks to compare against, fetching it
// again only when a newer one has been stored. One fetch at a time, however many checks ask.
const MARKER = ".stored-baseline.json";

export function createBaselineCache(options: BaselineCacheOptions) {
  let fetching: Promise<string> | null = null;
  const marker = path.join(options.dir, MARKER);
  const local = async () => (existsSync(marker) ? (JSON.parse(await readFile(marker, "utf-8")) as StoredBaseline) : null);

  const ensure = async (): Promise<string> => {
    const latest = await options.latest(options.store);
    if ((await local())?.id === latest.id) return options.dir;
    await options.pull(options.dir, latest.id);
    await writeFile(marker, JSON.stringify(latest));
    return options.dir;
  };

  return {
    ensure(): Promise<string> {
      fetching ??= ensure().finally(() => {
        fetching = null;
      });
      return fetching;
    },
    async status(): Promise<{ ready: boolean; description: string }> {
      const stored = await local();
      if (stored) return { ready: true, description: `recorded ${new Date(stored.finishedAt).toUTCString()} from ${stored.pip}` };
      return { ready: false, description: fetching ? "being fetched" : "not fetched yet" };
    }
  };
}

export interface BaselineCacheOptions {
  dir: string;
  store: BlobContainer;
  latest: (store: BlobContainer) => Promise<StoredBaseline>;
  pull: (dir: string, id: string) => Promise<unknown>;
}
