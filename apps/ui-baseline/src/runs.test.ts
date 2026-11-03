import { chmod, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { createRunner, RunRequestError } from "./runs.js";

const PIP_ARTEFACT = "2a7b1d4e-0000-4000-8000-000000000001";
const CATH_ARTEFACT = "2a7b1d4e-0000-4000-8000-000000000002";

async function runnerWith(write: (args: string[]) => Promise<void> = async () => {}) {
  const dataDir = await mkdtemp(path.join(tmpdir(), "runs-"));
  const execute = vi.fn(async (_script: string, args: string[], _options: { cwd: string; log: string; env: Record<string, string | undefined> }) => {
    await write(args);
    return 0;
  });
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
    const run = runner.start({ kind: "check", scope: "all" }, "tester@example.com");
    await runner.idle();

    // Assert
    expect(baseline).toHaveBeenCalled();
    const [script, args, options] = execute.mock.calls[0];
    expect(script).toBe("apps/ui-baseline/check.ts");
    expect(args).toEqual(["--env=test", "--baseline=/data/baseline", expect.stringMatching(/--out=.*\/runs\/.*\/check$/), "--no-review", "--all"]);
    expect(options).toMatchObject({ cwd: "/repo", env: { UI_BASELINE_COMMIT: "abc1234" } });
    expect(runner.get(run.id)).toMatchObject({
      status: "finished",
      requestedBy: "tester@example.com",
      baselineId: "2026-11-03",
      summary: { lists: { match: 1, differs: 3 } }
    });
  });

  it("should pass each list type to the check", async () => {
    // Arrange
    const { runner, execute } = await runnerWith();

    // Act
    runner.start({ kind: "check", scope: "list-types", listTypes: ["CIVIL_DAILY_CAUSE_LIST", "SJP_PRESS_LIST"] }, "tester");
    await runner.idle();

    // Assert
    expect(execute.mock.calls[0][1].slice(-4)).toEqual(["--list-type", "CIVIL_DAILY_CAUSE_LIST", "--list-type", "SJP_PRESS_LIST"]);
  });

  it("should mark a check failed when the tool wrote no report", async () => {
    // Arrange
    const { runner } = await runnerWith();

    // Act
    const run = runner.start({ kind: "check", scope: "routes", routes: ["/summary-of-publications"] }, "tester");
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
    const run = runner.start({ kind: "files", pipArtefactId: PIP_ARTEFACT, cathArtefactId: CATH_ARTEFACT, name: "civil-list" }, "tester");
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
    runner.start({ kind: "check", scope: "routes", routes: ["/a"] }, "tester");
    runner.start({ kind: "check", scope: "routes", routes: ["/b"] }, "tester");
    await runner.idle();

    // Assert
    expect(order).toEqual(["start /a", "end /a", "start /b", "end /b"]);
  });

  it("should refuse artefact ids, list types and routes that are not well formed", async () => {
    // Arrange
    const { runner } = await runnerWith();

    // Act and assert
    expect(() => runner.start({ kind: "files", pipArtefactId: "--all", cathArtefactId: CATH_ARTEFACT }, "tester")).toThrow(RunRequestError);
    expect(() => runner.start({ kind: "check", scope: "list-types", listTypes: ["civil; rm -rf /"] }, "tester")).toThrow(RunRequestError);
    expect(() => runner.start({ kind: "check", scope: "routes", routes: ["https://example.com"] }, "tester")).toThrow(RunRequestError);
    expect(() => runner.start({ kind: "check", scope: "routes", routes: [] }, "tester")).toThrow(RunRequestError);
    expect(runner.list()).toEqual([]);
  });

  it("should restore stored runs, marking any that were cut short", async () => {
    // Arrange
    const dataDir = await mkdtemp(path.join(tmpdir(), "runs-"));
    const stored: Record<string, string> = {
      "runs/a.json": JSON.stringify({ id: "a", kind: "check", scope: "all", status: "finished", requestedBy: "x", createdAt: "2026-10-30T10:00:00Z" }),
      "runs/b.json": JSON.stringify({ id: "b", kind: "check", scope: "all", status: "running", requestedBy: "x", createdAt: "2026-10-30T11:00:00Z" })
    };
    const store = {
      name: "memory",
      list: async () => [...Object.keys(stored), "runs/a.tar.gz"],
      download: async (name: string) => (name in stored ? Buffer.from(stored[name]) : null),
      upload: async () => {},
      uploadFile: async () => {},
      downloadToFile: async () => {}
    };
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
  it("should store each finished run, and restore it on another pod when it is asked for", async () => {
    // Arrange
    const store = memoryStore();
    const writeReport = async (args: string[]) => {
      await mkdir(path.join(outDir(args), "report"), { recursive: true });
      await writeFile(path.join(outDir(args), "report/index.html"), "<p>the report</p>");
    };
    const first = createRunner({ ...(await optionsWith(writeReport)), store });
    const run = first.start({ kind: "check", scope: "all" }, "tester@example.com");
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
    const run = runner.start({ kind: "check", scope: "all" }, "tester@example.com");
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
    const first = runner.start({ kind: "check", scope: "all" }, "tester");
    const second = runner.start({ kind: "check", scope: "all" }, "tester");
    await runner.idle();

    // Assert
    expect([runner.get(first.id)?.status, runner.get(second.id)?.status]).toEqual(["failed", "failed"]);
    expect(runner.get(second.id)?.error).toMatch(/ENOTDIR|EEXIST/);
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
    runner.start({ kind: "check", scope: "all" }, "tester");
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
    const run = runner.start({ kind: "check", scope: "all" }, "tester");
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
    const run = runner.start({ kind: "check", scope: "routes", routes: ["/not-in-the-baseline"] }, "tester");
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
    const run = runner.start({ kind: "check", scope: "all" }, "tester@example.com");
    await runner.idle();

    // Assert
    const log = await readFile(path.join(options.dataDir, "runs", run.id, "log.txt"), "utf-8");
    expect(log).toBe("ran apps/ui-baseline/check.ts for abc1234\n");
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
  return {
    blobs,
    name: "memory",
    list: async (prefix: string) => [...blobs.keys()].filter((name) => name.startsWith(prefix)),
    download: async (name: string) => blobs.get(name) ?? null,
    upload: async (name: string, data: Buffer) => {
      blobs.set(name, data);
    },
    uploadFile: async (name: string, file: string) => {
      blobs.set(name, await readFile(file));
    },
    downloadToFile: async (name: string, file: string) => {
      await writeFile(file, blobs.get(name) as Buffer);
    }
  };
}
