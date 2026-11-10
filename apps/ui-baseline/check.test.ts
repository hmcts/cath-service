import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NOT_FOUND_ID, NOT_FOUND_PATH } from "./variants.js";

// check.ts is a script that runs everything when it is imported, so each test sets its arguments
// and imports it afresh, with every collaborator that would reach a browser, CaTH, GitHub or Azure
// mocked. The mocks are hoisted so they survive vi.resetModules.
const mocks = vi.hoisted(() => ({
  removeRuns: vi.fn(),
  execFileSync: vi.fn(),
  spawn: vi.fn(),
  spawnSync: vi.fn(),
  captureBatches: vi.fn(),
  collectFiles: vi.fn(),
  compareFileRuns: vi.fn(),
  compareJourneys: vi.fn(),
  compareRuns: vi.fn(),
  launchChromium: vi.fn(),
  openBlobContainer: vi.fn(),
  reviewFindings: vi.fn(),
  investigateFindings: vi.fn(),
  runJourneys: vi.fn(),
  captureDownloads: vi.fn(),
  loadDownloads: vi.fn(),
  seedResolver: vi.fn(),
  filesStorage: vi.fn(),
  loadEnvironment: vi.fn(),
  loadManifest: vi.fn(),
  postComment: vi.fn(),
  ticketText: vi.fn(),
  routeMap: { routes: [] as unknown[] }
}));

vi.mock("node:child_process", () => ({ execFileSync: mocks.execFileSync, spawn: mocks.spawn, spawnSync: mocks.spawnSync }));
vi.mock("./system-command.js", () => ({ systemCommand: (name: string) => name }));
vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  const readFile = (async (file: string, ...rest: unknown[]) =>
    String(file).endsWith(path.join("routes", "route-map.json"))
      ? JSON.stringify(mocks.routeMap)
      : (actual.readFile as (...args: unknown[]) => Promise<unknown>)(file, ...rest)) as typeof actual.readFile;
  return { ...actual, readFile };
});
vi.mock("./core/index.js", () => ({
  captureBatches: mocks.captureBatches,
  collectFiles: mocks.collectFiles,
  compareFileRuns: mocks.compareFileRuns,
  compareJourneys: mocks.compareJourneys,
  compareRuns: mocks.compareRuns,
  launchChromium: mocks.launchChromium,
  openBlobContainer: mocks.openBlobContainer,
  reviewFindings: mocks.reviewFindings,
  investigateFindings: mocks.investigateFindings,
  runJourneys: mocks.runJourneys
}));
vi.mock("./downloads.js", () => ({ captureDownloads: mocks.captureDownloads, loadDownloads: mocks.loadDownloads, seedResolver: mocks.seedResolver }));
vi.mock("./environments.js", () => ({ filesStorage: mocks.filesStorage, loadEnvironment: mocks.loadEnvironment }));
vi.mock("./cath/run.js", () => ({ cathApi: (apiUrl: string) => `api at ${apiUrl}`, removeRuns: mocks.removeRuns }));
vi.mock("./fixtures/manifest.js", () => ({ loadManifest: mocks.loadManifest }));
vi.mock("./pr-comment.js", async (importOriginal) => ({ ...(await importOriginal<typeof import("./pr-comment.js")>()), postComment: mocks.postComment }));
vi.mock("./scope.js", async (importOriginal) => ({ ...(await importOriginal<typeof import("./scope.js")>()), ticketText: mocks.ticketText }));
vi.mock("./cath/journeys/index.js", () => ({ default: { journeys: [{ id: "subscribe" }] } }));

const PARITY_DIR = path.dirname(fileURLToPath(import.meta.url));
const TARGET = "http://cath.test";

const PUBLICATIONS = [
  { id: "civil-daily", listType: "CIVIL_DAILY_CAUSE_LIST", cathListType: null, paths: { pip: "/daily", cath: "/civil-daily-cause-list" }, format: "json" },
  { id: "flat-list", listType: "FLAT_FILE_LIST", cathListType: "CATH_FLAT", paths: { pip: "/flat", cath: null }, format: "flat-file" },
  { id: "no-cath", listType: "NO_CATH_LIST", cathListType: null, paths: { pip: "/none", cath: null }, format: "json" }
];

const ROUTES = [
  { pip: "/summary-of-publications", cath: "/summary-of-publications", match: "same-path", reviewed: false, pipRole: null },
  {
    pip: "/list-view",
    cath: "/list/[listTypeId]/[artefactId]",
    cathParams: { listTypeId: "listName", artefactId: "publication:civil-daily", user: "uid" },
    match: "renamed",
    reviewed: true,
    pipRole: "verified-media"
  },
  { pip: "/needs-value", cath: "/needs/[id]", cathParams: { id: "missing" }, match: "renamed", reviewed: true, pipRole: null },
  { pip: "/unfilled", cath: "/unfilled/[slug]", match: "renamed", reviewed: true, pipRole: null },
  { pip: "/pip-only", cath: null, match: "none", reviewed: false, pipRole: null },
  { pip: "/maybe", cath: "/perhaps", match: "renamed", confidence: "low", reviewed: false, pipRole: null },
  { pip: "/missing-page", cath: "/missing-page", match: "same-path", reviewed: false, pipRole: null },
  { pip: "/admin", cath: "/admin", match: "same-path", reviewed: false, pipRole: "system-admin" }
];

const PAGE_URLS: Record<string, string> = {
  "page--summary-of-publications": "https://pip.test/summary-of-publications?locationId=PIPLOC&artefactId=PIP-ART-1",
  "page--list-view": "https://pip.test/list-view?listName=CIVIL_DAILY_CAUSE_LIST&uid=PIP-USER&keep=1",
  "page--needs-value": "https://pip.test/needs-value",
  "page--unfilled": "https://pip.test/unfilled",
  "page--admin": "https://pip.test/admin"
};

const PIP_SEED = {
  app: "pip",
  seededAt: "2026-11-01T00:00:00Z",
  ingestion: "api",
  publications: { "civil-daily": { artefactId: "PIP-ART-1", locationId: 1 } },
  rejected: {},
  records: { "subscription-1": { id: "PIP-SUB-1" } },
  users: { "verified-media": "PIP-USER" }
};

const CATH_SEED = {
  app: "cath",
  seededAt: "2026-11-02T00:00:00Z",
  ingestion: "api",
  publications: { "civil-daily": { artefactId: "CATH-ART-1", locationId: 9, excelUploaded: false }, "flat-list": { artefactId: "CATH-ART-2", locationId: 9 } },
  rejected: {}
};

const SIGN_IN = {
  signedInAt: "2026-11-02T00:00:00Z",
  environment: "unit",
  users: {
    "verified-media": {
      userId: "CATH-USER",
      role: "VERIFIED",
      cookies: { en: [{ name: "session", value: "en-session" }], cy: [{ name: "session", value: "cy-session" }] }
    }
  },
  unavailable: { "system-admin": "no test account for SYSTEM_ADMIN" },
  records: { "subscription-1": { id: "CATH-SUB-1" } },
  listTypes: { CIVIL_DAILY_CAUSE_LIST: "7" }
};

class ExitCalled extends Error {
  constructor(readonly code: number | undefined) {
    super(`process.exit(${code})`);
  }
}

let tmp: string;
let baseline: string;
let out: string;
let envName: string;
let envCounter = 0;
let logs: string[];
let savedEnv: NodeJS.ProcessEnv;
const savedArgv = process.argv;

function writeJson(file: string, value: unknown): void {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(value));
}

function writeIndex(file: string, ids: string[]): void {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, ids.map((id) => `${JSON.stringify({ id, locale: "en", state: "default" })}\n`).join(""));
}

function makeBaseline(options: { journeys?: string[]; files?: boolean; downloads?: boolean; scope?: boolean; extraPages?: string[] } = {}): void {
  writeIndex(path.join(baseline, "lists/index.jsonl"), ["civil-daily", "civil-daily@verified-media"]);
  writeIndex(path.join(baseline, "pages/index.jsonl"), [...Object.keys(PAGE_URLS), ...(options.extraPages ?? [])]);
  for (const [id, url] of Object.entries(PAGE_URLS)) writeJson(path.join(baseline, "pages", id, "en/default/provenance.json"), { url });
  mkdirSync(path.join(baseline, "lists/civil-daily/en/default"), { recursive: true });
  writeJson(path.join(baseline, "seed.json"), PIP_SEED);
  for (const id of options.journeys ?? []) mkdirSync(path.join(baseline, "journeys", id, "en"), { recursive: true });
  // pip made a PDF and an Excel file for the list
  if (options.files) mkdirSync(path.join(baseline, "files"), { recursive: true });
  if (options.files)
    writeFileSync(
      path.join(baseline, "files/index.jsonl"),
      ["pdf", "excel"].map((kind) => `${JSON.stringify({ id: "civil-daily", kind, file: `civil-daily/${kind}` })}\n`).join("")
    );
  if (options.downloads) writeIndex(path.join(baseline, "downloads/index.jsonl"), ["dl-1"]);
  if (options.scope) writeJson(path.join(baseline, "scope.json"), { name: "ticket-42", publications: ["civil-daily"], pages: [], journeys: [], routes: [] });
}

function seedFile(): string {
  return path.join(PARITY_DIR, `output/seed/cath-check-${envName}.json`);
}

function signInFile(): string {
  return path.join(PARITY_DIR, `output/seed/cath-sign-in-${envName}.json`);
}

function setEnvironment(signIn: "session" | "accounts"): void {
  mocks.loadEnvironment.mockImplementation(async (name: string) => ({
    name,
    cath: { baseUrl: TARGET, apiUrl: "http://cath-api.test", signIn, storage: {}, filesWaitSeconds: 0 },
    pip: { storage: {} },
    secret: vi.fn()
  }));
}

// Seeding and sign-in write their results where check.ts asks, as the real scripts do
function scriptsSucceed(seed: unknown = CATH_SEED, signIn: unknown = SIGN_IN): void {
  mocks.spawnSync.mockImplementation((_command: string, args: string[], options: { env: Record<string, string> }) => {
    if (args.includes("apps/ui-baseline/cath/seed.ts")) {
      writeJson(options.env.PARITY_SEED_OUTPUT, seed);
      return { status: 0, stdout: "civil-daily published\nnoise\n", stderr: "" };
    }
    writeJson(options.env.PARITY_SIGN_IN_OUTPUT, signIn);
    return { status: 0, stdout: "verified-media signed in\n", stderr: "" };
  });
}

// Captures every target as asked, except those a test says CaTH answered differently
function captureAnswers(answers: Record<string, { status?: number; path?: string }> = {}): void {
  type Batch = { targetsFile: string; settings: { outDir: string }; onCaptured?: (done: number) => void; onFinished?: (results: unknown[]) => void };
  const captureOne = ({ targetsFile, settings, onCaptured, onFinished }: Batch) => {
    const targets = JSON.parse(readFileSync(targetsFile, "utf-8")) as { id: string; url: string; locales: string[]; viewport?: string }[];
    const entries = targets.flatMap((target) =>
      target.locales.map((locale) => {
        const answer = answers[`${target.id} ${locale}`] ?? {};
        const url = new URL(target.url);
        if (answer.path) url.pathname = answer.path;
        return { id: target.id, locale, state: target.viewport ?? "default", status: answer.status ?? 200, url: url.href };
      })
    );
    for (const entry of entries) mkdirSync(path.join(settings.outDir, entry.id, entry.locale, entry.state), { recursive: true });
    writeFileSync(path.join(settings.outDir, "index.jsonl"), entries.map((entry) => `${JSON.stringify(entry)}\n`).join(""));
    const results = entries.map((entry) => ({ ok: entry.status < 400 }));
    onCaptured?.(results.length);
    onFinished?.(results);
    return results;
  };
  mocks.captureBatches.mockImplementation(async (batches: Batch[]) => batches.map(captureOne));
}

function compareResults(differing: Record<string, { locale: string; state: string }[]> = {}): void {
  mocks.compareRuns.mockImplementation(async (options: { only: string[] }) => {
    // Each page as first seen and on mobile, and in any other state a test makes differ (expanded)
    const states = [...new Set(["default", "mobile", ...Object.values(differing).flatMap((d) => d.map(({ state }) => state))])];
    const results = options.only.flatMap((id) =>
      ["en", "cy"].flatMap((locale) =>
        states.map((state) => {
          const differs = (differing[id] ?? []).some((d) => d.locale === locale && d.state === state);
          return {
            id,
            locale,
            state,
            verdict: differs ? "differs" : "match",
            findings: differs ? [{ category: "content", change: "text-changed", detail: "The heading differs" }] : []
          };
        })
      )
    );
    const differs = results.filter((r) => r.verdict === "differs").length;
    return {
      source: "pip",
      target: "cath",
      comparedAt: "",
      patterns: [],
      results,
      totals: { pairs: results.length, match: results.length - differs, differs, notCaptured: 0 }
    };
  });
}

function targetsIn(
  area: "lists" | "pages"
): { id: string; url: string; locales: string[]; cookies: { value: string }[]; viewport?: string; source: Record<string, unknown> }[] {
  return JSON.parse(readFileSync(path.join(out, `targets-${area}.json`), "utf-8"));
}

function reportArgs(): string[] {
  const call = mocks.execFileSync.mock.calls.find(([command, args]) => command === process.execPath && String(args[0]).endsWith("make-report.mjs"));
  return call?.[1] ?? [];
}

function argAfter(args: string[], flag: string): string | undefined {
  return args[args.indexOf(flag) + 1];
}

async function runCheck(argv: string[]): Promise<{ code?: number; error?: Error }> {
  process.argv = ["node", "check.ts", "--env", envName, "--baseline", baseline, "--out", out, ...argv];
  vi.resetModules();
  try {
    await import("./check.js");
    return {};
  } catch (error) {
    if (error instanceof ExitCalled) return { code: error.code };
    return { error: error as Error };
  }
}

describe("check", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    tmp = await mkdtemp(path.join(os.tmpdir(), "ui-baseline-check-"));
    baseline = path.join(tmp, "baseline");
    out = path.join(tmp, "out");
    envName = `unit-test-${process.pid}-${envCounter++}`;
    savedEnv = { ...process.env };
    logs = [];
    vi.spyOn(console, "log").mockImplementation((...parts: unknown[]) => {
      logs.push(parts.join(" "));
    });
    vi.spyOn(process, "exit").mockImplementation(((code?: number) => {
      throw new ExitCalled(code);
    }) as never);

    mocks.routeMap.routes = ROUTES;
    mocks.loadManifest.mockResolvedValue({ displayWindowDays: { before: 1, after: 1 }, publications: PUBLICATIONS });
    setEnvironment("session");
    scriptsSucceed();
    captureAnswers();
    compareResults();
    mocks.execFileSync.mockImplementation((command: string, args: string[]) => {
      if (command === "git") return args[0] === "rev-parse" ? "abc1234\n" : "";
      if (command === process.execPath) mkdirSync(path.join(argAfter(args, "--out") as string, "data"), { recursive: true });
      return "";
    });
    mocks.launchChromium.mockResolvedValue({ newPage: async () => ({ goto: vi.fn(), screenshot: vi.fn() }), close: vi.fn() });
    mocks.compareFileRuns.mockResolvedValue({
      source: "",
      target: "",
      comparedAt: "",
      results: [],
      totals: { files: 0, match: 0, differs: 0, missing: 0, extra: 0 }
    });
    mocks.loadDownloads.mockResolvedValue([]);
  });

  afterEach(() => {
    process.argv = savedArgv;
    for (const key of Object.keys(process.env)) if (!(key in savedEnv)) delete process.env[key];
    Object.assign(process.env, savedEnv);
    rmSync(seedFile(), { force: true });
    rmSync(signInFile(), { force: true });
    rmSync(tmp, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it("should fail with how to get a baseline when there is no pip baseline", async () => {
    // Act
    const { error } = await runCheck(["--list-type", "CIVIL_DAILY_CAUSE_LIST"]);

    // Assert
    expect(error?.message).toMatch(/^no pip baseline at .*baseline: fetch the stored one/);
    expect(mocks.spawnSync).not.toHaveBeenCalled();
  });

  it("should exit with 2 when the choices name nothing to check", async () => {
    // Arrange
    makeBaseline();

    // Act
    const { code } = await runCheck(["--list-type", "UNKNOWN_LIST"]);

    // Assert
    expect(code).toBe(2);
    expect(logs.join("\n")).toContain("Nothing to check: name a ticket that mentions list types or pages");
    expect(mocks.spawnSync).not.toHaveBeenCalled();
  });

  describe("a ticket check", () => {
    const TICKET =
      "Fix CIVIL_DAILY_CAUSE_LIST and NO_CATH_LIST on `/summary-of-publications`, `/list-view`, `/needs-value`, `/unfilled`, `/pip-only`, `/maybe`, `/missing-page` and `/admin`";

    beforeEach(() => {
      makeBaseline({ files: true, scope: true });
      mocks.ticketText.mockResolvedValue(TICKET);
      captureAnswers({ "page--summary-of-publications cy": { path: "/sign-in" }, "page--list-view en": { status: 500 } });
      compareResults({
        "civil-daily": [
          { locale: "en", state: "default" },
          { locale: "en", state: "mobile" }
        ],
        "page--list-view": [{ locale: "cy", state: "default" }]
      });
      mocks.compareFileRuns.mockResolvedValue({
        source: "",
        target: "",
        comparedAt: "",
        results: [
          { id: "civil-daily", kind: "pdf", verdict: "differs", findings: [] },
          { id: "civil-daily", kind: "excel", verdict: "missing", findings: [] }
        ],
        totals: { files: 2, match: 0, differs: 1, missing: 1, extra: 0 }
      });
      mocks.reviewFindings.mockImplementation(async (options: { out: string }) => {
        if (options.out.endsWith("pages")) throw new Error("no reviewer found\non the path");
        return {
          reviewedAt: "",
          totals: { items: 1, intended: 0, defect: 1, needsHuman: 0 },
          items: [
            {
              id: "1",
              category: "content",
              change: "text-changed",
              detail: "Heading",
              pages: ["civil-daily en"],
              review: { id: "1", verdict: "defect", reason: "Not asked for", evidence: "" }
            }
          ]
        };
      });
      mocks.postComment.mockReturnValue("https://github.com/hmcts/cath-service/pull/7#comment");
    });

    it("should seed only the fixtures the ticket's lists and pages show, and sign in for pages behind sign-in", async () => {
      // Act
      await runCheck(["--ticket", "42", "--post-pr", "7"]);

      // Assert
      expect(mocks.ticketText).toHaveBeenCalledWith("42", "hmcts/cath-service");
      const [seedCall, signInCall] = mocks.spawnSync.mock.calls;
      expect(seedCall[1]).toEqual(expect.arrayContaining(["apps/ui-baseline/cath/seed.ts", `--env=${envName}`, "--only=civil-daily"]));
      expect(signInCall[1]).toEqual(expect.arrayContaining(["apps/ui-baseline/cath/sign-in.ts", `--env=${envName}`]));
      expect(readFileSync(path.join(out, "requirements.md"), "utf-8")).toBe(TICKET);
      const output = logs.join("\n");
      expect(output).toContain("a ticket recording: 1 list types, 0 pages, 0 journeys");
      expect(output).toContain("  civil-daily published");
      expect(output).toContain("  verified-media signed in");
      expect(output).not.toContain("noise");
    });

    it("should report each page in scope it cannot check, with why", async () => {
      // Act
      await runCheck(["--ticket", "42"]);

      // Assert
      const output = logs.join("\n");
      expect(output).toContain("skipped:    NO_CATH_LIST: CaTH has no page for it");
      expect(output).toContain("skipped:    /pip-only: no CaTH page mapped");
      expect(output).toContain("skipped:    /maybe: route-map suggestion (/perhaps) not reviewed yet");
      expect(output).toContain("skipped:    /missing-page: not in the pip baseline");
      expect(output).toContain("not compared: page--needs-value: no CaTH value for id (from missing)");
      expect(output).toContain("not compared: page--unfilled: CaTH route /unfilled/[slug] needs [slug]: add it to the route's cathParams");
      expect(output).toContain("not compared: page--admin: no test account for SYSTEM_ADMIN");
    });

    it("should capture CaTH at the URLs mapped from pip's, with each signed-in language's session", async () => {
      // Act
      await runCheck(["--ticket", "42"]);

      // Assert
      const lists = targetsIn("lists");
      expect(lists.map((t) => [t.id, t.url, t.locales, t.viewport])).toEqual([
        ["civil-daily", `${TARGET}/civil-daily-cause-list?artefactId=CATH-ART-1`, ["en", "cy"], undefined],
        ["civil-daily@verified-media", `${TARGET}/civil-daily-cause-list?artefactId=CATH-ART-1`, ["en"], undefined],
        ["civil-daily@verified-media", `${TARGET}/civil-daily-cause-list?artefactId=CATH-ART-1`, ["cy"], undefined],
        ["civil-daily", `${TARGET}/civil-daily-cause-list?artefactId=CATH-ART-1`, ["en", "cy"], "mobile"]
      ]);
      expect(lists[2].cookies.map((c) => c.value)).toContain("cy-session");
      expect(lists[0].source).toMatchObject({ app: "cath", fixture: "civil-daily", artefactId: "CATH-ART-1", viewAs: null });
      const pages = targetsIn("pages");
      expect(pages.find((t) => t.id === "page--summary-of-publications")?.url).toBe(
        `${TARGET}/summary-of-publications?locationId=PIPLOC&artefactId=CATH-ART-1`
      );
      expect(pages.find((t) => t.id === "page--list-view")?.url).toBe(`${TARGET}/list/7/CATH-ART-1?keep=1&user=CATH-USER`);
      expect(mocks.captureBatches).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ targetsFile: path.join(out, "targets-pages.json"), settings: { outDir: path.join(out, "cath/pages") } })
        ]),
        4
      );
    });

    describe("of a shared CaTH, seeded on courts of the run's own", () => {
      const listenersBefore = process.listenerCount("SIGTERM");
      const RUN_SEED = { ...CATH_SEED, environment: "aat", runToken: "uicsm9x2kababcd", locations: { "9": 90001 } };

      it("should drop the run's token from CaTH's captures and take pip's court to the run's copy of it", async () => {
        // Arrange
        scriptsSucceed(RUN_SEED);
        writeJson(path.join(baseline, "seed.json"), { ...PIP_SEED, locations: { "9": "PIPLOC" } });

        // Act
        await runCheck(["--ticket", "42"]);

        // Assert
        expect(targetsIn("lists")[0].source).toMatchObject({ runToken: "uicsm9x2kababcd" });
        expect(targetsIn("pages").every((target) => target.source.runToken === "uicsm9x2kababcd")).toBe(true);
        expect(targetsIn("pages").find((t) => t.id === "page--summary-of-publications")?.url).toBe(
          `${TARGET}/summary-of-publications?locationId=90001&artefactId=CATH-ART-1`
        );
      });

      it("should remove the run, and its record, when the check ends", async () => {
        // Arrange
        scriptsSucceed(RUN_SEED);

        // Act
        await runCheck(["--ticket", "42"]);

        // Assert
        expect(mocks.removeRuns).toHaveBeenCalledWith("api at http://cath-api.test", { token: "uicsm9x2kababcd" });
        expect(existsSync(seedFile())).toBe(false);
      });

      it("should still remove the run when a step after seeding fails", async () => {
        // Arrange
        mocks.spawnSync.mockImplementation((_command: string, args: string[], options: { env: Record<string, string> }) => {
          if (args.includes("apps/ui-baseline/cath/seed.ts")) {
            writeJson(options.env.PARITY_SEED_OUTPUT, RUN_SEED);
            return { status: 0, stdout: "", stderr: "" };
          }
          return { status: 1, stdout: "", stderr: "Error: IDAM refused the test account" };
        });

        // Act
        const { error } = await runCheck(["--ticket", "42"]);

        // Assert
        expect(error?.message).toBe("signing in to CaTH failed");
        expect(mocks.removeRuns).toHaveBeenCalledWith("api at http://cath-api.test", { token: "uicsm9x2kababcd" });
        expect(existsSync(seedFile())).toBe(false);
      });

      it("should remove the run only once when the check succeeds", async () => {
        // Arrange
        scriptsSucceed(RUN_SEED);

        // Act
        await runCheck(["--ticket", "42"]);

        // Assert
        expect(mocks.removeRuns).toHaveBeenCalledTimes(1);
        expect(process.listenerCount("SIGTERM")).toBe(listenersBefore);
      });

      it("should leave the run in place when --keep-seed is given", async () => {
        // Arrange
        scriptsSucceed(RUN_SEED);

        // Act
        await runCheck(["--ticket", "42", "--keep-seed"]);

        // Assert
        expect(mocks.removeRuns).not.toHaveBeenCalled();
        expect(existsSync(seedFile())).toBe(true);
      });

      it("should finish the check when the run cannot be removed, leaving it to a later check", async () => {
        // Arrange
        scriptsSucceed(RUN_SEED);
        mocks.removeRuns.mockRejectedValueOnce(new Error("DELETE /test-support/locations failed: 500"));

        // Act
        const { error } = await runCheck(["--ticket", "42"]);

        // Assert
        expect(error).toBeUndefined();
        expect(logs.join("\n")).toContain("could not remove run uicsm9x2kababcd, so a later check will");
      });
    });

    it("should remove nothing when CaTH was seeded at the fixture courts themselves", async () => {
      // Act
      await runCheck(["--ticket", "42"]);

      // Assert
      expect(mocks.removeRuns).not.toHaveBeenCalled();
    });

    it("should capture as many pages at once as UI_BASELINE_CONCURRENCY says when --concurrency is not given", async () => {
      // Arrange
      process.env.UI_BASELINE_CONCURRENCY = "6";

      // Act
      await runCheck(["--ticket", "42"]);

      // Assert
      expect(mocks.captureBatches).toHaveBeenCalledWith(expect.any(Array), 6);
    });

    it("should capture as many pages at once as --concurrency says, over UI_BASELINE_CONCURRENCY", async () => {
      // Arrange
      process.env.UI_BASELINE_CONCURRENCY = "6";

      // Act
      await runCheck(["--ticket", "42", "--concurrency", "2"]);

      // Assert
      expect(mocks.captureBatches).toHaveBeenCalledWith(expect.any(Array), 2);
    });

    it("should refuse a concurrency that is not a small whole number", async () => {
      // Act
      const { error } = await runCheck(["--ticket", "42", "--concurrency", "0"]);

      // Assert
      expect(error?.message).toContain("--concurrency");
      expect(mocks.captureBatches).not.toHaveBeenCalled();
    });

    it("should leave captures CaTH redirected or failed out of the comparison", async () => {
      // Act
      await runCheck(["--ticket", "42"]);

      // Assert
      const output = logs.join("\n");
      expect(output).toContain("not compared: page--summary-of-publications cy: CaTH redirected to /sign-in");
      const index = readFileSync(path.join(out, "cath/pages/index.jsonl"), "utf-8");
      expect(index).not.toMatch(/"id":"page--summary-of-publications","locale":"cy"/);
      expect(existsSync(path.join(out, "cath/pages/page--summary-of-publications/cy"))).toBe(false);
      expect(existsSync(path.join(out, "cath/pages/page--summary-of-publications/en"))).toBe(true);
      expect(mocks.compareRuns).toHaveBeenCalledWith({
        source: path.join(baseline, "pages"),
        target: path.join(out, "cath/pages"),
        out: path.join(out, "compare/pages"),
        only: ["page--summary-of-publications", "page--list-view"],
        expectedTarget: expect.any(Function)
      });
    });

    it("should compare the list's files, leaving out an Excel CaTH could not make from JSON", async () => {
      // Act
      await runCheck(["--ticket", "42"]);

      // Assert
      expect(mocks.collectFiles).toHaveBeenCalledWith(
        expect.objectContaining({
          out: path.join(out, "cath/files"),
          // CaTH was seeded with the list as JSON, so only the PDF is waited for
          publications: [{ id: "civil-daily", artefactId: "CATH-ART-1", seededAt: CATH_SEED.seededAt, expectedKinds: ["pdf"] }]
        })
      );
      const summary = JSON.parse(readFileSync(path.join(out, "compare/files/files-compare.json"), "utf-8"));
      expect(summary.totals).toEqual({ files: 1, match: 0, differs: 1, missing: 0, extra: 0 });
      const output = logs.join("\n");
      expect(output).toContain("1 of 1 PDF and Excel files differ from pip");
      expect(output).toContain("    civil-daily PDF (differs)");
    });

    it("should review each area against the ticket and carry on when a review cannot run", async () => {
      // Act
      await runCheck(["--ticket", "42", "--reviewer", "claude  -p"]);

      // Assert
      expect(mocks.reviewFindings).toHaveBeenCalledWith(
        expect.objectContaining({
          compare: path.join(out, "compare/lists/compare.json"),
          requirements: path.join(out, "requirements.md"),
          reviewer: ["claude", "-p"]
        })
      );
      const output = logs.join("\n");
      expect(output).toContain("lists: 1 defects, 0 need a human, 0 intended");
      expect(output).toContain("pages: review skipped (no reviewer found). Run with --reviewer, or --no-review.");
      expect(output).toContain("1 defect, 0 need a human · 2 of 4 pages differ from pip");
      expect(output).toContain("    civil-daily (English, English on mobile)");
      expect(mocks.investigateFindings).not.toHaveBeenCalled();
    });

    it("should report reviewer failures and look again at what needs a human when --investigate is given", async () => {
      // Arrange
      const finding = { id: "p1", category: "content", change: "text-changed", detail: "Heading", pages: ["civil-daily en"] };
      mocks.reviewFindings.mockResolvedValue({
        reviewedAt: "",
        failures: ["items p1–p1: not logged in"],
        totals: { items: 1, intended: 0, defect: 0, needsHuman: 1 },
        items: [{ ...finding, review: { id: "p1", verdict: "needs-human", reason: "The reviewer failed on this batch.", evidence: "" } }]
      });
      mocks.investigateFindings.mockResolvedValue({
        investigated: 1,
        resolved: 1,
        review: {
          reviewedAt: "",
          failures: ["items p1–p1: not logged in"],
          totals: { items: 1, intended: 0, defect: 1, needsHuman: 0 },
          items: [
            {
              ...finding,
              review: { id: "p1", verdict: "defect", reason: "Heading text lost", evidence: "views/x.njk:3", investigated: { outcome: "answered", turns: 4 } }
            }
          ]
        }
      });

      // Act
      const { code } = await runCheck(["--ticket", "42", "--investigate", "5"]);

      // Assert
      expect(mocks.investigateFindings).toHaveBeenCalledWith(
        expect.objectContaining({
          review: path.join(out, "review/lists/review.json"),
          out: path.join(out, "review/lists/review.json"),
          limit: 5,
          sources: expect.arrayContaining([
            { label: "pip captures (lists)", path: path.join(baseline, "lists") },
            { label: "CaTH captures (lists)", path: path.join(out, "cath/lists") }
          ])
        })
      );
      const output = logs.join("\n");
      expect(output).toContain("    reviewer failed on items p1–p1: not logged in");
      expect(output).toContain("lists: looked again at 1, decided 1; now 1 defects, 0 need a human, 0 intended");
      expect(code).toBe(3);
    });

    it("should refuse an --investigate that is not a small positive number", async () => {
      // Act
      const { error } = await runCheck(["--ticket", "42", "--investigate", "0"]);

      // Assert
      expect(error?.message).toContain("--investigate");
    });

    it("should write the report for just the pages checked", async () => {
      // Act
      await runCheck(["--ticket", "42"]);

      // Assert
      const args = reportArgs();
      expect(argAfter(args, "--title")).toBe("Parity check: ticket 42");
      expect(argAfter(args, "--only")).toBe("civil-daily,civil-daily@verified-media,page--summary-of-publications,page--list-view");
      expect(argAfter(args, "--cath-pages")).toBe(path.join(out, "cath/pages"));
      expect(argAfter(args, "--files-compare")).toBe(path.join(out, "compare/files/files-compare.json"));
      expect(argAfter(args, "--review")).toBe(path.join(out, "review/lists/review.json"));
      expect(args).not.toContain("--journeys");
    });

    it("should write and post the PR comment with side-by-side screenshots, and exit 3 for a defect", async () => {
      // Act
      const { code } = await runCheck(["--ticket", "42", "--post-pr", "7"]);

      // Assert
      expect(code).toBe(3);
      const evidence = path.join(out, "evidence");
      expect(mocks.execFileSync).toHaveBeenCalledWith(expect.stringMatching(/zip$/), ["-qr", path.join(evidence, "report.zip"), "."], {
        cwd: path.join(out, "bundle")
      });
      const body = readFileSync(path.join(evidence, "pr-comment.md"), "utf-8");
      expect(body).toContain("## Parity with pip: ticket #42");
      expect(body).toContain("| CIVIL_DAILY_CAUSE_LIST, as verified-media | matches | matches |");
      expect(body).toContain("| /summary-of-publications → /summary-of-publications | matches | matches |");
      expect(body).toContain("| CIVIL_DAILY_CAUSE_LIST | 1 finding | matches |");
      expect(body).toContain("civil-daily-en.png");
      expect(body).toContain("civil-daily-en-mobile.png");
      expect(body).toContain("Excel file not compared: CaTH was seeded through its publication API");
      expect(mocks.postComment).toHaveBeenCalledWith("hmcts/cath-service", 7, body);
      const output = logs.join("\n");
      expect(output).toContain("PR comment: https://github.com/hmcts/cath-service/pull/7#comment");
      expect(output).toContain("edit the comment and drag report.zip and the 3 screenshots into it");
      expect(existsSync(path.join(out, "bundle/data/lists/pip/civil-daily"))).toBe(true);
    });

    it("should count a difference seen only with everything expanded or only on mobile, and say where", async () => {
      // Arrange
      compareResults({
        "page--summary-of-publications": [{ locale: "en", state: "expanded" }],
        "civil-daily": [{ locale: "cy", state: "mobile" }]
      });

      // Act
      await runCheck(["--ticket", "42"]);

      // Assert
      const body = readFileSync(path.join(out, "evidence", "pr-comment.md"), "utf-8");
      expect(body).toContain("| /summary-of-publications → /summary-of-publications | 1 finding (with everything expanded) | matches |");
      expect(body).toContain("| CIVIL_DAILY_CAUSE_LIST | matches | 1 finding (on mobile) |");
      expect(body).toContain("page--summary-of-publications-en-expanded.png");
      const output = logs.join("\n");
      expect(output).toContain("page--summary-of-publications (English with everything expanded)");
      expect(output).toContain("civil-daily (Welsh on mobile)");
    });

    it("should compare the downloads the ticket names, without being given them as routes", async () => {
      // Arrange
      makeBaseline({ files: true, scope: true, downloads: true });
      mocks.ticketText.mockResolvedValue(`${TICKET}, and the \`/pip-download\` file`);
      mocks.loadDownloads.mockResolvedValue([
        { id: "dl-1", kind: "csv", pip: { path: "/pip-download" }, cath: { path: "/cath-download" } },
        { id: "dl-2", kind: "binary", pip: { path: "/pip-public" }, cath: { path: "/cath-public" } }
      ]);
      mocks.captureDownloads.mockResolvedValue({ entries: [], notServed: [] });

      // Act
      await runCheck(["--ticket", "42"]);

      // Assert
      expect(mocks.compareFileRuns).toHaveBeenCalledWith(expect.objectContaining({ source: path.join(baseline, "downloads"), only: ["dl-1"] }));
    });

    it("should throw when seeding CaTH fails", async () => {
      // Arrange
      mocks.spawnSync.mockReturnValue({ status: 1, stdout: "", stderr: "Error: no database\n" });

      // Act
      const { error } = await runCheck(["--ticket", "42"]);

      // Assert
      expect(error?.message).toBe("seeding CaTH failed");
      expect(logs.join("\n")).toContain("  Error: no database");
    });

    it("should throw when signing in to CaTH fails", async () => {
      // Arrange
      mocks.spawnSync.mockImplementation((_command: string, args: string[], options: { env: Record<string, string> }) => {
        if (args.includes("apps/ui-baseline/cath/seed.ts")) {
          writeJson(options.env.PARITY_SEED_OUTPUT, CATH_SEED);
          return { status: 0, stdout: "", stderr: "" };
        }
        return { status: 1, stdout: "", stderr: "" };
      });

      // Act
      const { error } = await runCheck(["--ticket", "42"]);

      // Assert
      expect(error?.message).toBe("signing in to CaTH failed");
    });
  });

  describe("a check of everything", () => {
    beforeEach(() => {
      makeBaseline({ journeys: ["subscribe", "unported"], downloads: true, extraPages: [NOT_FOUND_ID] });
      mocks.loadDownloads.mockResolvedValue([
        {
          id: "dl-1",
          kind: "csv",
          pip: { path: "/pip-download" },
          cath: { path: "/cath-download", params: { artefactId: "publication:flat-list" }, as: "verified-media" }
        },
        { id: "dl-2", kind: "binary", pip: { path: "/pip-public" }, cath: { path: "/cath-public", query: { name: "plain" } } }
      ]);
      mocks.captureDownloads.mockImplementation(async (options: { session: (user: string) => Promise<unknown> }) => ({
        entries: [],
        notServed: [`dl-2: ${JSON.stringify([await options.session("verified-media"), await options.session("nobody")])}`]
      }));
      mocks.runJourneys.mockResolvedValue([
        { journey: "subscribe", locale: "en", ok: true, steps: 3, error: null },
        { journey: "subscribe", locale: "cy", ok: false, steps: 1, error: "timed out\nat step 2" }
      ]);
      mocks.compareJourneys.mockImplementation(async (options: { expectedPath: (pip: string) => string | undefined }) => ({
        source: "",
        target: "",
        comparedAt: "",
        totals: { runs: 2, match: 0, differs: 2, notRun: 0 },
        results: [
          {
            journey: "subscribe",
            locale: "en",
            verdict: "differs",
            findings: [{ category: "journey", change: "x", detail: `expected ${options.expectedPath("/summary-of-publications")}` }],
            steps: [{ name: "a", source: { path: "/a" }, target: { path: "/a" }, verdict: "differs" }]
          },
          { journey: "subscribe", locale: "cy", verdict: "not-run", findings: [], steps: [] },
          {
            journey: "subscribe",
            locale: "en",
            verdict: "differs",
            findings: [{ category: "journey", change: "x", detail: `${options.expectedPath("/list-view")} ${options.expectedPath("/maybe")}` }],
            steps: []
          }
        ],
        pages: {}
      }));
    });

    it("should run the baseline's journeys against a local CaTH, skipping those not ported", async () => {
      // Act
      const { code } = await runCheck(["--all"]);

      // Assert
      expect(code).toBe(0);
      expect(mocks.spawnSync.mock.calls[0][1]).toContain("--only=civil-daily,flat-list,civil-and-family-daily-cause-list");
      expect(mocks.runJourneys).toHaveBeenCalledWith(path.join(PARITY_DIR, "cath/journeys/index.ts"), {
        outDir: path.join(out, "cath/journeys"),
        locales: ["en", "cy"],
        only: ["subscribe"],
        onRun: expect.any(Function)
      });
      expect(process.env.PARITY_TARGET).toBe(TARGET);
      const output = logs.join("\n");
      expect(output).toContain("1 of 2 journeys ported to CaTH; the rest are not compared");
      expect(output).toContain("stopped: subscribe (cy): timed out");
      expect(output).toContain("    subscribe (English): expected /summary-of-publications; 1 step page differ");
      expect(output).toContain("    subscribe (Welsh): not-run");
      expect(output).toContain("    subscribe (English): undefined undefined");
      expect(output).toContain("3 of 2 journey runs differ from pip");
    });

    it("should leave its progress with every stage finished or said to be not needed", async () => {
      // Act
      await runCheck(["--all"]);

      // Assert
      const { stages } = JSON.parse(readFileSync(path.join(out, "progress.json"), "utf-8")) as {
        stages: { id: string; status: string; done?: number; total?: number; reason?: string }[];
      };
      const byId = Object.fromEntries(stages.map(({ id, status, done, total, reason }) => [id, { status, done, total, reason }]));
      expect(stages.map((stage) => stage.id)).toEqual([
        "seed",
        "sign-in",
        "capture-lists",
        "capture-pages",
        "journeys",
        "compare",
        "files",
        "downloads",
        "review",
        "report",
        "evidence"
      ]);
      expect(stages.filter((stage) => stage.status === "pending" || stage.status === "running")).toEqual([]);
      expect(byId.journeys).toEqual({ status: "done", done: 2, total: 2, reason: undefined });
      expect(byId["capture-pages"]).toMatchObject({ status: "done", done: byId["capture-pages"].total });
      expect(byId.review).toEqual({ status: "skipped", done: undefined, total: undefined, reason: "no ticket to review against" });
      expect(byId.evidence).toMatchObject({ status: "skipped", reason: "not written for a check of everything" });
    });

    it("should count skipped pages by reason, capture the not-found page, and report the whole baseline", async () => {
      // Act
      await runCheck(["--all"]);

      // Assert
      const output = logs.join("\n");
      expect(output).toContain("skipped:    1 no CaTH page mapped");
      expect(output).toContain("skipped:    1 route-map suggestion not reviewed yet");
      expect(output).toContain("PDF and Excel files not compared: the baseline has none");
      const notFound = targetsIn("pages").find((t) => t.id === NOT_FOUND_ID);
      expect(notFound?.url).toBe(`${TARGET}${NOT_FOUND_PATH}`);
      expect(notFound?.source.expectedStatus).toBe(404);
      const args = reportArgs();
      expect(argAfter(args, "--title")).toBe("pip baseline against CaTH");
      expect(argAfter(args, "--run")).toBe(path.join(baseline, "run.json"));
      expect(argAfter(args, "--cath-journeys")).toBe(path.join(out, "cath/journeys"));
      expect(args).not.toContain("--only");
      expect(existsSync(path.join(out, "evidence"))).toBe(false);
    });

    it("should fetch each download as its user and record those CaTH does not serve", async () => {
      // Act
      await runCheck(["--all"]);

      // Assert
      expect(mocks.captureDownloads).toHaveBeenCalledWith(expect.objectContaining({ app: "cath", baseUrl: TARGET, out: path.join(out, "cath/downloads") }));
      expect(mocks.seedResolver).toHaveBeenCalledWith(CATH_SEED.publications, SIGN_IN.records);
      expect(mocks.compareFileRuns).toHaveBeenCalledWith({
        source: path.join(baseline, "downloads"),
        target: path.join(out, "cath/downloads"),
        out: path.join(out, "compare/files"),
        only: ["dl-1", "dl-2"]
      });
      expect(logs.join("\n")).toContain("0 files compared: 0 match, 0 differ, 0 CaTH did not make, 0 only CaTH made");
    });

    it("should not run journeys outside a local CaTH, as they change its data", async () => {
      // Arrange
      setEnvironment("accounts");
      mocks.loadDownloads.mockResolvedValue([]);

      // Act
      const { code } = await runCheck(["--all"]);

      // Assert
      expect(code).toBe(0);
      expect(mocks.runJourneys).not.toHaveBeenCalled();
      expect(logs.join("\n")).toContain("skipped:    2 not run by --all outside a local CaTH, as journeys change its data");
    });

    it("should serve the report rather than exit when asked to", async () => {
      // Act
      void runCheck(["--all", "--serve"]);

      // Assert
      await vi.waitFor(() => expect(mocks.spawn).toHaveBeenCalled());
      expect(mocks.spawn).toHaveBeenCalledWith(process.execPath, [path.join(PARITY_DIR, "report/serve.mjs"), path.join(out, "report"), "9500"], {
        stdio: "inherit",
        detached: false
      });
      expect(process.exit).not.toHaveBeenCalled();
    });
  });

  describe("a check of named journeys", () => {
    it("should skip journeys missing from the baseline or not ported, without seeding when told not to", async () => {
      // Arrange
      makeBaseline({ journeys: ["unported"] });

      // Act
      const { code } = await runCheck([
        "--journey",
        "unported",
        "--journey",
        "absent",
        "--list-type",
        "FLAT_FILE_LIST",
        "--no-seed",
        "--no-files",
        "--no-review"
      ]);

      // Assert
      expect(code).toBe(0);
      expect(mocks.spawnSync.mock.calls.map((call) => call[1])).toEqual([expect.arrayContaining(["apps/ui-baseline/cath/sign-in.ts"])]);
      expect(mocks.captureBatches).not.toHaveBeenCalled();
      expect(mocks.runJourneys).not.toHaveBeenCalled();
      const body = readFileSync(path.join(out, "evidence/pr-comment.md"), "utf-8");
      expect(body).toContain("- journey absent: not in the pip baseline");
      expect(body).toContain("- journey unported: not ported to CaTH yet (cath/journeys/)");
      const output = logs.join("\n");
      expect(output).not.toContain("(not reviewed against a ticket)");
      expect(output).toContain("paste pr-comment.md into a PR comment, then drag report.zip into it");
    });

    it("should check a flat-file list on its court's summary of publications", async () => {
      // Arrange
      makeBaseline();

      // Act
      const { code } = await runCheck(["--list-type", "CATH_FLAT", "--locale", "cy"]);

      // Assert
      expect(code).toBe(0);
      expect(targetsIn("lists")[0]).toMatchObject({ id: "flat-list", url: `${TARGET}/summary-of-publications?locationId=9`, locales: ["cy"] });
      expect(mocks.spawnSync).toHaveBeenCalledTimes(1);
      expect(logs.join("\n")).toContain("0 of 1 page differ from pip (not reviewed against a ticket)");
      expect(readFileSync(path.join(out, "evidence/pr-comment.md"), "utf-8")).toContain("| FLAT_FILE_LIST | matches | matches |");
    });
  });
});
