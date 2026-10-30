import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
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
  const baseline = vi.fn(async () => "/data/baseline");
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
    expect(script).toBe("tools/ui-baseline/check.ts");
    expect(args).toEqual(["--env=test", "--baseline=/data/baseline", expect.stringMatching(/--out=.*\/runs\/.*\/check$/), "--no-review", "--all"]);
    expect(options).toMatchObject({ cwd: "/repo", env: { UI_BASELINE_COMMIT: "abc1234" } });
    expect(runner.get(run.id)).toMatchObject({ status: "finished", requestedBy: "tester@example.com", summary: { lists: { match: 1, differs: 3 } } });
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
    expect(execute.mock.calls[0][0]).toBe("tools/ui-baseline/compare-files.ts");
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
    const runner = createRunner({ dataDir, repoDir: "/repo", environment: "test", commit: "x", store, baseline: async () => "", execute: async () => 0 });

    // Act
    await runner.restore();

    // Assert
    expect(runner.list().map((run) => `${run.id} ${run.status} ${run.error ?? ""}`.trim())).toEqual(["b failed interrupted", "a finished"]);
  });
});
