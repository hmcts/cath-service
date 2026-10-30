import { execFileSync, spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { createWriteStream, existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { BlobContainer } from "@hmcts/ui-baseline";

// Runs parity checks and file comparisons one at a time, each as a child process of the tool's own
// scripts (tools/ui-baseline/check.ts, compare-files.ts), so a check run here is the same check a
// developer runs. Each run's directory is archived to storage when it finishes, and restored from
// there when it is asked for after the pod has restarted.
const RUNS_PREFIX = "runs/";
const ARTEFACT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LIST_TYPE = /^[A-Z][A-Z0-9_]{2,}$/;
const ROUTE = /^\/[a-z0-9][a-z0-9/-]*$/;
const NAME = /^[a-z0-9][a-z0-9-]{0,59}$/;

export function createRunner(options: RunnerOptions): Runner {
  const runs = new Map<string, RunRecord>();
  const execute = options.execute ?? executeScript;
  let queue: Promise<void> = Promise.resolve();

  const runDir = (id: string) => path.join(options.dataDir, "runs", id);
  const save = async (record: RunRecord) => {
    runs.set(record.id, record);
    await mkdir(runDir(record.id), { recursive: true });
    await writeFile(path.join(runDir(record.id), "run.json"), `${JSON.stringify(record, null, 2)}\n`);
  };

  const perform = async (record: RunRecord) => {
    const dir = runDir(record.id);
    try {
      await save({ ...record, status: "running", startedAt: new Date().toISOString() });
      const baseline = record.kind === "check" ? await options.baseline() : null;
      const { script, args } = commandFor(record, dir, options.environment, baseline);
      await execute(script, args, { cwd: options.repoDir, log: path.join(dir, "log.txt"), env: { UI_BASELINE_COMMIT: options.commit } });
      const summary = await summarise(record, dir);
      await save({ ...(runs.get(record.id) as RunRecord), status: summary ? "finished" : "failed", finishedAt: new Date().toISOString(), summary });
    } catch (error) {
      await save({ ...(runs.get(record.id) as RunRecord), status: "failed", finishedAt: new Date().toISOString(), error: (error as Error).message });
    }
    await archive(runs.get(record.id) as RunRecord).catch((error: Error) => console.error(`[ui-baseline] could not store run ${record.id}: ${error.message}`));
  };

  const archive = async (record: RunRecord) => {
    if (!options.store) return;
    const file = path.join(options.dataDir, `${record.id}.tar.gz`);
    // Symlinks into the baseline are kept as links, not copied: the baseline is stored separately
    execFileSync("tar", ["-czf", file, "-C", runDir(record.id), "."]);
    try {
      await options.store.uploadFile(`${RUNS_PREFIX}${record.id}.tar.gz`, file, "application/gzip");
      await options.store.upload(`${RUNS_PREFIX}${record.id}.json`, Buffer.from(JSON.stringify(record)), "application/json");
    } finally {
      await rm(file, { force: true });
    }
  };

  return {
    start(request, requestedBy) {
      const record: RunRecord = {
        ...validated(request),
        id: `${new Date().toISOString().replace(/[:.]/g, "-")}-${randomBytes(3).toString("hex")}`,
        status: "queued",
        requestedBy,
        createdAt: new Date().toISOString()
      };
      runs.set(record.id, record);
      queue = queue.then(() => perform(record));
      return record;
    },
    list: () => [...runs.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    get: (id) => runs.get(id),
    async directory(id) {
      const record = runs.get(id);
      if (!record) return null;
      const dir = runDir(id);
      if (existsSync(path.join(dir, "run.json")) || !options.store) return dir;
      // Not on this pod's disk: restore it from storage
      const file = path.join(options.dataDir, `${id}.tar.gz`);
      await mkdir(dir, { recursive: true });
      await options.store.downloadToFile(`${RUNS_PREFIX}${id}.tar.gz`, file);
      execFileSync("tar", ["-xzf", file, "-C", dir]);
      await rm(file, { force: true });
      return dir;
    },
    async restore() {
      if (!options.store) return;
      for (const name of (await options.store.list(RUNS_PREFIX)).filter((blob) => blob.endsWith(".json"))) {
        const data = await options.store.download(name);
        if (!data) continue;
        const record = JSON.parse(data.toString("utf-8")) as RunRecord;
        runs.set(record.id, record.status === "queued" || record.status === "running" ? { ...record, status: "failed", error: "interrupted" } : record);
      }
    },
    idle: () => queue
  };
}

// The tool's script and arguments for a run; the arguments go straight to the process, never a shell
function commandFor(record: RunRecord, dir: string, environment: string, baseline: string | null): { script: string; args: string[] } {
  if (record.kind === "files")
    return {
      script: "tools/ui-baseline/compare-files.ts",
      args: [
        `--env=${environment}`,
        `--pip=${record.pipArtefactId}`,
        `--cath=${record.cathArtefactId}`,
        `--name=${record.name ?? "publication"}`,
        `--out=${path.join(dir, "files")}`
      ]
    };
  const scope =
    record.scope === "all"
      ? ["--all"]
      : record.scope === "list-types"
        ? record.listTypes.flatMap((name) => ["--list-type", name])
        : record.routes.flatMap((route) => ["--route", route]);
  return {
    script: "tools/ui-baseline/check.ts",
    args: [`--env=${environment}`, `--baseline=${baseline}`, `--out=${path.join(dir, "check")}`, "--no-review", ...scope]
  };
}

// What a finished run found, read from the files the tool wrote; null when it wrote none
async function summarise(record: RunRecord, dir: string): Promise<RunSummary | null> {
  const read = async <T>(file: string): Promise<T | null> => (existsSync(file) ? (JSON.parse(await readFile(file, "utf-8")) as T) : null);
  type Totals = { totals: { pairs?: number; match: number; differs: number; notCaptured?: number; files?: number; missing?: number; extra?: number } };
  if (record.kind === "files") {
    const files = await read<Totals>(path.join(dir, "files/compare/files-compare.json"));
    return files ? { files: files.totals } : null;
  }
  if (!existsSync(path.join(dir, "check/report/index.html"))) return null;
  const [lists, pages, files] = await Promise.all(
    ["lists/compare.json", "pages/compare.json", "files/files-compare.json"].map((file) => read<Totals>(path.join(dir, "check/compare", file)))
  );
  return { lists: lists?.totals, pages: pages?.totals, files: files?.totals };
}

function validated(request: RunRequest): RunRequest {
  if (request.kind === "files") {
    if (!ARTEFACT_ID.test(request.pipArtefactId) || !ARTEFACT_ID.test(request.cathArtefactId))
      throw new RunRequestError("Enter both artefact ids, like 2a7b1d4e-0000-4000-8000-000000000000");
    if (request.name !== undefined && !NAME.test(request.name)) throw new RunRequestError("Name the publication with lower-case letters, numbers and hyphens");
    return request;
  }
  if (request.scope === "list-types" && (!request.listTypes.length || !request.listTypes.every((name) => LIST_TYPE.test(name))))
    throw new RunRequestError("Enter list type names like CIVIL_DAILY_CAUSE_LIST");
  if (request.scope === "routes" && (!request.routes.length || !request.routes.every((route) => ROUTE.test(route))))
    throw new RunRequestError("Enter page routes like /summary-of-publications");
  return request;
}

function executeScript(script: string, args: string[], options: { cwd: string; log: string; env: Record<string, string | undefined> }): Promise<number> {
  return new Promise((resolve, reject) => {
    const log = createWriteStream(options.log);
    const child = spawn(path.join(options.cwd, "node_modules/.bin/tsx"), [script, ...args], { cwd: options.cwd, env: { ...process.env, ...options.env } });
    child.stdout.pipe(log);
    child.stderr.pipe(log);
    child.on("error", reject);
    child.on("close", (code) => {
      log.end();
      resolve(code ?? 1);
    });
  });
}

export class RunRequestError extends Error {}

export type RunRequest =
  | { kind: "check"; scope: "all" }
  | { kind: "check"; scope: "list-types"; listTypes: string[] }
  | { kind: "check"; scope: "routes"; routes: string[] }
  | { kind: "files"; pipArtefactId: string; cathArtefactId: string; name?: string };

export type RunRecord = RunRequest & {
  id: string;
  status: "queued" | "running" | "finished" | "failed";
  requestedBy: string;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  summary?: RunSummary | null;
  error?: string;
};

export interface RunSummary {
  lists?: { pairs?: number; match: number; differs: number; notCaptured?: number };
  pages?: { pairs?: number; match: number; differs: number; notCaptured?: number };
  files?: { files?: number; match: number; differs: number; missing?: number; extra?: number };
}

export interface Runner {
  start(request: RunRequest, requestedBy: string): RunRecord;
  list(): RunRecord[];
  get(id: string): RunRecord | undefined;
  // The run's directory on this pod, restored from storage if need be; null for an unknown run
  directory(id: string): Promise<string | null>;
  // Loads the runs stored before this pod started
  restore(): Promise<void>;
  // Settles when every queued run has finished
  idle(): Promise<void>;
}

export interface RunnerOptions {
  dataDir: string;
  // The monorepo root the tool's scripts run from
  repoDir: string;
  environment: string;
  commit: string;
  store: BlobContainer | null;
  // The directory of the baseline checks compare against, fetched if need be
  baseline: () => Promise<string>;
  execute?: typeof executeScript;
}
