import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { captureBatch } from "./capture/capture-batch.js";
import { startCaptureServer } from "./capture/capture-server.js";
import { compareRuns } from "./compare/compare.js";
import { compareFileRuns } from "./compare/file-compare.js";
import { compareJourneys } from "./journey/compare-journeys.js";
import { runJourneys } from "./journey/run-journeys.js";
import { reviewFindings } from "./review/review.js";

vi.mock("./capture/capture-batch.js", () => ({ captureBatch: vi.fn() }));
vi.mock("./capture/capture-server.js", () => ({ startCaptureServer: vi.fn() }));
vi.mock("./compare/compare.js", () => ({ compareRuns: vi.fn() }));
vi.mock("./compare/file-compare.js", () => ({ compareFileRuns: vi.fn() }));
vi.mock("./journey/compare-journeys.js", () => ({ compareJourneys: vi.fn() }));
vi.mock("./journey/run-journeys.js", () => ({ runJourneys: vi.fn() }));
vi.mock("./review/review.js", () => ({ reviewFindings: vi.fn() }));

const REVIEW_TOTALS = { items: 4, intended: 1, defect: 2, needsHuman: 1 };

// The CLI runs on import, so each test imports a fresh copy with its own argv
async function runCli(...args: string[]): Promise<void> {
  process.argv = ["node", "cli.ts", ...args];
  vi.resetModules();
  await import("./cli.js");
}

describe("cli", () => {
  const argv = process.argv;
  let exit: ReturnType<typeof vi.spyOn>;
  let log: ReturnType<typeof vi.spyOn>;
  let error: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    exit = vi.spyOn(process, "exit").mockImplementation((() => undefined) as never);
    log = vi.spyOn(console, "log").mockImplementation(() => {});
    error = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    process.argv = argv;
    vi.restoreAllMocks();
  });

  describe("usage", () => {
    it("should print usage and exit 0 when no command is given", async () => {
      // Act
      await runCli();

      // Assert
      expect(error).toHaveBeenCalledWith(expect.stringContaining("Usage:"));
      expect(exit).toHaveBeenCalledWith(0);
    });

    it("should print usage and exit 1 when the command is unknown", async () => {
      // Act
      await runCli("frobnicate");

      // Assert
      expect(error).toHaveBeenCalledWith(expect.stringContaining("parity capture --targets"));
      expect(exit).toHaveBeenCalledWith(1);
    });
  });

  describe("capture", () => {
    it("should capture the targets with the given settings and exit 1 when any capture failed", async () => {
      // Arrange
      vi.mocked(captureBatch).mockResolvedValue([{ ok: true }, { ok: false }, { ok: true }] as never);

      // Act
      await runCli("capture", "--targets", "t.json", "--out", "out", "--concurrency", "2", "--region", "#main", "--timezone", "UTC");

      // Assert
      expect(captureBatch).toHaveBeenCalledWith("t.json", { outDir: "out", region: "#main", timezone: "UTC" }, 2);
      expect(log).toHaveBeenCalledWith("\n2 captured, 1 failed → out");
      expect(exit).toHaveBeenCalledWith(1);
    });

    it("should default to a concurrency of 4 and exit 0 when every capture succeeded", async () => {
      // Arrange
      vi.mocked(captureBatch).mockResolvedValue([{ ok: true }] as never);

      // Act
      await runCli("capture", "--targets", "t.json", "--out", "out");

      // Assert
      expect(captureBatch).toHaveBeenCalledWith("t.json", { outDir: "out", region: undefined, timezone: undefined }, 4);
      expect(exit).toHaveBeenCalledWith(0);
    });

    it("should fail when --targets is missing", async () => {
      // Act
      const run = runCli("capture", "--out", "out");

      // Assert
      await expect(run).rejects.toThrow("--targets and --out are required");
      expect(captureBatch).not.toHaveBeenCalled();
    });
  });

  describe("journeys", () => {
    it("should run the journeys in the given locales and print each result when --only is given", async () => {
      // Arrange
      vi.mocked(runJourneys).mockResolvedValue([
        { journey: "search", locale: "en", ok: true, steps: 3, error: null },
        { journey: "search", locale: "cy", ok: false, steps: 1, error: "boom" }
      ]);

      // Act
      await runCli("journeys", "--module", "j.ts", "--out", "out", "--locales", "en,cy", "--only", "search,admin");

      // Assert
      expect(runJourneys).toHaveBeenCalledWith("j.ts", { outDir: "out", locales: ["en", "cy"], only: ["search", "admin"] });
      expect(log).toHaveBeenCalledWith("ok   search en: 3 checkpoints");
      expect(log).toHaveBeenCalledWith("FAIL search cy: 1 checkpoints — boom");
      expect(log).toHaveBeenCalledWith("\n1 journeys completed, 1 failed → out");
      expect(exit).toHaveBeenCalledWith(1);
    });

    it("should default to English and Welsh and exit 0 when every journey completes", async () => {
      // Arrange
      vi.mocked(runJourneys).mockResolvedValue([]);

      // Act
      await runCli("journeys", "--module", "j.ts", "--out", "out");

      // Assert
      expect(runJourneys).toHaveBeenCalledWith("j.ts", { outDir: "out", locales: ["en", "cy"], only: undefined });
      expect(exit).toHaveBeenCalledWith(0);
    });

    it("should fail when --module is missing", async () => {
      // Act
      const run = runCli("journeys", "--out", "out");

      // Assert
      await expect(run).rejects.toThrow("--module and --out are required");
    });
  });

  describe("compare", () => {
    it("should compare the runs and print the totals when the directories are given", async () => {
      // Arrange
      vi.mocked(compareRuns).mockResolvedValue({ totals: { pairs: 5, match: 2, differs: 2, notCaptured: 1 } } as never);

      // Act
      await runCli("compare", "--source", "pip", "--target", "cath", "--out", "out", "--only", "a,b", "--unordered", "blobs");

      // Assert
      expect(compareRuns).toHaveBeenCalledWith({ source: "pip", target: "cath", out: "out", only: ["a", "b"], unorderedRows: ["blobs"] });
      expect(log).toHaveBeenCalledWith("5 pairs: 2 match, 2 differ, 1 not captured → out/compare.json");
    });

    it("should fail when --target is missing", async () => {
      // Act
      const run = runCli("compare", "--source", "pip", "--out", "out");

      // Assert
      await expect(run).rejects.toThrow("--source, --target and --out are required");
    });
  });

  describe("compare-journeys", () => {
    it("should compare the journey runs and print the totals when the directories are given", async () => {
      // Arrange
      vi.mocked(compareJourneys).mockResolvedValue({ totals: { runs: 4, match: 3, differs: 1, notRun: 0 } } as never);

      // Act
      await runCli("compare-journeys", "--source", "pip", "--target", "cath", "--out", "out");

      // Assert
      expect(compareJourneys).toHaveBeenCalledWith({ source: "pip", target: "cath", out: "out", only: undefined });
      expect(log).toHaveBeenCalledWith("4 journey runs: 3 match, 1 differ, 0 not run → out/journeys-compare.json");
    });

    it("should fail when --out is missing", async () => {
      // Act
      const run = runCli("compare-journeys", "--source", "pip", "--target", "cath");

      // Assert
      await expect(run).rejects.toThrow("--source, --target and --out are required");
    });
  });

  describe("compare-files", () => {
    it("should compare the collected files and print the totals when the directories are given", async () => {
      // Arrange
      vi.mocked(compareFileRuns).mockResolvedValue({ totals: { files: 6, match: 3, differs: 1, missing: 1, extra: 1 } } as never);

      // Act
      await runCli("compare-files", "--source", "pip", "--target", "cath", "--out", "out", "--only", "civil");

      // Assert
      expect(compareFileRuns).toHaveBeenCalledWith({ source: "pip", target: "cath", out: "out", only: ["civil"] });
      expect(log).toHaveBeenCalledWith("6 files: 3 match, 1 differ, 1 missing, 1 extra → out/files-compare.json");
    });

    it("should fail when --source is missing", async () => {
      // Act
      const run = runCli("compare-files", "--target", "cath", "--out", "out");

      // Assert
      await expect(run).rejects.toThrow("--source, --target and --out are required");
    });
  });

  describe("review", () => {
    it("should review the findings with every option passed through and print the verdict totals", async () => {
      // Arrange
      vi.mocked(reviewFindings).mockResolvedValue({ totals: REVIEW_TOTALS } as never);

      // Act
      await runCli(
        "review",
        "--compare",
        "c.json",
        "--out",
        "out",
        "--requirements",
        "gh:hmcts/cath-service#1",
        "--known-defects",
        "d.md",
        "--source-name",
        "pip",
        "--target-name",
        "CaTH",
        "--reviewer",
        "my-llm  --json"
      );

      // Assert
      expect(reviewFindings).toHaveBeenCalledWith({
        compare: "c.json",
        out: "out",
        requirements: "gh:hmcts/cath-service#1",
        knownDefects: "d.md",
        sourceName: "pip",
        targetName: "CaTH",
        reviewer: ["my-llm", "--json"],
        promptOnly: false
      });
      expect(log).toHaveBeenCalledWith("4 items: 1 intended, 2 defects, 1 need a human → out/review.json");
    });

    it("should report the prompts written when --prompt-only is given", async () => {
      // Arrange
      vi.mocked(reviewFindings).mockResolvedValue({ totals: REVIEW_TOTALS } as never);

      // Act
      await runCli("review", "--compare", "c.json", "--out", "out", "--prompt-only");

      // Assert
      expect(reviewFindings).toHaveBeenCalledWith(expect.objectContaining({ promptOnly: true, reviewer: undefined }));
      expect(log).toHaveBeenCalledWith("wrote review prompts for 4 items → out");
    });

    it("should fail when --compare is missing", async () => {
      // Act
      const run = runCli("review", "--out", "out");

      // Assert
      await expect(run).rejects.toThrow("--compare and --out are required");
    });
  });

  describe("serve", () => {
    it("should start the capture server and close it then exit when sent SIGTERM", async () => {
      // Arrange
      const close = vi.fn().mockResolvedValue(undefined);
      vi.mocked(startCaptureServer).mockResolvedValue({ port: 9500, close });
      const on = vi.spyOn(process, "on").mockImplementation((() => process) as never);

      // Act
      await runCli("serve", "--out", "out", "--port", "9500", "--region", "#main", "--timezone", "UTC");
      const shutdown = on.mock.calls.find(([signal]) => signal === "SIGTERM")?.[1] as () => Promise<void>;
      await shutdown();

      // Assert
      expect(startCaptureServer).toHaveBeenCalledWith({ outDir: "out", port: 9500, region: "#main", timezone: "UTC" });
      expect(log).toHaveBeenCalledWith("parity capture server listening on http://127.0.0.1:9500");
      expect(on).toHaveBeenCalledWith("SIGINT", shutdown);
      expect(close).toHaveBeenCalledTimes(1);
      expect(exit).toHaveBeenCalledWith(0);
    });

    it("should default to port 9400", async () => {
      // Arrange
      vi.mocked(startCaptureServer).mockResolvedValue({ port: 9400, close: vi.fn() });
      vi.spyOn(process, "on").mockImplementation((() => process) as never);

      // Act
      await runCli("serve", "--out", "out");

      // Assert
      expect(startCaptureServer).toHaveBeenCalledWith(expect.objectContaining({ port: 9400 }));
    });

    it("should fail when --out is missing", async () => {
      // Act
      const run = runCli("serve");

      // Assert
      await expect(run).rejects.toThrow("--out is required");
    });
  });
});
