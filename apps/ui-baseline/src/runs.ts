import { execFile, spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { createWriteStream, existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { ARTEFACT_ID, LIST_TYPE, ROUTE } from "../cli-input.js";
import type { BlobContainer } from "../core/index.js";
import { EXIT_DIFFERENCES, EXIT_NOTHING_TO_CHECK, EXIT_TIMED_OUT } from "../exit-codes.js";
import { systemCommand } from "../system-command.js";

// Runs parity checks and file comparisons one at a time, each as a child process of the tool's own
// scripts (apps/ui-baseline/check.ts, compare-files.ts), so a check run here is the same check a
// developer runs. Each run's directory is archived to storage when it finishes, and restored from
// there when it is asked for after the pod has restarted.
const RUNS_PREFIX = "runs/";
// The error a run that was queued or running when its pod stopped is restored with
const INTERRUPTED = "interrupted";
// A queued run is handed to the next pod when its own stops. With no storage to hand it over through
// (a local run of the app), it is failed with this instead.
const RESTARTED_BEFORE_START = "The hosted check restarted before this run began. Start it again.";
// Runs that ended without an archive, so there is nothing in storage to fetch for them
const NEVER_ARCHIVED = new Set([INTERRUPTED, RESTARTED_BEFORE_START]);
// How long a run may take before it is stopped, so one that hangs (Chromium, a sign-in, a blob poll)
// cannot hold up the queue until the pod restarts. A check of all of CaTH takes well under an hour.
const RUN_TIME_LIMIT_MS = 2 * 60 * 60 * 1000;
// How long a stopped run has to remove what it seeded in CaTH (check.ts) before it is killed
const STOP_GRACE_MS = 2 * 60 * 1000;
// A queued or running run's record is stored again this often, until its last record is stored, so
// another pod can tell it is still going: a redeploy starts the new pod while the old one finishes its
// runs (drain, server.ts)
const HEARTBEAT_MS = 60 * 1000;
// A run whose record has not been stored for this many heartbeats is no longer going anywhere
const HEARTBEATS_BEFORE_STALE = 3;
// How often a pod looks at the stored record of a run going on another pod
const WATCH_MS = 30 * 1000;
const RESTARTING = "The hosted check is restarting. Start the run again in a few minutes.";
const NAME = /^[a-z0-9][a-z0-9-]{0,59}$/;
// The tool ran to the end: it found nothing, or found differences
const COMPLETED = new Set([0, EXIT_DIFFERENCES]);
// Stored runs fetched at once when the pod starts
const RESTORE_CONCURRENCY = 8;
// tar runs off the event loop, so a big run's archive does not stall the pages or the health check
const execFileAsync = promisify(execFile);

export function createRunner(options: RunnerOptions): Runner {
  const runs = new Map<string, RunRecord>();
  const restoring = new Map<string, Promise<string>>();
  const execute = options.execute ?? executeScript;
  // This pod, as a run record names the pod that runs it (owner)
  const pod = options.pod ?? process.env.HOSTNAME ?? `pod-${randomBytes(3).toString("hex")}`;
  // Runs this pod will run, oldest first: its own, and those handed to it by a pod that stopped
  const pending: RunRecord[] = [];
  // Taking the pending runs one at a time, while there are any; null when it is not
  let pumping: Promise<void> | null = null;
  // Each queued or running run's heartbeat (HEARTBEAT_MS), until its last record is stored
  const heartbeats = new Map<string, ReturnType<typeof setInterval>>();
  // Set when the pod is stopping: the run going is finished, and no other is started
  let draining = false;
  const heartbeatMs = options.heartbeatMs ?? HEARTBEAT_MS;
  const watchMs = options.watchMs ?? WATCH_MS;
  const staleMs = heartbeatMs * HEARTBEATS_BEFORE_STALE;
  const watching = new Set<ReturnType<typeof setInterval>>();
  // Lists the stored runs again while the pod is up (scan), from when the first load ends
  let scanner: ReturnType<typeof setInterval> | undefined;
  // Stored runs being loaded, so two lists at once do not load, and watch, the same run twice
  const loading = new Set<string>();
  // Runs going on another pod, each settling when it ends there. A run here waits for them before it
  // starts: two checks at once share the IDAM test accounts and the records seeded in CaTH, so each
  // would change what the other captures.
  const elsewhere = new Map<string, { ended: Promise<void>; end: () => void }>();
  // Settles once the runs stored before this pod started are loaded, so a run started meanwhile still
  // waits for one going on the pod this one is replacing
  let loaded: Promise<void> = Promise.resolve();
  // Run records go to storage in the order they change, so a later one is never overwritten by an earlier
  let publishing: Promise<void> = Promise.resolve();
  // The record last stored for each run, which a heartbeat stores again with a new heartbeatAt
  const published = new Map<string, RunRecord>();

  const runDir = (id: string) => path.join(options.dataDir, "runs", id);
  const save = async (record: RunRecord) => {
    runs.set(record.id, record);
    await mkdir(runDir(record.id), { recursive: true });
    await writeFile(path.join(runDir(record.id), "run.json"), `${JSON.stringify(record, null, 2)}\n`);
  };

  // Stored as it changes, so a pod that stops mid-run leaves it queued or running, and the next pod
  // can say it was interrupted
  const publish = (record: RunRecord) => {
    const store = options.store;
    if (!store) return Promise.resolve();
    published.set(record.id, record);
    publishing = publishing
      .then(() => store.upload(`${RUNS_PREFIX}${record.id}.json`, Buffer.from(JSON.stringify(record)), "application/json"))
      .catch((error: Error) => console.error(`[ui-baseline] could not store run ${record.id}: ${error.message}`));
    return publishing;
  };

  const perform = async (record: RunRecord) => {
    if (draining) {
      const failed: RunRecord = { ...record, status: "failed", finishedAt: new Date().toISOString(), error: RESTARTED_BEFORE_START };
      runs.set(record.id, failed);
      await publish(failed);
      return;
    }
    const dir = runDir(record.id);
    let baseline: PinnedBaseline | null = null;
    try {
      const startedAt = new Date().toISOString();
      await save({ ...record, status: "running", startedAt, heartbeatAt: startedAt });
      // A check keeps to the baseline it started with: its report links into that baseline's directory,
      // which is held until the check ends so it is not deleted from under it
      baseline = record.kind === "check" ? await options.baseline() : null;
      if (baseline) await save({ ...(runs.get(record.id) as RunRecord), baselineId: baseline.id });
      await publish(runs.get(record.id) as RunRecord);
      const { script, args } = commandFor(record, dir, options.environment, baseline?.dir ?? null);
      const code = await execute(script, args, {
        cwd: options.repoDir,
        log: path.join(dir, "log.txt"),
        env: { UI_BASELINE_COMMIT: options.commit },
        timeLimitMs: options.timeLimitMs ?? RUN_TIME_LIMIT_MS
      });
      // A report written before a crash is not a finished run
      const summary = COMPLETED.has(code) ? await summarise(record, dir) : null;
      await save({
        ...(runs.get(record.id) as RunRecord),
        status: summary ? "finished" : "failed",
        finishedAt: new Date().toISOString(),
        summary,
        ...(COMPLETED.has(code) ? {} : { error: stoppedBecause(code) })
      });
    } catch (error) {
      await save({ ...(runs.get(record.id) as RunRecord), status: "failed", finishedAt: new Date().toISOString(), error: (error as Error).message });
    } finally {
      baseline?.release();
    }
    await archive(runs.get(record.id) as RunRecord).catch((error: Error) => console.error(`[ui-baseline] could not store run ${record.id}: ${error.message}`));
    // After the archive, so another pod that sees the run has ended can fetch its files
    await publish(runs.get(record.id) as RunRecord);
  };

  const archive = async (record: RunRecord) => {
    if (!options.store) return;
    const file = path.join(options.dataDir, `${record.id}.tar.gz`);
    // Symlinks into the baseline are kept as links, not copied: the baseline is stored separately, and
    // each baseline has a directory of its own that is never replaced (record.baselineId)
    await execFileAsync(systemCommand("tar"), ["-czf", file, "-C", runDir(record.id), "."]);
    try {
      await options.store.uploadFile(`${RUNS_PREFIX}${record.id}.tar.gz`, file, "application/gzip");
    } finally {
      await rm(file, { force: true });
    }
  };

  // Downloads and unpacks a stored run beside its directory, then moves it into place whole, so the
  // directory never holds a run half unpacked
  const restoreRun = async (store: BlobContainer, id: string): Promise<string> => {
    const dir = runDir(id);
    await mkdir(path.dirname(dir), { recursive: true });
    const scratch = await mkdtemp(path.join(options.dataDir, ".restore-"));
    try {
      const file = path.join(scratch, "run.tar.gz");
      const unpacked = path.join(scratch, "run");
      await store.downloadToFile(`${RUNS_PREFIX}${id}.tar.gz`, file);
      await mkdir(unpacked);
      await execFileAsync(systemCommand("tar"), ["-xzf", file, "-C", unpacked]);
      await rm(dir, { recursive: true, force: true });
      await rename(unpacked, dir);
      return dir;
    } finally {
      await rm(scratch, { recursive: true, force: true });
    }
  };

  // The baseline a check's report links into, fetched again if this pod does not have it. Not held:
  // a report whose baseline is later removed fetches it again when it is next opened.
  const ensureBaseline = async (record: RunRecord) => {
    if (record.kind !== "check" || !record.baselineId) return;
    try {
      (await options.baseline(record.baselineId)).release();
    } catch (error) {
      console.error(`[ui-baseline] could not fetch baseline ${record.baselineId}: ${(error as Error).message}`);
    }
  };

  // The run's directory on this pod, restored from storage if need be; null if it cannot be
  const available = async (record: RunRecord): Promise<string | null> => {
    const dir = runDir(record.id);
    const store = options.store;
    // A run waiting or going on this pod has nothing stored yet: its directory fills as it runs
    if (!store || record.status === "queued" || record.status === "running" || existsSync(path.join(dir, "run.json"))) return dir;
    // A run cut short by a pod stopping, or failed by one before it began, was never archived, so there
    // is nothing to fetch each time it is opened
    if (record.error && NEVER_ARCHIVED.has(record.error)) return null;
    // Not on this pod's disk: restore it from storage, once however many requests ask at the same time
    let restored = restoring.get(record.id);
    if (!restored) {
      restored = restoreRun(store, record.id).finally(() => restoring.delete(record.id));
      restoring.set(record.id, restored);
    }
    try {
      await restored;
      return dir;
    } catch (error) {
      console.error(`[ui-baseline] could not restore run ${record.id}: ${(error as Error).message}`);
      return null;
    }
  };

  // A run going on another pod (the one a redeploy is replacing): its stored record is looked at
  // until the run ends there, or that pod stops storing it, when the run was cut short
  // A run handed over by the pod that stopped is claimed: taken into this pod's queue, if no other
  // pod has claimed it first. Several pods can be up at once (one merge after another, each starting a
  // pod), so the claim is a write that only succeeds if the record is as this pod read it.
  const watch = (store: BlobContainer, id: string) => {
    let end = () => {};
    const ended = new Promise<void>((resolve) => {
      end = resolve;
    });
    elsewhere.set(id, { ended, end });
    const name = `${RUNS_PREFIX}${id}.json`;
    const stop = () => {
      clearInterval(timer);
      watching.delete(timer);
      elsewhere.delete(id);
      end();
    };
    // Never throws: a rejection from an interval's callback would be unhandled, and stop the pod
    const timer = setInterval(async () => {
      const read = await store.downloadVersioned(name).catch(() => null);
      // One half written or empty is passed over: the next heartbeat stores it whole
      const stored = read ? parseRecord(read.data, id) : null;
      if (!read || !stored || !watching.has(timer)) return;
      if (handedOver(stored) && stillGoing(stored, staleMs) && !draining) {
        const { handedOverAt, ...rest } = stored;
        const claimed: RunRecord = { ...rest, owner: pod, takenOverAt: handedOverAt, heartbeatAt: new Date().toISOString() };
        // Another pod took it, or storage failed: looked at again on the next tick
        const won = await store.uploadIfUnchanged(name, Buffer.from(JSON.stringify(claimed)), "application/json", read.etag).catch(() => false);
        if (!won || !watching.has(timer)) return;
        stop();
        console.log(`[ui-baseline] took over run ${id}, queued on a pod that stopped`);
        runs.set(id, claimed);
        published.set(id, claimed);
        // Kept going while it waits here, as a run queued here would be
        beat(id);
        enqueue(claimed);
        return;
      }
      if (!stillGoing(stored, staleMs)) {
        const ended = stored.status !== "queued" && stored.status !== "running";
        const last: RunRecord = ended ? stored : { ...stored, status: "failed", finishedAt: new Date().toISOString(), error: INTERRUPTED };
        // Marked interrupted only if the record is still the one read. If a pod claimed the run
        // meanwhile, or the write failed, it is read again on the next tick.
        if (!ended && !(await store.uploadIfUnchanged(name, Buffer.from(JSON.stringify(last)), "application/json", read.etag).catch(() => false))) return;
        if (!watching.has(timer)) return;
        stop();
        runs.set(id, last);
        return;
      }
      runs.set(id, stored);
    }, watchMs);
    watching.add(timer);
  };

  // From when a run is queued until its last record is stored, which is after its archive: a heartbeat
  // stores the record last stored, so a pod watching never sees the run end before its files are in
  // storage
  const beat = (id: string) => {
    heartbeats.set(
      id,
      setInterval(() => {
        const last = published.get(id);
        if (last?.status === "queued" || last?.status === "running") void publish({ ...last, heartbeatAt: new Date().toISOString() });
      }, heartbeatMs)
    );
  };
  const stopBeat = (id: string) => {
    clearInterval(heartbeats.get(id));
    heartbeats.delete(id);
  };

  // A run that fails outside its own error handling (its record cannot be saved, say, as the disk is
  // full) is failed here, so the queue carries on with the runs after it
  const runOne = (record: RunRecord) =>
    perform(record)
      .catch(async (error: Error) => {
        console.error(`[ui-baseline] run ${record.id} failed: ${error.message}`);
        const failed: RunRecord = { ...(runs.get(record.id) as RunRecord), status: "failed", finishedAt: new Date().toISOString(), error: error.message };
        runs.set(record.id, failed);
        // Stored too, as perform would have, or another pod would find it still running and lose the error
        await archive(failed).catch((archiveError: Error) => console.error(`[ui-baseline] could not store run ${record.id}: ${archiveError.message}`));
        await publish(failed);
      })
      .finally(() => stopBeat(record.id));

  // Runs the pending runs one at a time, oldest first. Each waits for any run going on another pod;
  // one that pod hands over meanwhile joins the pending runs, ahead of those asked for since.
  const pump = (): Promise<void> => {
    pumping ??= (async () => {
      await loaded;
      for (;;) {
        while (elsewhere.size && !draining) {
          console.log(`[ui-baseline] waiting for the runs going on another pod: ${[...elsewhere.keys()].join(", ")}`);
          await Promise.all([...elsewhere.values()].map(({ ended }) => ended));
        }
        // When the pod is stopping, the runs left were handed over (drain)
        const record = draining ? undefined : pending.shift();
        if (!record) return;
        await runOne(record);
      }
    })().finally(() => {
      pumping = null;
      // A run asked for as the last one ended is not left waiting
      if (pending.length && !draining) void pump();
    });
    return pumping;
  };
  const enqueue = (record: RunRecord) => {
    pending.push(record);
    pending.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    void pump();
  };

  return {
    start(request) {
      if (draining) throw new RunRequestError(RESTARTING);
      const createdAt = new Date().toISOString();
      const record: RunRecord = {
        ...validated(request),
        id: `${createdAt.replace(/[:.]/g, "-")}-${randomBytes(3).toString("hex")}`,
        status: "queued",
        createdAt,
        heartbeatAt: createdAt,
        owner: pod
      };
      runs.set(record.id, record);
      void publish(record);
      beat(record.id);
      enqueue(record);
      return record;
    },
    list: () => [...runs.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    get: (id) => runs.get(id),
    async directory(id, { waitForBaseline = false } = {}) {
      const record = runs.get(id);
      if (!record) return null;
      const dir = await available(record);
      if (!dir) return null;
      // A baseline is several hundred megabytes, so only the report, which links into it, waits for
      // it; the run page starts the fetch and carries on, so the report is likely ready when opened
      const fetching = ensureBaseline(record);
      if (waitForBaseline) await fetching;
      return dir;
    },
    restore() {
      const work = restoreRuns();
      loaded = work.catch(() => undefined);
      // Runs another pod stores after this one listed them (one queued on the pod this one is
      // replacing, which still takes requests until it is stopped) are found by listing again
      const store = options.store;
      if (store)
        void loaded.then(() => {
          if (draining || scanner) return;
          scanner = setInterval(
            () => void scan(store).catch((error: Error) => console.error(`[ui-baseline] could not list stored runs: ${error.message}`)),
            watchMs
          );
          scanner.unref?.();
        });
      return work;
    },
    async idle() {
      while (pumping) await pumping;
    },
    async drain() {
      draining = true;
      stopWatching();
      // Each queued run is handed to the next pod, which runs it once the run going here has ended:
      // still queued, with no pod. Its heartbeat stops, so if no pod takes it (none is starting, as when
      // the cluster is stopped for the night), the next pod to start marks it interrupted.
      const handedOverAt = new Date().toISOString();
      for (const record of pending.splice(0)) {
        stopBeat(record.id);
        const { owner: _, ...rest } = runs.get(record.id) as RunRecord;
        const next: RunRecord = options.store
          ? { ...rest, handedOverAt, heartbeatAt: handedOverAt }
          : { ...rest, status: "failed", finishedAt: handedOverAt, error: RESTARTED_BEFORE_START };
        runs.set(record.id, next);
        void publish(next);
      }
      while (pumping) await pumping;
      await publishing;
    },
    stopWatching
  };

  function stopWatching() {
    clearInterval(scanner);
    scanner = undefined;
    for (const timer of watching) clearInterval(timer);
    watching.clear();
    // A run waiting for one elsewhere is started (or, when this pod is stopping, handed over)
    for (const { end } of elsewhere.values()) end();
    elsewhere.clear();
  }

  async function restoreRuns() {
    const store = options.store;
    if (!store) return;
    await loadAll(
      store,
      (await store.list(RUNS_PREFIX)).filter((blob) => blob.endsWith(".json"))
    );
  }

  // The runs stored since yesterday that this pod does not know. A run's id starts with when it was
  // asked for, so only those two days are listed: a run still queued or going is never older.
  async function scan(store: BlobContainer) {
    const day = (offset: number) => new Date(Date.now() - offset * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const names = (await Promise.all([day(1), day(0)].map((date) => store.list(`${RUNS_PREFIX}${date}`)))).flat();
    await loadAll(
      store,
      names.filter((name) => name.endsWith(".json") && !runs.has(path.basename(name, ".json")))
    );
  }

  async function loadAll(store: BlobContainer, names: string[]) {
    const next = [...names];
    const worker = async () => {
      for (let name = next.shift(); name; name = next.shift()) await load(store, name);
    };
    await Promise.all(Array.from({ length: Math.min(RESTORE_CONCURRENCY, names.length) }, worker));
  }

  async function load(store: BlobContainer, name: string) {
    if (loading.has(name)) return;
    loading.add(name);
    try {
      const data = await store.download(name);
      if (!data) return;
      const record = parseRecord(data, name);
      if (!record) return;
      // A run started on this pod while the others were loading is newer than anything stored
      if (runs.has(record.id)) return;
      if (record.status !== "queued" && record.status !== "running") {
        runs.set(record.id, record);
        return;
      }
      // Still going on another pod (the one this one is replacing): left to finish there, and watched
      if (stillGoing(record, staleMs)) {
        runs.set(record.id, record);
        watch(store, record.id);
        return;
      }
      // Stored as well, or every pod after this one would find it still running
      const interrupted: RunRecord = { ...record, status: "failed", finishedAt: new Date().toISOString(), error: INTERRUPTED };
      runs.set(record.id, interrupted);
      await publish(interrupted);
    } finally {
      loading.delete(name);
    }
  }
}

// A stored run record, or null (logged) when it is not one: empty, or cut short as it was written
function parseRecord(data: Buffer, name: string): RunRecord | null {
  try {
    return JSON.parse(data.toString("utf-8")) as RunRecord;
  } catch (error) {
    console.error(`[ui-baseline] could not read stored run ${name}: ${(error as Error).message}`);
    return null;
  }
}

// A queued run whose pod stopped and handed it over to the next, for that pod to claim
function handedOver(record: RunRecord): boolean {
  return record.status === "queued" && !!record.handedOverAt;
}

// A queued or running record another pod is still storing, by its heartbeat (createdAt for a record
// stored before queued runs had one). A handed-over run counts as going until a pod claims it, or for
// as long as a heartbeat would have kept it so.
function stillGoing(record: RunRecord, staleMs: number): boolean {
  if (record.status !== "queued" && record.status !== "running") return false;
  const lastSeen = Date.parse(record.heartbeatAt ?? record.createdAt);
  return Date.now() - lastSeen < staleMs;
}

// The tool's script and arguments for a run; the arguments go straight to the process, never a shell
function commandFor(record: RunRecord, dir: string, environment: string, baseline: string | null): { script: string; args: string[] } {
  if (record.kind === "files")
    return {
      script: "apps/ui-baseline/compare-files.ts",
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
    script: "apps/ui-baseline/check.ts",
    args: [`--env=${environment}`, `--baseline=${baseline}`, `--out=${path.join(dir, "check")}`, "--no-review", ...scope]
  };
}

// Why a run that did not complete ended, for its page
function stoppedBecause(code: number): string {
  if (code === EXIT_TIMED_OUT) return "The run was stopped because it took longer than its time limit. The log shows the step it was on.";
  if (code === EXIT_NOTHING_TO_CHECK)
    return "There was nothing to check: none of the list types or pages asked for are in the baseline. The log says what was left out, and why.";
  return `the tool stopped with exit code ${code}`;
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

// Runs the script, stopping it at its time limit: SIGTERM first, which a check answers by removing
// what it seeded, then SIGKILL if it has not ended within STOP_GRACE_MS. A stopped run ends with
// EXIT_TIMED_OUT. The script runs in a process group of its own and the signals go to the whole
// group, so the Chromium it started is stopped with it; left running, it would hold the script's
// output open, and the run would never be seen to end.
function executeScript(
  script: string,
  args: string[],
  options: { cwd: string; log: string; env: Record<string, string | undefined>; timeLimitMs: number }
): Promise<number> {
  return new Promise((resolve, reject) => {
    const log = createWriteStream(options.log);
    const child = spawn(path.join(options.cwd, "node_modules/.bin/tsx"), [script, ...args], {
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
      detached: true
    });
    const signal = (name: NodeJS.Signals) => {
      try {
        if (child.pid) process.kill(-child.pid, name);
      } catch {
        // The group has already gone
      }
    };
    // Both streams write to the one log, so neither ends it when it ends (pipe's default), or the
    // other's next write would fail; it is ended once the process has closed. A log that cannot be
    // written must not stop the pod: an unhandled stream error would.
    log.on("error", (error) => console.error(`[ui-baseline] could not write ${options.log}: ${error.message}`));
    child.stdout.pipe(log, { end: false });
    child.stderr.pipe(log, { end: false });
    let timedOut = false;
    let killing: NodeJS.Timeout | undefined;
    const limit = setTimeout(() => {
      timedOut = true;
      log.write(`\n[ui-baseline] stopped after ${Math.round(options.timeLimitMs / 60000)} minutes, its time limit\n`);
      signal("SIGTERM");
      killing = setTimeout(() => signal("SIGKILL"), STOP_GRACE_MS);
    }, options.timeLimitMs);
    child.on("error", (error) => {
      clearTimeout(limit);
      clearTimeout(killing);
      log.end(() => reject(error));
    });
    // Settled once the log is flushed, so the run's archive holds all of it, often the last lines
    // being the error that explains a failure
    child.on("close", (code) => {
      clearTimeout(limit);
      clearTimeout(killing);
      log.end(() => resolve(timedOut ? EXIT_TIMED_OUT : (code ?? 1)));
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
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  // When the pod running it last stored it, while it runs (HEARTBEAT_MS)
  heartbeatAt?: string;
  // The pod that runs it (its HOSTNAME); none once handed over, until another pod claims it
  owner?: string;
  // When the pod it was queued on stopped and handed it to the next one
  handedOverAt?: string;
  // When it was handed over, kept once a pod has claimed it, until it starts
  takenOverAt?: string;
  // The baseline a check compared against
  baselineId?: string;
  summary?: RunSummary | null;
  error?: string;
};

export interface RunSummary {
  lists?: { pairs?: number; match: number; differs: number; notCaptured?: number };
  pages?: { pairs?: number; match: number; differs: number; notCaptured?: number };
  files?: { files?: number; match: number; differs: number; missing?: number; extra?: number };
}

export interface Runner {
  start(request: RunRequest): RunRecord;
  list(): RunRecord[];
  get(id: string): RunRecord | undefined;
  // Stops starting runs, hands those still queued to the next pod (or, with no storage, fails them),
  // and settles when the one going has finished, so a pod being replaced finishes its run rather
  // than cutting it short (server.ts, on SIGTERM)
  drain(): Promise<void>;
  // Stops looking at runs going on another pod
  stopWatching(): void;
  // The run's directory on this pod, restored from storage if need be; null for an unknown run or
  // one that could not be restored. A queued run's directory may not exist yet. A check's baseline is
  // fetched too if the pod does not have it; waitForBaseline waits for that, for its report.
  directory(id: string, options?: { waitForBaseline?: boolean }): Promise<string | null>;
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
  // A baseline on this pod's disk, fetched if need be: the latest, or the one with the given id
  baseline: (id?: string) => Promise<PinnedBaseline>;
  execute?: typeof executeScript;
  // How long a run may take before it is stopped; RUN_TIME_LIMIT_MS when not given
  timeLimitMs?: number;
  // How often a running run's record is stored again, and how often one going on another pod is
  // looked at; HEARTBEAT_MS and WATCH_MS when not given
  heartbeatMs?: number;
  watchMs?: number;
  // This pod's name in the run records it owns; HOSTNAME when not given
  pod?: string;
}

export interface PinnedBaseline {
  id: string;
  dir: string;
  // Lets the baseline be removed from the pod's disk once nothing else holds it
  release(): void;
}
