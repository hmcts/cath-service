import { chmod, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { withVersions } from "../core/files/blob-versions.test-helper.js";
import { createRunner, RunRequestError } from "./runs.js";

const PIP_ARTEFACT = "2a7b1d4e-0000-4000-8000-000000000001";
const CATH_ARTEFACT = "2a7b1d4e-0000-4000-8000-000000000002";

async function runnerWith(write: (args: string[]) => Promise<void> = async () => {}) {
  const dataDir = await mkdtemp(path.join(tmpdir(), "runs-"));
  const execute = vi.fn(
    async (_script: string, args: string[], _options: { cwd: string; log: string; env: Record<string, string | undefined>; timeLimitMs: number }) => {
      await write(args);
      return 0;
    }
  );
  const baseline = vi.fn(async (_id?: string) => ({ id: "2026-11-03", dir: "/data/baseline", release: vi.fn() }));
  const runner = createRunner({ dataDir, repoDir: "/repo", environment: "test", commit: "abc1234", store: null, baseline, execute });
  return { runner, execute, baseline, dataDir };
}

// Writes what the tool would have written at the path given by --out
const outDir = (args: string[]) => (args.find((arg) => arg.startsWith("--out=")) as string).slice("--out=".length);

describe("createRunner", () => {
  it("should run a check of all of CaTH against the baseline, without reviewing", async () => {
    // Arrange
    const { runner, execute, baseline } = await runnerWith(async (args) => {
      await mkdir(path.join(outDir(args), "report"), { recursive: true });
      await writeFile(path.join(outDir(args), "report/index.html"), "<html>");
      await mkdir(path.join(outDir(args), "compare/lists"), { recursive: true });
      await writeFile(path.join(outDir(args), "compare/lists/compare.json"), JSON.stringify({ totals: { pairs: 4, match: 1, differs: 3, notCaptured: 0 } }));
    });

    // Act
    const run = runner.start({ kind: "check", scope: "all" });
    await runner.idle();

    // Assert
    expect(baseline).toHaveBeenCalled();
    const [script, args, options] = execute.mock.calls[0];
    expect(script).toBe("apps/ui-baseline/check.ts");
    expect(args).toEqual(["--env=test", "--baseline=/data/baseline", expect.stringMatching(/--out=.*\/runs\/.*\/check$/), "--no-review", "--all"]);
    expect(options).toMatchObject({ cwd: "/repo", env: { UI_BASELINE_COMMIT: "abc1234" } });
    expect(runner.get(run.id)).toMatchObject({
      status: "finished",
      baselineId: "2026-11-03",
      summary: { lists: { match: 1, differs: 3 } }
    });
  });

  it("should pass each list type to the check", async () => {
    // Arrange
    const { runner, execute } = await runnerWith();

    // Act
    runner.start({ kind: "check", scope: "list-types", listTypes: ["CIVIL_DAILY_CAUSE_LIST", "SJP_PRESS_LIST"] });
    await runner.idle();

    // Assert
    expect(execute.mock.calls[0][1].slice(-4)).toEqual(["--list-type", "CIVIL_DAILY_CAUSE_LIST", "--list-type", "SJP_PRESS_LIST"]);
  });

  it("should mark a check failed when the tool wrote no report", async () => {
    // Arrange
    const { runner } = await runnerWith();

    // Act
    const run = runner.start({ kind: "check", scope: "routes", routes: ["/summary-of-publications"] });
    await runner.idle();

    // Assert
    expect(runner.get(run.id)?.status).toBe("failed");
  });

  it("should compare a publication's files without fetching the baseline", async () => {
    // Arrange
    const { runner, execute, baseline, dataDir } = await runnerWith(async (args) => {
      await mkdir(path.join(outDir(args), "compare"), { recursive: true });
      await writeFile(
        path.join(outDir(args), "compare/files-compare.json"),
        JSON.stringify({ totals: { files: 2, match: 1, differs: 1, missing: 0, extra: 0 } })
      );
    });

    // Act
    const run = runner.start({ kind: "files", pipArtefactId: PIP_ARTEFACT, cathArtefactId: CATH_ARTEFACT, name: "civil-list" });
    await runner.idle();

    // Assert
    expect(baseline).not.toHaveBeenCalled();
    expect(execute.mock.calls[0][0]).toBe("apps/ui-baseline/compare-files.ts");
    expect(execute.mock.calls[0][1].slice(0, 4)).toEqual(["--env=test", `--pip=${PIP_ARTEFACT}`, `--cath=${CATH_ARTEFACT}`, "--name=civil-list"]);
    expect(runner.get(run.id)).toMatchObject({ status: "finished", summary: { files: { match: 1, differs: 1 } } });
    expect(JSON.parse(await readFile(path.join(dataDir, "runs", run.id, "run.json"), "utf-8")).status).toBe("finished");
  });

  it("should run one at a time, in the order asked", async () => {
    // Arrange
    const order: string[] = [];
    const { runner } = await runnerWith(async (args) => {
      order.push(`start ${args.at(-1)}`);
      await new Promise((resolve) => setTimeout(resolve, 10));
      order.push(`end ${args.at(-1)}`);
    });

    // Act
    runner.start({ kind: "check", scope: "routes", routes: ["/a"] });
    runner.start({ kind: "check", scope: "routes", routes: ["/b"] });
    await runner.idle();

    // Assert
    expect(order).toEqual(["start /a", "end /a", "start /b", "end /b"]);
  });

  it("should refuse artefact ids, list types and routes that are not well formed", async () => {
    // Arrange
    const { runner } = await runnerWith();

    // Act and assert
    expect(() => runner.start({ kind: "files", pipArtefactId: "--all", cathArtefactId: CATH_ARTEFACT })).toThrow(RunRequestError);
    expect(() => runner.start({ kind: "check", scope: "list-types", listTypes: ["civil; rm -rf /"] })).toThrow(RunRequestError);
    expect(() => runner.start({ kind: "check", scope: "routes", routes: ["https://example.com"] })).toThrow(RunRequestError);
    expect(() => runner.start({ kind: "check", scope: "routes", routes: [] })).toThrow(RunRequestError);
    expect(() => runner.start({ kind: "check", scope: "routes", routes: ["/../etc"] })).toThrow(RunRequestError);
    expect(runner.list()).toEqual([]);
  });

  it("should take every route the command line takes, as the route map names them", async () => {
    // Arrange
    const { runner, execute } = await runnerWith();
    const routes = ["/", "/robots.txt", "/publication/[id]", "/media-applications/[id]/approve", "/manage-user/[userId]"];

    // Act
    runner.start({ kind: "check", scope: "routes", routes });
    await runner.idle();

    // Assert
    const args = execute.mock.calls[0][1];
    expect(args.filter((_, i) => args[i - 1] === "--route")).toEqual(routes);
  });

  it("should restore stored runs, marking any that were cut short", async () => {
    // Arrange
    const dataDir = await mkdtemp(path.join(tmpdir(), "runs-"));
    const stored: Record<string, string> = {
      "runs/a.json": JSON.stringify({ id: "a", kind: "check", scope: "all", status: "finished", createdAt: "2026-10-30T10:00:00Z" }),
      "runs/b.json": JSON.stringify({ id: "b", kind: "check", scope: "all", status: "running", createdAt: "2026-10-30T11:00:00Z" })
    };
    const store = withVersions({
      name: "memory",
      list: async () => [...Object.keys(stored), "runs/a.tar.gz"],
      download: async (name: string) => (name in stored ? Buffer.from(stored[name]) : null),
      size: async () => null,
      upload: async () => {},
      uploadFile: async () => {},
      downloadToFile: async () => {}
    });
    const runner = createRunner({
      dataDir,
      repoDir: "/repo",
      environment: "test",
      commit: "x",
      store,
      baseline: async () => ({ id: "", dir: "", release: () => {} }),
      execute: async () => 0
    });

    // Act
    await runner.restore();

    // Assert
    expect(runner.list().map((run) => `${run.id} ${run.status} ${run.error ?? ""}`.trim())).toEqual(["b failed interrupted", "a finished"]);
  });

  it("should store a run it marks interrupted, so the next pod does not find it still running", async () => {
    // Arrange
    const dataDir = await mkdtemp(path.join(tmpdir(), "runs-"));
    const uploads: Record<string, string> = {};
    const store = withVersions({
      name: "memory",
      list: async () => ["runs/b.json"],
      download: async () => Buffer.from(JSON.stringify({ id: "b", kind: "check", scope: "all", status: "running", createdAt: "2026-10-30T11:00:00Z" })),
      size: async () => null,
      upload: async (name: string, data: Buffer) => {
        uploads[name] = data.toString("utf-8");
      },
      uploadFile: async () => {},
      downloadToFile: async () => {}
    });
    const runner = createRunner({
      dataDir,
      repoDir: "/repo",
      environment: "test",
      commit: "x",
      store,
      baseline: async () => ({ id: "", dir: "", release: () => {} })
    });

    // Act
    await runner.restore();

    // Assert
    expect(JSON.parse(uploads["runs/b.json"])).toMatchObject({ id: "b", status: "failed", error: "interrupted", finishedAt: expect.any(String) });
  });

  it("should give each run its time limit, and say a run that went past it was stopped", async () => {
    // Arrange
    const { runner, execute } = await runnerWith();
    execute.mockResolvedValueOnce(124);

    // Act
    const run = runner.start({ kind: "check", scope: "all" });
    await runner.idle();

    // Assert
    expect(execute.mock.calls[0][2].timeLimitMs).toBe(2 * 60 * 60 * 1000);
    expect(runner.get(run.id)).toMatchObject({ status: "failed", error: expect.stringContaining("took longer than its time limit") });
  });

  it("should stop a run that hangs at its time limit, asking it to end before killing it", async () => {
    // Arrange
    const dataDir = await mkdtemp(path.join(tmpdir(), "runs-"));
    const repoDir = await mkdtemp(path.join(tmpdir(), "runs-repo-"));
    await mkdir(path.join(repoDir, "node_modules/.bin"), { recursive: true });
    // A stand-in for tsx that hangs until asked to stop, then says so and ends
    await writeFile(path.join(repoDir, "node_modules/.bin/tsx"), "#!/bin/sh\ntrap 'echo asked to stop; exit 0' TERM\nsleep 30 &\nwait\n", { mode: 0o755 });
    const runner = createRunner({
      dataDir,
      repoDir,
      environment: "test",
      commit: "x",
      store: null,
      baseline: async () => ({ id: "b", dir: "/data/baseline", release: () => {} }),
      timeLimitMs: 300
    });

    // Act
    const run = runner.start({ kind: "check", scope: "all" });
    await runner.idle();

    // Assert
    expect(runner.get(run.id)).toMatchObject({ status: "failed", error: expect.stringContaining("took longer than its time limit") });
    const log = await readFile(path.join(dataDir, "runs", run.id, "log.txt"), "utf-8");
    expect(log).toContain("asked to stop");
    expect(log).toContain("its time limit");
  });

  it("should not try to fetch a run that was cut short, which was never archived", async () => {
    // Arrange
    const dataDir = await mkdtemp(path.join(tmpdir(), "runs-"));
    const downloadToFile = vi.fn(async () => Promise.reject(new Error("BlobNotFound")));
    const store = {
      ...memoryStore(),
      list: async () => ["runs/b.json"],
      download: async () => Buffer.from(JSON.stringify({ id: "b", kind: "check", scope: "all", status: "running", createdAt: "2026-10-30T11:00:00Z" })),
      downloadToFile
    };
    const runner = createRunner({ ...(await optionsWith()), dataDir, store });
    await runner.restore();

    // Act
    const first = await runner.directory("b");
    const second = await runner.directory("b");

    // Assert
    expect([first, second]).toEqual([null, null]);
    expect(downloadToFile).not.toHaveBeenCalled();
  });
  it("should store each finished run, and restore it on another pod when it is asked for", async () => {
    // Arrange
    const store = memoryStore();
    const writeReport = async (args: string[]) => {
      await mkdir(path.join(outDir(args), "report"), { recursive: true });
      await writeFile(path.join(outDir(args), "report/index.html"), "<p>the report</p>");
    };
    const first = createRunner({ ...(await optionsWith(writeReport)), store });
    const run = first.start({ kind: "check", scope: "all" });
    await first.idle();
    const second = createRunner({ ...(await optionsWith(writeReport)), store });

    // Act
    await second.restore();
    const dir = await second.directory(run.id);

    // Assert
    expect([...store.blobs.keys()].sort()).toEqual([`runs/${run.id}.json`, `runs/${run.id}.tar.gz`]);
    expect(second.get(run.id)?.status).toBe("finished");
    expect(await readFile(path.join(dir as string, "check/report/index.html"), "utf-8")).toBe("<p>the report</p>");
  });

  it("should still finish a run when storing it fails", async () => {
    // Arrange
    const store = { ...memoryStore(), uploadFile: async () => Promise.reject(new Error("storage is down")) };
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const runner = createRunner({ ...(await optionsWith()), store });

    // Act
    const run = runner.start({ kind: "check", scope: "all" });
    await runner.idle();

    // Assert
    expect(runner.get(run.id)?.status).toBe("failed");
    expect(errors).toHaveBeenCalledWith(expect.stringContaining(`could not store run ${run.id}: storage is down`));
    errors.mockRestore();
  });

  it("should fail a run whose record cannot be saved, and still start the runs after it", async () => {
    // Arrange
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const blocked = path.join(await mkdtemp(path.join(tmpdir(), "runs-")), "a-file");
    await writeFile(blocked, "where the runs' folder should be, so nothing can be saved");
    const runner = createRunner({ ...(await optionsWith()), dataDir: blocked });

    // Act
    const first = runner.start({ kind: "check", scope: "all" });
    const second = runner.start({ kind: "check", scope: "all" });
    await runner.idle();

    // Assert
    expect([runner.get(first.id)?.status, runner.get(second.id)?.status]).toEqual(["failed", "failed"]);
    expect(runner.get(second.id)?.error).toMatch(/ENOTDIR|EEXIST/);
    errors.mockRestore();
  });

  it("should store a run that fails outside its own error handling as failed, with its error", async () => {
    // Arrange
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const blocked = path.join(await mkdtemp(path.join(tmpdir(), "runs-")), "a-file");
    await writeFile(blocked, "where the runs' folder should be, so nothing can be saved");
    const store = memoryStore();
    const runner = createRunner({ ...(await optionsWith()), dataDir: blocked, store });

    // Act
    const run = runner.start({ kind: "check", scope: "all" });
    await runner.idle();

    // Assert
    const stored = JSON.parse((store.blobs.get(`runs/${run.id}.json`) as Buffer).toString("utf-8"));
    expect(stored).toMatchObject({ id: run.id, status: "failed", error: expect.stringMatching(/ENOTDIR|EEXIST/) });
    errors.mockRestore();
  });

  it("should have no directory for a run it does not know", async () => {
    // Arrange
    const runner = createRunner({ ...(await optionsWith()), store: memoryStore() });

    // Act
    const dir = await runner.directory("unknown");

    // Assert
    expect(dir).toBeNull();
  });

  it("should hold a check's baseline until the check has ended", async () => {
    // Arrange
    const release = vi.fn();
    let releasedWhileRunning = true;
    const runner = createRunner({
      ...(await optionsWith()),
      baseline: async () => ({ id: "2026-11-03", dir: "/data/baseline", release }),
      execute: async () => {
        releasedWhileRunning = release.mock.calls.length > 0;
        return 0;
      }
    });

    // Act
    runner.start({ kind: "check", scope: "all" });
    await runner.idle();

    // Assert
    expect(releasedWhileRunning).toBe(false);
    expect(release).toHaveBeenCalledTimes(1);
  });

  it("should give an old run's directory without waiting for its baseline, unless asked to", async () => {
    // Arrange
    let arrive: () => void = () => {};
    const arrived = new Promise<void>((resolve) => {
      arrive = resolve;
    });
    const runner = createRunner({
      ...(await optionsWith()),
      // The check gets the latest at once; the run's own baseline, asked for by id, arrives when the test says
      baseline: async (id?: string) => {
        if (id) await arrived;
        return { id: "2026-11-03", dir: "/data/baseline", release: () => {} };
      }
    });
    const run = runner.start({ kind: "check", scope: "all" });
    await runner.idle();
    const pending = (promise: Promise<unknown>) =>
      Promise.race([promise.then(() => "settled"), new Promise((resolve) => setTimeout(() => resolve("waiting"), 50))]);

    // Act
    const page = await pending(runner.directory(run.id));
    const report = runner.directory(run.id, { waitForBaseline: true });
    const reportBefore = await pending(report);
    arrive();
    const reportAfter = await pending(report);

    // Assert
    expect(page).toBe("settled");
    expect(reportBefore).toBe("waiting");
    expect(reportAfter).toBe("settled");
    expect(await report).toMatch(/runs\/.*$/);
  });

  it("should say there was nothing to check when the tool found nothing in the baseline", async () => {
    // Arrange
    const runner = createRunner({ ...(await optionsWith()), execute: async () => 2 });

    // Act
    const run = runner.start({ kind: "check", scope: "routes", routes: ["/not-in-the-baseline"] });
    await runner.idle();

    // Assert
    expect(runner.get(run.id)).toMatchObject({
      status: "failed",
      error: "There was nothing to check: none of the list types or pages asked for are in the baseline. The log says what was left out, and why."
    });
  });

  it("should run the tool's script with the repository's tsx and keep its output in the run's log", async () => {
    // Arrange
    const repoDir = await mkdtemp(path.join(tmpdir(), "repo-"));
    await mkdir(path.join(repoDir, "node_modules/.bin"), { recursive: true });
    await writeFile(path.join(repoDir, "node_modules/.bin/tsx"), '#!/bin/sh\necho "ran $1 for $UI_BASELINE_COMMIT"\n');
    await chmod(path.join(repoDir, "node_modules/.bin/tsx"), 0o755);
    const { execute: _execute, ...options } = await optionsWith();
    const runner = createRunner({ ...options, repoDir });

    // Act
    const run = runner.start({ kind: "check", scope: "all" });
    await runner.idle();

    // Assert
    const log = await readFile(path.join(options.dataDir, "runs", run.id, "log.txt"), "utf-8");
    expect(log).toBe("ran apps/ui-baseline/check.ts for abc1234\n");
  });

  it("should keep writing the log when one of the script's streams ends before the other", async () => {
    // Arrange
    const repoDir = await mkdtemp(path.join(tmpdir(), "repo-"));
    await mkdir(path.join(repoDir, "node_modules/.bin"), { recursive: true });
    await writeFile(path.join(repoDir, "node_modules/.bin/tsx"), "#!/bin/sh\necho early\nexec 1>&-\nsleep 0.2\necho late >&2\n");
    await chmod(path.join(repoDir, "node_modules/.bin/tsx"), 0o755);
    const { execute: _execute, ...options } = await optionsWith();
    const store = memoryStore();
    const runner = createRunner({ ...options, repoDir, store });

    // Act
    const run = runner.start({ kind: "check", scope: "all" });
    await runner.idle();

    // Assert
    const log = await readFile(path.join(options.dataDir, "runs", run.id, "log.txt"), "utf-8");
    expect(log).toBe("early\nlate\n");
    expect(store.blobs.has(`runs/${run.id}.tar.gz`)).toBe(true);
  });
});

async function optionsWith(write: (args: string[]) => Promise<void> = async () => {}) {
  const dataDir = await mkdtemp(path.join(tmpdir(), "runs-"));
  return {
    dataDir,
    repoDir: "/repo",
    environment: "test",
    commit: "abc1234",
    store: null,
    baseline: async (_id?: string) => ({ id: "2026-11-03", dir: "/data/baseline", release: () => {} }),
    execute: async (_script: string, args: string[]) => {
      await write(args);
      return 0;
    }
  };
}

// Blob storage in memory, holding uploaded files' contents
function memoryStore() {
  const blobs = new Map<string, Buffer>();
  return withVersions({
    blobs,
    name: "memory",
    list: async (prefix: string) => [...blobs.keys()].filter((name) => name.startsWith(prefix)),
    download: async (name: string) => blobs.get(name) ?? null,
    size: async (name: string) => blobs.get(name)?.length ?? null,
    upload: async (name: string, data: Buffer) => {
      blobs.set(name, data);
    },
    uploadFile: async (name: string, file: string) => {
      blobs.set(name, await readFile(file));
    },
    downloadToFile: async (name: string, file: string) => {
      await writeFile(file, blobs.get(name) as Buffer);
    }
  });
}

describe("createRunner when pods are replaced", () => {
  function sharedStore() {
    const blobs = new Map<string, Buffer>();
    const uploads: { name: string; record: Record<string, unknown> }[] = [];
    return {
      blobs,
      uploads,
      store: withVersions({
        name: "memory",
        list: async (prefix: string) => [...blobs.keys()].filter((name) => name.startsWith(prefix)),
        download: async (name: string) => blobs.get(name) ?? null,
        size: async (name: string) => blobs.get(name)?.length ?? null,
        upload: async (name: string, data: Buffer) => {
          blobs.set(name, data);
          if (name.endsWith(".json")) uploads.push({ name, record: JSON.parse(data.toString("utf-8")) });
        },
        uploadFile: async () => {},
        downloadToFile: async () => {}
      })
    };
  }
  const baseline = async () => ({ id: "b", dir: "/data/baseline", release: () => {} });

  it("should finish the run going when drained, fail the ones queued behind it, and start no other", async () => {
    // Arrange
    const dataDir = await mkdtemp(path.join(tmpdir(), "runs-"));
    let finish: () => void = () => {};
    const execute = vi.fn(() => new Promise<number>((resolve) => (finish = () => resolve(0))));
    const runner = createRunner({ dataDir, repoDir: "/repo", environment: "test", commit: "x", store: null, baseline, execute });
    const going = runner.start({ kind: "check", scope: "routes", routes: ["/a"] });
    const queued = runner.start({ kind: "check", scope: "routes", routes: ["/b"] });
    await vi.waitFor(() => expect(execute).toHaveBeenCalledTimes(1));

    // Act
    const drained = runner.drain();
    finish();
    await drained;

    // Assert
    expect(runner.get(going.id)?.status).not.toBe("queued");
    expect(runner.get(queued.id)).toMatchObject({ status: "failed", error: expect.stringContaining("restarted before this run began") });
    expect(execute).toHaveBeenCalledTimes(1);
    expect(() => runner.start({ kind: "check", scope: "all" })).toThrow("restarting");
  });

  it("should hand the runs queued behind the one going to the next pod when drained, still queued and with no pod", async () => {
    // Arrange
    const dataDir = await mkdtemp(path.join(tmpdir(), "runs-"));
    const { store, blobs } = sharedStore();
    let finish: () => void = () => {};
    const execute = vi.fn(() => new Promise<number>((resolve) => (finish = () => resolve(0))));
    const runner = createRunner({ dataDir, repoDir: "/repo", environment: "test", commit: "x", store, baseline, execute, pod: "old" });
    runner.start({ kind: "check", scope: "routes", routes: ["/a"] });
    const queued = runner.start({ kind: "check", scope: "routes", routes: ["/b"] });
    await vi.waitFor(() => expect(execute).toHaveBeenCalledTimes(1));

    // Act
    const drained = runner.drain();
    finish();
    await drained;

    // Assert
    const stored = JSON.parse((blobs.get(`runs/${queued.id}.json`) as Buffer).toString("utf-8"));
    expect(stored).toMatchObject({ status: "queued", handedOverAt: expect.any(String) });
    expect(stored.owner).toBeUndefined();
    expect(runner.get(queued.id)?.status).toBe("queued");
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it("should take over a run the pod it replaces handed over, and run it before the runs asked of it since", async () => {
    // Arrange
    const dataDir = await mkdtemp(path.join(tmpdir(), "runs-"));
    const { store } = sharedStore();
    vi.spyOn(console, "log").mockImplementation(() => {});
    let finish: () => void = () => {};
    const oldExecute = vi.fn(() => new Promise<number>((resolve) => (finish = () => resolve(0))));
    const old = createRunner({ dataDir, repoDir: "/repo", environment: "test", commit: "x", store, baseline, execute: oldExecute, pod: "old" });
    old.start({ kind: "check", scope: "routes", routes: ["/going"] });
    const queued = old.start({ kind: "check", scope: "routes", routes: ["/queued"] });
    await vi.waitFor(() => expect(oldExecute).toHaveBeenCalledTimes(1));
    const newExecute = vi.fn(async () => 0);
    const replacement = createRunner({
      dataDir: await mkdtemp(path.join(tmpdir(), "runs-")),
      repoDir: "/repo",
      environment: "test",
      commit: "x",
      store,
      baseline,
      execute: newExecute,
      watchMs: 20,
      pod: "new"
    });
    await replacement.restore();
    replacement.start({ kind: "check", scope: "routes", routes: ["/asked-since"] });

    // Act
    const drained = old.drain();
    finish();
    await drained;
    await vi.waitFor(() => expect(newExecute).toHaveBeenCalledTimes(2));

    // Assert
    const routesRun = newExecute.mock.calls.map((call) => (call as unknown as [string, string[]])[1].find((_, i, args) => args[i - 1] === "--route"));
    expect(routesRun).toEqual(["/queued", "/asked-since"]);
    expect(replacement.get(queued.id)?.owner).toBe("new");
    replacement.stopWatching();
  });

  it("should keep a run it took over stored as queued while it waits for the old pod's run to end", async () => {
    // Arrange
    const dataDir = await mkdtemp(path.join(tmpdir(), "runs-"));
    const { store, uploads } = sharedStore();
    vi.spyOn(console, "log").mockImplementation(() => {});
    let finish: () => void = () => {};
    const oldExecute = vi.fn(() => new Promise<number>((resolve) => (finish = () => resolve(0))));
    const old = createRunner({
      dataDir,
      repoDir: "/repo",
      environment: "test",
      commit: "x",
      store,
      baseline,
      execute: oldExecute,
      heartbeatMs: 20,
      pod: "old"
    });
    old.start({ kind: "check", scope: "routes", routes: ["/going"] });
    const queued = old.start({ kind: "check", scope: "routes", routes: ["/queued"] });
    await vi.waitFor(() => expect(oldExecute).toHaveBeenCalledTimes(1));
    const execute = vi.fn(async () => 0);
    const replacement = createRunner({
      dataDir: await mkdtemp(path.join(tmpdir(), "runs-")),
      repoDir: "/repo",
      environment: "test",
      commit: "x",
      store,
      baseline,
      execute,
      watchMs: 10,
      heartbeatMs: 20,
      pod: "new"
    });
    await replacement.restore();

    // Act
    const drained = old.drain();
    await vi.waitFor(() => expect(replacement.get(queued.id)?.owner).toBe("new"));
    await new Promise((resolve) => setTimeout(resolve, 100));
    finish();
    await drained;
    await vi.waitFor(() => expect(execute).toHaveBeenCalledTimes(1));

    // Assert
    const beats = uploads.filter((upload) => upload.name === `runs/${queued.id}.json` && upload.record.owner === "new" && upload.record.status === "queued");
    expect(new Set(beats.map((beat) => beat.record.heartbeatAt)).size).toBeGreaterThan(1);
    replacement.stopWatching();
  });

  it("should run a handed-over run on one pod only, when two are up to take it", async () => {
    // Arrange
    const dataDir = await mkdtemp(path.join(tmpdir(), "runs-"));
    const { store } = sharedStore();
    vi.spyOn(console, "log").mockImplementation(() => {});
    let finish: () => void = () => {};
    const oldExecute = vi.fn(() => new Promise<number>((resolve) => (finish = () => resolve(0))));
    const old = createRunner({
      dataDir,
      repoDir: "/repo",
      environment: "test",
      commit: "x",
      store,
      baseline,
      execute: oldExecute,
      pod: "old"
    });
    old.start({ kind: "check", scope: "routes", routes: ["/going"] });
    old.start({ kind: "check", scope: "routes", routes: ["/queued"] });
    await vi.waitFor(() => expect(oldExecute).toHaveBeenCalledTimes(1));
    const execute = vi.fn(async () => 0);
    const pods = await Promise.all(
      ["first", "second"].map(async (pod) => {
        const runner = createRunner({
          dataDir: await mkdtemp(path.join(tmpdir(), "runs-")),
          repoDir: "/repo",
          environment: "test",
          commit: "x",
          store,
          baseline,
          execute,
          watchMs: 5,
          pod
        });
        await runner.restore();
        return runner;
      })
    );

    // Act
    const drained = old.drain();
    finish();
    await drained;
    await vi.waitFor(() => expect(execute).toHaveBeenCalled());
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Assert
    expect(execute).toHaveBeenCalledTimes(1);
    for (const pod of pods) pod.stopWatching();
  });

  it("should mark a handed-over run interrupted when no pod took it before it went stale", async () => {
    // Arrange
    const dataDir = await mkdtemp(path.join(tmpdir(), "runs-"));
    const { store } = sharedStore();
    let finish: () => void = () => {};
    const oldExecute = vi.fn(() => new Promise<number>((resolve) => (finish = () => resolve(0))));
    const old = createRunner({
      dataDir,
      repoDir: "/repo",
      environment: "test",
      commit: "x",
      store,
      baseline,
      execute: oldExecute,
      pod: "old"
    });
    old.start({ kind: "check", scope: "routes", routes: ["/going"] });
    const queued = old.start({ kind: "check", scope: "routes", routes: ["/queued"] });
    await vi.waitFor(() => expect(oldExecute).toHaveBeenCalledTimes(1));
    const drained = old.drain();
    finish();
    await drained;
    await new Promise((resolve) => setTimeout(resolve, 60));
    const execute = vi.fn(async () => 0);
    const morning = createRunner({
      dataDir: await mkdtemp(path.join(tmpdir(), "runs-")),
      repoDir: "/repo",
      environment: "test",
      commit: "x",
      store,
      baseline,
      execute,
      heartbeatMs: 10,
      pod: "morning"
    });

    // Act
    await morning.restore();
    await morning.idle();

    // Assert
    expect(morning.get(queued.id)).toMatchObject({ status: "failed", error: "interrupted" });
    expect(execute).not.toHaveBeenCalled();
  });

  it("should not take a handed-over run while it is stopping itself", async () => {
    // Arrange
    const dataDir = await mkdtemp(path.join(tmpdir(), "runs-"));
    const { store, blobs } = sharedStore();
    let finish: () => void = () => {};
    const oldExecute = vi.fn(() => new Promise<number>((resolve) => (finish = () => resolve(0))));
    const old = createRunner({
      dataDir,
      repoDir: "/repo",
      environment: "test",
      commit: "x",
      store,
      baseline,
      execute: oldExecute,
      pod: "old"
    });
    old.start({ kind: "check", scope: "routes", routes: ["/going"] });
    const queued = old.start({ kind: "check", scope: "routes", routes: ["/queued"] });
    await vi.waitFor(() => expect(oldExecute).toHaveBeenCalledTimes(1));
    const execute = vi.fn(async () => 0);
    const stopping = createRunner({
      dataDir: await mkdtemp(path.join(tmpdir(), "runs-")),
      repoDir: "/repo",
      environment: "test",
      commit: "x",
      store,
      baseline,
      execute,
      watchMs: 5,
      pod: "stopping"
    });
    await stopping.restore();

    // Act
    await stopping.drain();
    const drained = old.drain();
    finish();
    await drained;
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Assert
    expect(JSON.parse((blobs.get(`runs/${queued.id}.json`) as Buffer).toString("utf-8"))).toMatchObject({ status: "queued", handedOverAt: expect.any(String) });
    expect(execute).not.toHaveBeenCalled();
  });

  it("should store a running run's record again as it goes, so another pod can tell it is still going", async () => {
    // Arrange
    const dataDir = await mkdtemp(path.join(tmpdir(), "runs-"));
    const { store, uploads } = sharedStore();
    const execute = vi.fn(() => new Promise<number>((resolve) => setTimeout(() => resolve(0), 120)));
    const runner = createRunner({ dataDir, repoDir: "/repo", environment: "test", commit: "x", store, baseline, execute, heartbeatMs: 20 });

    // Act
    const run = runner.start({ kind: "check", scope: "all" });
    await runner.idle();

    // Assert
    const beats = uploads.filter((upload) => upload.name === `runs/${run.id}.json` && upload.record.status === "running");
    expect(beats.length).toBeGreaterThan(2);
    expect(new Set(beats.map((beat) => beat.record.heartbeatAt)).size).toBeGreaterThan(1);
  });

  it("should store a queued run's record again as it waits, so another pod does not take it for interrupted", async () => {
    // Arrange
    const dataDir = await mkdtemp(path.join(tmpdir(), "runs-"));
    const { store, uploads } = sharedStore();
    const execute = vi.fn(() => new Promise<number>((resolve) => setTimeout(() => resolve(0), 120)));
    const runner = createRunner({ dataDir, repoDir: "/repo", environment: "test", commit: "x", store, baseline, execute, heartbeatMs: 20 });

    // Act
    runner.start({ kind: "check", scope: "all" });
    const waiting = runner.start({ kind: "check", scope: "all" });
    await runner.idle();

    // Assert
    const beats = uploads.filter((upload) => upload.name === `runs/${waiting.id}.json` && upload.record.status === "queued");
    expect(new Set(beats.map((beat) => beat.record.heartbeatAt)).size).toBeGreaterThan(1);
  });

  it("should keep storing a run as running while its files are archived, and store it ended only after", async () => {
    // Arrange
    const dataDir = await mkdtemp(path.join(tmpdir(), "runs-"));
    const shared = sharedStore();
    let archiving = false;
    const beatsWhileArchiving: Record<string, unknown>[] = [];
    const store = {
      ...shared.store,
      upload: async (name: string, data: Buffer) => {
        if (archiving) beatsWhileArchiving.push(JSON.parse(data.toString("utf-8")));
        await shared.store.upload(name, data);
      },
      uploadFile: async () => {
        archiving = true;
        await new Promise((resolve) => setTimeout(resolve, 100));
        archiving = false;
      }
    };
    const runner = createRunner({ dataDir, repoDir: "/repo", environment: "test", commit: "x", store, baseline, execute: async () => 1, heartbeatMs: 20 });

    // Act
    const run = runner.start({ kind: "check", scope: "all" });
    await runner.idle();

    // Assert
    expect(beatsWhileArchiving.length).toBeGreaterThan(1);
    expect(beatsWhileArchiving.every((record) => record.status === "running")).toBe(true);
    expect(shared.uploads.at(-1)?.record).toMatchObject({ id: run.id, status: "failed" });
  });

  it("should not try to fetch a run failed before it began, which was never archived", async () => {
    // Arrange
    const dataDir = await mkdtemp(path.join(tmpdir(), "runs-"));
    const { store, blobs } = sharedStore();
    const downloadToFile = vi.fn(async () => {});
    blobs.set(
      "runs/q.json",
      Buffer.from(
        JSON.stringify({
          id: "q",
          kind: "check",
          scope: "all",
          status: "failed",
          createdAt: "2026-10-30T11:00:00Z",
          error: "The hosted check restarted before this run began. Start it again."
        })
      )
    );
    const runner = createRunner({ dataDir, repoDir: "/repo", environment: "test", commit: "x", store: { ...store, downloadToFile }, baseline });
    await runner.restore();

    // Act
    const dir = await runner.directory("q");

    // Assert
    expect(dir).toBeNull();
    expect(downloadToFile).not.toHaveBeenCalled();
  });

  it("should leave a run another pod is still going with as running, and show how it ends there", async () => {
    // Arrange
    const dataDir = await mkdtemp(path.join(tmpdir(), "runs-"));
    const { store, blobs } = sharedStore();
    const record = { id: "r1", kind: "check", scope: "all", status: "running", createdAt: new Date().toISOString(), heartbeatAt: new Date().toISOString() };
    blobs.set("runs/r1.json", Buffer.from(JSON.stringify(record)));
    const runner = createRunner({ dataDir, repoDir: "/repo", environment: "test", commit: "x", store, baseline, execute: async () => 0, watchMs: 20 });

    // Act
    await runner.restore();
    const whileGoing = runner.get("r1")?.status;
    blobs.set("runs/r1.json", Buffer.from(JSON.stringify({ ...record, status: "finished", finishedAt: new Date().toISOString() })));

    // Assert
    expect(whileGoing).toBe("running");
    await vi.waitFor(() => expect(runner.get("r1")?.status).toBe("finished"));
    runner.stopWatching();
  });

  it("should pass over a watched run's record that is half written, and read the next one whole", async () => {
    // Arrange
    const dataDir = await mkdtemp(path.join(tmpdir(), "runs-"));
    const { store, blobs } = sharedStore();
    vi.spyOn(console, "error").mockImplementation(() => {});
    const record = { id: "r3", kind: "check", scope: "all", status: "running", createdAt: new Date().toISOString(), heartbeatAt: new Date().toISOString() };
    blobs.set("runs/r3.json", Buffer.from(JSON.stringify(record)));
    const runner = createRunner({ dataDir, repoDir: "/repo", environment: "test", commit: "x", store, baseline, execute: async () => 0, watchMs: 20 });
    await runner.restore();

    // Act
    blobs.set("runs/r3.json", Buffer.from('{"id":"r3","sta'));
    await vi.waitFor(() => expect(console.error).toHaveBeenCalledWith(expect.stringContaining("could not read stored run r3")));
    blobs.set("runs/r3.json", Buffer.from(JSON.stringify({ ...record, status: "finished", finishedAt: new Date().toISOString() })));

    // Assert
    await vi.waitFor(() => expect(runner.get("r3")?.status).toBe("finished"));
    runner.stopWatching();
  });

  it("should load the other stored runs when one record cannot be read", async () => {
    // Arrange
    const dataDir = await mkdtemp(path.join(tmpdir(), "runs-"));
    const { store, blobs } = sharedStore();
    vi.spyOn(console, "error").mockImplementation(() => {});
    blobs.set("runs/bad.json", Buffer.from(""));
    blobs.set(
      "runs/good.json",
      Buffer.from(JSON.stringify({ id: "good", kind: "check", scope: "all", status: "finished", createdAt: "2026-10-30T11:00:00Z" }))
    );
    const runner = createRunner({ dataDir, repoDir: "/repo", environment: "test", commit: "x", store, baseline, execute: async () => 0 });

    // Act
    await runner.restore();

    // Assert
    expect(runner.list().map((run) => run.id)).toEqual(["good"]);
  });

  it("should mark a watched run interrupted, and store it so, once the other pod stops storing it", async () => {
    // Arrange
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "Date"] });
    const dataDir = await mkdtemp(path.join(tmpdir(), "runs-"));
    const { store, blobs, uploads } = sharedStore();
    const lastBeat = new Date(Date.now() - 170 * 1000).toISOString();
    blobs.set(
      "runs/r2.json",
      Buffer.from(JSON.stringify({ id: "r2", kind: "check", scope: "all", status: "running", createdAt: lastBeat, heartbeatAt: lastBeat }))
    );
    const runner = createRunner({ dataDir, repoDir: "/repo", environment: "test", commit: "x", store, baseline, execute: async () => 0 });

    // Act
    await runner.restore();
    const whileGoing = runner.get("r2")?.status;
    await vi.advanceTimersByTimeAsync(30 * 1000);

    // Assert
    expect(whileGoing).toBe("running");
    expect(runner.get("r2")).toMatchObject({ status: "failed", error: "interrupted", finishedAt: expect.any(String) });
    expect(uploads.at(-1)?.record).toMatchObject({ id: "r2", status: "failed", error: "interrupted" });
    runner.stopWatching();
    vi.useRealTimers();
  });

  it("should leave a watched run as another pod stored it when that pod claimed it as it was being marked interrupted", async () => {
    // Arrange
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "Date"] });
    const dataDir = await mkdtemp(path.join(tmpdir(), "runs-"));
    const { store, blobs } = sharedStore();
    const lastBeat = new Date(Date.now() - 170 * 1000).toISOString();
    const record = { id: "r6", kind: "check", scope: "all", status: "queued", createdAt: lastBeat, heartbeatAt: lastBeat };
    blobs.set("runs/r6.json", Buffer.from(JSON.stringify(record)));
    // Another pod claims the run between this pod reading it and storing it interrupted
    const racing = {
      ...store,
      uploadIfUnchanged: async () => {
        blobs.set("runs/r6.json", Buffer.from(JSON.stringify({ ...record, owner: "other", heartbeatAt: new Date().toISOString() })));
        return false;
      }
    };
    const runner = createRunner({ dataDir, repoDir: "/repo", environment: "test", commit: "x", store: racing, baseline, execute: async () => 0 });

    // Act
    await runner.restore();
    await vi.advanceTimersByTimeAsync(30 * 1000);
    const afterLostWrite = runner.get("r6")?.status;
    await vi.advanceTimersByTimeAsync(30 * 1000);

    // Assert
    expect(afterLostWrite).toBe("queued");
    expect(runner.get("r6")).toMatchObject({ status: "queued", owner: "other" });
    runner.stopWatching();
    vi.useRealTimers();
  });

  it("should take over a run queued on the old pod after it had listed the stored runs", async () => {
    // Arrange
    const dataDir = await mkdtemp(path.join(tmpdir(), "runs-"));
    const { store } = sharedStore();
    vi.spyOn(console, "log").mockImplementation(() => {});
    let finish: () => void = () => {};
    const oldExecute = vi.fn(() => new Promise<number>((resolve) => (finish = () => resolve(0))));
    const old = createRunner({ dataDir, repoDir: "/repo", environment: "test", commit: "x", store, baseline, execute: oldExecute, pod: "old" });
    const execute = vi.fn(async () => 0);
    const replacement = createRunner({
      dataDir: await mkdtemp(path.join(tmpdir(), "runs-")),
      repoDir: "/repo",
      environment: "test",
      commit: "x",
      store,
      baseline,
      execute,
      watchMs: 10,
      pod: "new"
    });
    await replacement.restore();

    // Act
    old.start({ kind: "check", scope: "routes", routes: ["/going"] });
    const queued = old.start({ kind: "check", scope: "routes", routes: ["/queued"] });
    await vi.waitFor(() => expect(oldExecute).toHaveBeenCalledTimes(1));
    const drained = old.drain();
    finish();
    await drained;
    await vi.waitFor(() => expect(execute).toHaveBeenCalledTimes(1));

    // Assert
    expect((execute.mock.calls[0] as unknown as [string, string[]])[1]).toContain("/queued");
    expect(replacement.get(queued.id)).toMatchObject({ owner: "new", takenOverAt: expect.any(String) });
    replacement.stopWatching();
  });

  it("should start a run only once the run going on another pod has ended there", async () => {
    // Arrange
    const dataDir = await mkdtemp(path.join(tmpdir(), "runs-"));
    const { store, blobs } = sharedStore();
    vi.spyOn(console, "log").mockImplementation(() => {});
    const record = { id: "r4", kind: "check", scope: "all", status: "running", createdAt: new Date().toISOString(), heartbeatAt: new Date().toISOString() };
    blobs.set("runs/r4.json", Buffer.from(JSON.stringify(record)));
    const execute = vi.fn(async () => 0);
    const runner = createRunner({ dataDir, repoDir: "/repo", environment: "test", commit: "x", store, baseline, execute, watchMs: 20 });
    const restoring = runner.restore();

    // Act
    const run = runner.start({ kind: "files", pipArtefactId: PIP_ARTEFACT, cathArtefactId: CATH_ARTEFACT });
    await restoring;
    await new Promise((resolve) => setTimeout(resolve, 60));
    const whileOtherGoing = { status: runner.get(run.id)?.status, started: execute.mock.calls.length };
    blobs.set("runs/r4.json", Buffer.from(JSON.stringify({ ...record, status: "finished", finishedAt: new Date().toISOString() })));
    await vi.waitFor(() => expect(execute).toHaveBeenCalledTimes(1));

    // Assert
    expect(whileOtherGoing).toEqual({ status: "queued", started: 0 });
    runner.stopWatching();
  });

  it("should take a run on another pod for interrupted only after several of its heartbeats are missed", async () => {
    // Arrange
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "Date"] });
    const dataDir = await mkdtemp(path.join(tmpdir(), "runs-"));
    const { store, blobs } = sharedStore();
    const lastBeat = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    blobs.set(
      "runs/r5.json",
      Buffer.from(JSON.stringify({ id: "r5", kind: "check", scope: "all", status: "running", createdAt: lastBeat, heartbeatAt: lastBeat }))
    );
    const runner = createRunner({
      dataDir,
      repoDir: "/repo",
      environment: "test",
      commit: "x",
      store,
      baseline,
      execute: async () => 0,
      heartbeatMs: 10 * 60 * 1000
    });

    // Act
    await runner.restore();

    // Assert
    expect(runner.get("r5")?.status).toBe("running");
    runner.stopWatching();
    vi.useRealTimers();
  });
});
