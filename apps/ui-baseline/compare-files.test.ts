import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type ArtefactFilesResult, compareArtefactFiles } from "./artefact-files.js";

vi.mock("./artefact-files.js", () => ({ compareArtefactFiles: vi.fn() }));

describe("compare-files script", () => {
  const argv = process.argv;
  let log: ReturnType<typeof vi.spyOn>;
  let exit: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    log = vi.spyOn(console, "log").mockImplementation(() => {});
    exit = vi.spyOn(process, "exit").mockImplementation((() => undefined) as never);
  });

  afterEach(() => {
    process.argv = argv;
    log.mockRestore();
    exit.mockRestore();
  });

  const run = async (...args: string[]) => {
    process.argv = ["node", "compare-files.ts", ...args];
    await import("./compare-files.js");
  };
  const printed = () => log.mock.calls.map((call: unknown[]) => call[0]).join("\n");

  it("should refuse to run without both artefact ids", async () => {
    // Act and assert
    await expect(run("--pip", "p1")).rejects.toThrow("--pip and --cath (the publication's artefact id in each app) are required");
    expect(compareArtefactFiles).not.toHaveBeenCalled();
  });

  it("should print the totals and exit 0 when every file matches", async () => {
    // Arrange
    vi.mocked(compareArtefactFiles).mockResolvedValue(result({ totals: { files: 2, match: 2, differs: 0, missing: 0, extra: 0 }, results: [] }));

    // Act
    await run("--pip", "p1", "--cath", "c1", "--name", "civil-list", "--out", "/tmp/out");

    // Assert
    expect(compareArtefactFiles).toHaveBeenCalledWith({ env: "aat", pipArtefactId: "p1", cathArtefactId: "c1", name: "civil-list", out: "/tmp/out" });
    expect(printed()).toContain("2 files: 2 match, 0 differ, 0 CaTH did not make, 0 only CaTH made");
    expect(printed()).toContain("→ /out/compare/files-compare.json");
    expect(printed()).not.toContain("has no files");
    expect(exit).toHaveBeenCalledWith(0);
  });

  it("should print each difference, the missing apps' files and the list's pages, and exit 1", async () => {
    // Arrange
    vi.mocked(compareArtefactFiles).mockResolvedValue(
      result(
        {
          totals: { files: 2, match: 1, differs: 1, missing: 0, extra: 0 },
          results: [
            { kind: "pdf", verdict: "match", findings: [] },
            { kind: "excel", verdict: "differs", findings: [{ change: "cell-changed", detail: "A1: x → y" }] }
          ]
        },
        { pipHasFiles: false, cathHasFiles: false, links: { listType: "CIVIL_DAILY_CAUSE_LIST", cath: "https://cath/list", pip: null } }
      )
    );

    // Act
    await run("--pip", "p1", "--cath", "c1", "--env", "local");

    // Assert
    expect(compareArtefactFiles).toHaveBeenCalledWith(expect.objectContaining({ env: "local" }));
    const output = printed();
    expect(output).toContain("pip has no files for p1");
    expect(output).toContain("CaTH has no files for c1");
    expect(output).toContain("\nexcel: differs");
    expect(output).toContain("  cell changed: A1: x → y");
    expect(output).not.toContain("pdf: match");
    expect(output).toContain("\nCIVIL_DAILY_CAUSE_LIST:\n  CaTH: https://cath/list\n  pip:  no page");
    expect(exit).toHaveBeenCalledWith(3);
  });

  it("should say when CaTH has no page for the list", async () => {
    // Arrange
    vi.mocked(compareArtefactFiles).mockResolvedValue(
      result(
        { totals: { files: 1, match: 0, differs: 0, missing: 1, extra: 0 }, results: [] },
        { links: { listType: "X", cath: null, pip: "https://pip/list" } }
      )
    );

    // Act
    await run("--pip", "p1", "--cath", "c1");

    // Assert
    expect(printed()).toContain("  CaTH: no page\n  pip:  https://pip/list");
    expect(exit).toHaveBeenCalledWith(3);
  });
});

function result(summary: unknown, overrides: Partial<ArtefactFilesResult> = {}): ArtefactFilesResult {
  return { out: "/out", summary: summary as ArtefactFilesResult["summary"], pipHasFiles: true, cathHasFiles: true, links: null, ...overrides };
}
