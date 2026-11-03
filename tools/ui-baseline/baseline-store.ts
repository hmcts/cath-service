import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { type BlobContainer, openBlobContainer } from "@hmcts/ui-baseline";
import { type Environment, filesStorage } from "./environments.js";
import { systemCommand } from "./system-command.js";

// Keeps recorded pip baselines in the environment's storage, so a check run anywhere (the hosted
// app, CI, a laptop) uses one recorded once rather than recording its own. Each is stored whole as
// baselines/<id>.tar.gz, with baselines/latest.json naming the newest. Too big for git, which is
// why they are not committed.
const PARITY_DIR = path.dirname(fileURLToPath(import.meta.url));
export const BASELINE_CONTAINER = "ui-baseline";
const LATEST = "baselines/latest.json";

export async function pushBaseline(environment: Environment, dir: string): Promise<StoredBaseline> {
  const runFile = path.join(dir, "run.json");
  if (!existsSync(runFile)) throw new Error(`no run.json in ${dir}: record a baseline first (yarn ui-baseline:record-pip)`);
  const run = JSON.parse(await readFile(runFile, "utf-8")) as {
    pip: string;
    finishedAt: string;
    failedCaptures: number;
    failedJourneys: string[];
    scope?: { name: string };
  };
  if (run.failedCaptures || run.failedJourneys.length) throw new Error(`the baseline in ${dir} is incomplete (see its run.json), so it is not stored`);
  // The stored baseline is the one every check falls back to, so it must be a full recording
  if (run.scope) throw new Error(`the baseline in ${dir} is a ticket recording (${run.scope.name}), not all of pip, so it is not stored`);

  const id = `${run.finishedAt.replace(/[:.]/g, "-")}`;
  const stored: StoredBaseline = { id, blob: `baselines/${id}.tar.gz`, pip: run.pip, finishedAt: run.finishedAt, pushedAt: new Date().toISOString() };
  const container = baselineContainer(environment);
  const scratch = await mkdtemp(path.join(tmpdir(), "ui-baseline-"));
  try {
    const archive = path.join(scratch, "baseline.tar.gz");
    // -h stores what symlinks point at, so the archive stands alone
    execFileSync(systemCommand("tar"), ["-czhf", archive, "-C", dir, "."]);
    await container.uploadFile(stored.blob, archive, "application/gzip");
    await container.upload(LATEST, Buffer.from(`${JSON.stringify(stored, null, 2)}\n`), "application/json");
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
  return stored;
}

// Downloads a stored baseline (the latest unless an id is given) into dir, replacing what is there
export async function pullBaseline(environment: Environment, dir: string, id?: string): Promise<StoredBaseline> {
  const container = baselineContainer(environment);
  const stored = id ? ({ id, blob: `baselines/${id}.tar.gz` } as StoredBaseline) : await latestBaseline(container);
  const scratch = await mkdtemp(path.join(tmpdir(), "ui-baseline-"));
  try {
    const archive = path.join(scratch, "baseline.tar.gz");
    await container.downloadToFile(stored.blob, archive);
    await rm(dir, { recursive: true, force: true });
    await mkdir(dir, { recursive: true });
    execFileSync(systemCommand("tar"), ["-xzf", archive, "-C", dir]);
  } finally {
    await rm(scratch, { recursive: true, force: true });
  }
  return stored;
}

export async function latestBaseline(container: BlobContainer): Promise<StoredBaseline> {
  const latest = await container.download(LATEST);
  if (!latest) throw new Error(`no baseline has been stored in ${container.name} yet: record one and push it (yarn ui-baseline:baseline push)`);
  return JSON.parse(latest.toString("utf-8")) as StoredBaseline;
}

export function baselineContainer(environment: Environment): BlobContainer {
  return openBlobContainer(filesStorage("cath", environment.cath, BASELINE_CONTAINER));
}

export const DEFAULT_BASELINE_DIR = path.join(PARITY_DIR, "output/baseline");

export interface StoredBaseline {
  id: string;
  blob: string;
  // The pip commits it was recorded from, as run.json names them
  pip: string;
  finishedAt: string;
  pushedAt: string;
}
