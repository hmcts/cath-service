import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { compareArtefactFiles } from "./artefact-files.js";
import { collectFiles, compareFileRuns, openBlobContainer } from "./core/index.js";
import { filesStorage, loadEnvironment } from "./environments.js";
import { loadManifest } from "./fixtures/manifest.js";

vi.mock("./core/index.js", () => ({ collectFiles: vi.fn(), compareFileRuns: vi.fn(), openBlobContainer: vi.fn() }));
vi.mock("./environments.js", () => ({ loadEnvironment: vi.fn(), filesStorage: vi.fn() }));
vi.mock("./fixtures/manifest.js", () => ({ loadManifest: vi.fn() }));

const ENVIRONMENT = {
  name: "test",
  cath: { baseUrl: "https://cath", apiUrl: "https://cath-api", storage: { accountName: "cath-account" } },
  pip: { baseUrl: "https://pip", storage: { accountName: "pip-account" } }
};
const SUMMARY = { totals: { files: 1, match: 1, differs: 0, missing: 0, extra: 0 }, results: [] };
const ENTRY = { id: "civil", kind: "pdf", file: "civil/pdf.pdf", blob: "a.pdf", bytes: 1, seededAt: null };

describe("compareArtefactFiles", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(loadEnvironment).mockResolvedValue(ENVIRONMENT as never);
    vi.mocked(filesStorage).mockImplementation((app) => ({ accountName: `${app}-account`, container: "publications" }));
    vi.mocked(openBlobContainer).mockImplementation((storage) => ({ name: storage.accountName }) as never);
    vi.mocked(collectFiles).mockImplementation(async (options) => (options.container.name === "pip-account" ? [ENTRY] : []) as never);
    vi.mocked(compareFileRuns).mockImplementation(async (options) => {
      await mkdir(options.out, { recursive: true });
      return SUMMARY as never;
    });
    vi.mocked(loadManifest).mockResolvedValue({
      publications: [
        { cathListType: "OTHER", paths: { pip: "/other", cath: "/other" } },
        { cathListType: "CIVIL_DAILY_CAUSE_LIST", paths: { pip: "/civil-daily-cause-list", cath: "/civil-list" } }
      ]
    } as never);
    fetchMock = vi.fn(async (url: string) => {
      // listTypeId is arbitrary: the page is found by listTypeName
      if (url === "https://cath-api/test-support/artefacts/c1") return Response.json({ listTypeId: 999, listTypeName: "CIVIL_DAILY_CAUSE_LIST" });
      return new Response("not found", { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("should collect each app's files, compare them and give each app's page for the list", async () => {
    // Arrange
    const out = path.join(await mkdtemp(path.join(tmpdir(), "artefact-")), "out");

    // Act
    const result = await compareArtefactFiles({ env: "test", pipArtefactId: "p1", cathArtefactId: "c1", name: "civil", out });

    // Assert
    expect(loadEnvironment).toHaveBeenCalledWith("test");
    expect(filesStorage).toHaveBeenCalledWith("pip", ENVIRONMENT.pip);
    expect(filesStorage).toHaveBeenCalledWith("cath", ENVIRONMENT.cath);
    expect(collectFiles).toHaveBeenCalledWith(expect.objectContaining({ out: path.join(out, "pip"), publications: [{ id: "civil", artefactId: "p1" }] }));
    expect(collectFiles).toHaveBeenCalledWith(expect.objectContaining({ out: path.join(out, "cath"), publications: [{ id: "civil", artefactId: "c1" }] }));
    expect(compareFileRuns).toHaveBeenCalledWith({ source: path.join(out, "pip"), target: path.join(out, "cath"), out: path.join(out, "compare") });
    const links = {
      listType: "CIVIL_DAILY_CAUSE_LIST",
      cath: "https://cath/civil-list?artefactId=c1",
      pip: "https://pip/civil-daily-cause-list?artefactId=p1"
    };
    expect(result).toEqual({ out, summary: SUMMARY, pipHasFiles: true, cathHasFiles: false, links });
    expect(JSON.parse(await readFile(path.join(out, "compare/links.json"), "utf-8"))).toEqual(links);
  });

  it("should name the output after the publication and CaTH's artefact id by default", async () => {
    // Arrange
    vi.mocked(compareFileRuns).mockResolvedValue(SUMMARY as never);

    // Act
    const result = await compareArtefactFiles({ env: "test", pipArtefactId: "p1", cathArtefactId: "unknown" });

    // Assert
    expect(result.out).toMatch(/output\/files\/publication-unknown$/);
    expect(collectFiles).toHaveBeenCalledWith(expect.objectContaining({ publications: [{ id: "publication", artefactId: "p1" }] }));
    expect(result.links).toBeNull();
    expect(existsSync(path.join(result.out, "compare/links.json"))).toBe(false);
  });

  it("should give no page where an app has none for the list type", async () => {
    // Arrange
    vi.mocked(loadManifest).mockResolvedValue({ publications: [{ cathListType: "CIVIL_DAILY_CAUSE_LIST", paths: { pip: "/civil", cath: null } }] } as never);
    vi.mocked(loadEnvironment).mockResolvedValue({ ...ENVIRONMENT, pip: { storage: {} } } as never);
    const out = path.join(await mkdtemp(path.join(tmpdir(), "artefact-")), "out");

    // Act
    const result = await compareArtefactFiles({ env: "test", pipArtefactId: "p1", cathArtefactId: "c1", out });

    // Assert
    expect(result.links).toEqual({ listType: "CIVIL_DAILY_CAUSE_LIST", cath: null, pip: null });
  });

  it("should give no pages when CaTH's list type has no fixture", async () => {
    // Arrange
    vi.mocked(loadManifest).mockResolvedValue({ publications: [] } as never);
    const out = path.join(await mkdtemp(path.join(tmpdir(), "artefact-")), "out");

    // Act
    const result = await compareArtefactFiles({ env: "test", pipArtefactId: "p1", cathArtefactId: "c1", out });

    // Assert
    expect(result.links).toBeNull();
  });
});
