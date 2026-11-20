import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadManifest, loadUsers, type ParityUser, type PublicationFixture } from "./fixtures/manifest.js";

// The script reads and writes under output/; those paths are sent to a temporary directory
const { sandbox } = vi.hoisted(() => ({ sandbox: { from: "", to: "" } }));

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  const redirect = (file: string) => (sandbox.from && file.startsWith(sandbox.from) ? sandbox.to + file.slice(sandbox.from.length) : file);
  const via = <F>(fn: F) => ((file: string, ...rest: unknown[]) => (fn as (...args: unknown[]) => unknown)(redirect(file), ...rest)) as F;
  return {
    ...actual,
    readFile: via(actual.readFile),
    writeFile: via(actual.writeFile),
    mkdir: via(actual.mkdir)
  };
});
vi.mock("./fixtures/manifest.js", () => ({ loadManifest: vi.fn(), loadUsers: vi.fn() }));

const OUTPUT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "output");
const USERS: ParityUser[] = [user("verified-media", "PI_AAD", "VERIFIED"), user("system-admin", "SSO", "SYSTEM_ADMIN")];
const PUBLICATIONS = [
  publication({ id: "civil-list", paths: { pip: "/civil", cath: "/civil-cath" } }),
  publication({ id: "press-list", paths: { pip: "/press", cath: "/press-cath" }, viewAs: "verified-media" }),
  publication({ id: "flat-file", paths: { pip: "/file-publication", cath: null }, format: "flat-file" }),
  publication({ id: "not-seeded", paths: { pip: "/not-seeded", cath: "/not-seeded" } })
];
const SEED = {
  app: "pip",
  seededAt: "2026-10-01T00:00:00Z",
  ingestion: "api",
  publications: {
    "civil-list": { artefactId: "a1", locationId: 1 },
    "press-list": { artefactId: "a2", locationId: 2 },
    "flat-file": { artefactId: "a3", locationId: 3 }
  },
  rejected: {}
};

describe("build-targets script", () => {
  const argv = process.argv;
  let log: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    sandbox.from = OUTPUT_DIR;
    sandbox.to = await mkdtemp(path.join(tmpdir(), "build-targets-"));
    await mkdir(path.join(sandbox.to, "seed"));
    for (const app of ["pip", "cath"]) await writeFile(path.join(sandbox.to, `seed/${app}.json`), JSON.stringify({ ...SEED, app }));
    vi.mocked(loadManifest).mockResolvedValue({ displayWindowDays: { before: 1, after: 30 }, publications: PUBLICATIONS });
    vi.mocked(loadUsers).mockResolvedValue(USERS);
    log = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    process.argv = argv;
    sandbox.from = "";
    log.mockRestore();
  });

  const run = async (...args: string[]) => {
    process.argv = ["node", "build-targets.ts", ...args];
    await import("./build-targets.js");
    return JSON.parse(await readFile(path.join(sandbox.to, `targets/${args[0]}.json`), "utf-8"));
  };

  it("should need the app to build targets for", async () => {
    // Act and assert
    process.argv = ["node", "build-targets.ts"];
    await expect(import("./build-targets.js")).rejects.toThrow("usage: build-targets.ts <pip|cath> [app commit]");
  });

  it("should build pip's targets with sign-in, flat files on the summary page, signed-in variants and mobile captures", async () => {
    // Act
    const targets = await run("pip", "f9ccef8a");

    // Assert
    expect(targets.map((target: { id: string; viewport?: string }) => `${target.id}${target.viewport ? `:${target.viewport}` : ""}`)).toEqual([
      "civil-list",
      "press-list",
      "flat-file",
      "civil-list@verified-media",
      "flat-file@verified-media",
      "civil-list:mobile",
      "press-list:mobile",
      "flat-file:mobile"
    ]);
    const [civil, press, flatFile, civilSignedIn] = targets;
    expect(civil).toMatchObject({
      url: "https://localhost:8180/civil?artefactId=a1",
      locales: ["en", "cy"],
      source: { app: "pip", commit: "f9ccef8a", ingestion: "api", fixture: "civil-list", seededAt: SEED.seededAt, viewAs: null, artefactId: "a1" }
    });
    expect(civil.setup).toBeUndefined();
    expect(civil.cookies).toHaveLength(1);
    expect(press.setup).toEqual(["https://localhost:8180/parity-login?oid=pid-verified-media&flow=AAD&redirect=/"]);
    expect(press.source.viewAs).toBe("verified-media");
    expect(flatFile.url).toBe("https://localhost:8180/summary-of-publications?locationId=3");
    expect(civilSignedIn.setup).toEqual(press.setup);
    expect(civilSignedIn.source.viewAs).toBe("verified-media");
    expect(log).toHaveBeenCalledWith(expect.stringMatching(/^wrote 8 targets → .*output\/targets\/pip\.json$/));
  });

  it("should skip CaTH's pages that need sign-in, and those CaTH has no page for", async () => {
    // Act
    const targets = await run("cath");

    // Assert
    expect(targets.map((target: { id: string }) => target.id)).toEqual(["civil-list", "civil-list"]);
    expect(targets[0]).toMatchObject({ url: "http://localhost:8080/civil-cath?artefactId=a1", source: { app: "cath", commit: null } });
    expect(log).toHaveBeenCalledWith("skipped 1: press-list (needs sign-in as verified-media)");
  });

  it("should refuse a publication viewed as a user the fixtures do not have", async () => {
    // Arrange
    vi.mocked(loadManifest).mockResolvedValue({
      displayWindowDays: { before: 1, after: 30 },
      publications: [publication({ id: "civil-list", paths: { pip: "/civil", cath: "/civil" }, viewAs: "nobody" })]
    });

    // Act and assert
    process.argv = ["node", "build-targets.ts", "pip"];
    await expect(import("./build-targets.js")).rejects.toThrow("civil-list views as unknown user nobody");
  });
});

function user(id: string, provenance: ParityUser["provenance"], role: string): ParityUser {
  return { id, provenance, role, provenanceUserId: `pid-${id}`, email: `${id}@example.com`, forenames: id, surname: "User" };
}

function publication(overrides: Partial<PublicationFixture>): PublicationFixture {
  return {
    id: "x",
    listType: "X",
    cathListType: "X",
    paths: { pip: "/x", cath: "/x" },
    payload: "payloads/x.json",
    format: "json",
    origin: "hmcts/pip@abc:mock.json",
    locationId: 1,
    contentDate: "2022-02-14",
    type: "LIST",
    language: "ENGLISH",
    sensitivity: "PUBLIC",
    provenance: "MANUAL_UPLOAD",
    ...overrides
  };
}
