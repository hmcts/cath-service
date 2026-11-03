import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The script reads pip-routes.json and route-map.json beside it and CaTH's page directories, and
// writes route-map.json; each of those paths is sent to a temporary directory
const { sandbox } = vi.hoisted(() => ({ sandbox: { redirects: [] as [string, string][] } }));

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  const redirect = (file: string) => {
    const hit = sandbox.redirects.find(([from]) => file === from || file.startsWith(`${from}/`));
    return hit ? hit[1] + file.slice(hit[0].length) : file;
  };
  const via = <F>(fn: F) => ((file: string, ...rest: unknown[]) => (fn as (...args: unknown[]) => unknown)(redirect(file), ...rest)) as F;
  return {
    ...actual,
    readFile: via(actual.readFile),
    readdir: via(actual.readdir),
    writeFile: via(actual.writeFile)
  };
});
vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  const redirect = (file: string) => {
    const hit = sandbox.redirects.find(([from]) => file === from || file.startsWith(`${from}/`));
    return hit ? hit[1] + file.slice(hit[0].length) : file;
  };
  return { ...actual, existsSync: (file: string) => actual.existsSync(redirect(file)) };
});

const ROUTES_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_DIR = path.join(ROUTES_DIR, "../../..");

const PIP_ROUTES = [
  { path: "/", category: "public", captureAs: null },
  { path: "/search", category: "public", captureAs: null },
  { path: "/summary-of-publications", category: "public", captureAs: null },
  { path: "/audit-log-viewer", category: "signed-in", captureAs: "system-admin" },
  { path: "/subscription-confirmed", category: "journey-step", captureAs: "verified-media" },
  { path: "/reviewed-page", category: "signed-in", captureAs: "system-admin" },
  { path: "/zzz-unrelated", category: "public", captureAs: null },
  { path: "/civil-daily-cause-list", category: "list-page", captureAs: null }
];
const CATH_PAGES: Record<string, string> = {
  "web/index.ts": "export const GET = async () => {};",
  "web/en.ts": 'export const en = {\n  title: "Court and tribunal hearings",\n};',
  "web/(public)/search/index.ts": "export async function GET() {}",
  "web/(public)/search/en.ts": "export const en = {\n  heading: 'Ignored',\n  pageTitle: 'Search for a court',\n};",
  "web/(public)/search/index.test.ts": "export const GET = 1;",
  "web/(public)/search/helpers.ts": "export const helper = 1;",
  "web/view-option/index.ts": "export const POST = async () => {};",
  "web/view-option/en.ts": "export const en = {\n  title: `What do you want to do?`,\n};",
  "web/audit-log-list/index.ts": "export const GET = [requireRole([USER_ROLES.SYSTEM_ADMIN, USER_ROLES.SYSTEM_ADMIN]), handler];",
  "web/audit-log-list/en.ts": "export const en = {\n  header: 'Audit log',\n};",
  "web/audit-log-detail/index.ts": "export const GET = async () => {};",
  "web/subscription-success/index.ts": "export function GET() {}",
  "web/media-applications/[id].ts": "export const GET = async () => {};",
  "web/media-applications/[id]/approve.ts": "export const POST = async () => {};",
  "web/media-applications/[id]/approve-en.ts": "export const en = {\n  title: 'Approve application',\n};",
  "web/media-applications/[id]/en.ts": "export const en = {\n  title: 'Application',\n};",
  "admin/system-admin-dashboard/index.ts": "export const GET = async () => {};"
};
const REVIEWED = {
  pip: "/reviewed-page",
  pipHeading: null,
  cathTitle: null,
  pipCategory: "signed-in",
  pipRole: "system-admin",
  cath: null,
  cathRoles: null,
  match: "unmapped",
  score: 0,
  reviewed: true
};

describe("route-map script", () => {
  const argv = process.argv;
  let log: ReturnType<typeof vi.spyOn>;
  let dir: string;

  beforeEach(async () => {
    vi.resetModules();
    dir = await mkdtemp(path.join(tmpdir(), "route-map-"));
    sandbox.redirects = [
      [path.join(ROUTES_DIR, "pip-routes.json"), path.join(dir, "pip-routes.json")],
      [path.join(ROUTES_DIR, "route-map.json"), path.join(dir, "route-map.json")],
      [path.join(REPO_DIR, "apps/web/src/pages"), path.join(dir, "web")],
      [path.join(REPO_DIR, "libs/system-admin-pages/src/pages"), path.join(dir, "admin")]
    ];
    await writeFile(path.join(dir, "pip-routes.json"), JSON.stringify({ routes: PIP_ROUTES }));
    for (const [file, content] of Object.entries(CATH_PAGES)) {
      await mkdir(path.dirname(path.join(dir, file)), { recursive: true });
      await writeFile(path.join(dir, file), content);
    }
    log = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    process.argv = argv;
    sandbox.redirects = [];
    log.mockRestore();
  });

  const run = async (...args: string[]) => {
    process.argv = ["node", "route-map.ts", ...args];
    await import("./route-map.js");
    const map = JSON.parse(await readFile(path.join(dir, "route-map.json"), "utf-8"));
    return { ...map, byPip: Object.fromEntries(map.routes.map((entry: { pip: string }) => [entry.pip, entry])) };
  };

  it("should match same paths, suggest by name, and leave the rest unmapped when there is no baseline run", async () => {
    // Act
    const map = await run();

    // Assert
    expect(map.routes.map((entry: { pip: string }) => entry.pip)).toEqual([
      "/",
      "/search",
      "/summary-of-publications",
      "/audit-log-viewer",
      "/subscription-confirmed",
      "/reviewed-page",
      "/zzz-unrelated"
    ]);
    expect(map.byPip["/"]).toEqual({
      pip: "/",
      pipHeading: null,
      pipCategory: "public",
      pipRole: null,
      cath: "/",
      cathTitle: "Court and tribunal hearings",
      cathRoles: [],
      match: "same-path",
      score: 1,
      reviewed: false
    });
    expect(map.byPip["/search"]).toMatchObject({ cath: "/search", cathTitle: "Search for a court", match: "same-path" });
    expect(map.byPip["/audit-log-viewer"]).toMatchObject({
      cath: "/audit-log-list",
      cathTitle: "Audit log",
      cathRoles: ["SYSTEM_ADMIN"],
      match: "suggested",
      score: 1,
      confidence: "low",
      alternatives: ["/audit-log-detail"]
    });
    expect(map.byPip["/subscription-confirmed"]).toMatchObject({ cath: "/subscription-success", cathTitle: null, match: "suggested", confidence: "low" });
    expect(map.byPip["/summary-of-publications"]).toMatchObject({ cath: null, match: "unmapped" });
    expect(map.byPip["/zzz-unrelated"]).toMatchObject({ cath: null, match: "unmapped", score: 0 });
    expect(map.byPip["/reviewed-page"]).toMatchObject({ match: "unmapped", reviewed: false });
    expect(map.cathOnly).toEqual(
      expect.arrayContaining(["/view-option", "/media-applications/[id]", "/media-applications/[id]/approve", "/system-admin-dashboard"])
    );
    expect(map.cathOnly).not.toContain("/search/helpers");
    expect(map.counts).toEqual({ "same-path": 2, "suggested-low": 2, unmapped: 3 });
    expect(log).toHaveBeenCalledWith("7 pip routes:", map.counts, `· ${map.cathOnly.length} CaTH routes with no pip counterpart`);
  });

  it("should suggest by pip's headings from a baseline run, with high confidence when they are identical, and keep reviewed entries", async () => {
    // Arrange
    await writeFile(
      path.join(dir, "route-map.json"),
      JSON.stringify({ routes: [REVIEWED, { ...REVIEWED, pip: "/search", cath: "/elsewhere", reviewed: false }] })
    );
    const runDir = await baselineRun();

    // Act
    const map = await run(runDir);

    // Assert
    expect(map.byPip["/reviewed-page"]).toEqual(REVIEWED);
    expect(map.byPip["/search"]).toMatchObject({ cath: "/search", match: "same-path", pipHeading: "Search" });
    expect(map.byPip["/summary-of-publications"]).toMatchObject({
      pipHeading: "What do you want to do?",
      cath: "/view-option",
      match: "suggested",
      score: 1,
      confidence: "high"
    });
    expect(map.byPip["/subscription-confirmed"]).toMatchObject({ pipHeading: "Subscription confirmed" });
    expect(map.byPip["/audit-log-viewer"].pipHeading).toBeNull();
    expect(map.counts).toEqual({ "same-path": 2, "suggested-high": 1, "suggested-low": 2, "reviewed-no-cath-page": 1, unmapped: 1 });
  });

  it("should count a reviewed entry that has a CaTH page as reviewed", async () => {
    // Arrange
    await writeFile(path.join(dir, "route-map.json"), JSON.stringify({ routes: [{ ...REVIEWED, cath: "/system-admin-dashboard" }] }));

    // Act
    const map = await run(await mkdtemp(path.join(tmpdir(), "empty-run-")));

    // Assert
    expect(map.counts.reviewed).toBe(1);
    expect(map.cathOnly).not.toContain("/system-admin-dashboard");
  });
});

async function baselineRun(): Promise<string> {
  const runDir = await mkdtemp(path.join(tmpdir(), "baseline-run-"));
  const write = async (relative: string, content: unknown) => {
    await mkdir(path.dirname(path.join(runDir, relative)), { recursive: true });
    await writeFile(path.join(runDir, relative), typeof content === "string" ? content : JSON.stringify(content));
  };
  const pages = [
    { id: "page--summary", locale: "en", state: "default", source: { route: "/summary-of-publications" } },
    { id: "page--summary", locale: "cy", state: "default", source: { route: "/summary-of-publications" } },
    { id: "page--summary", locale: "en", state: "expanded", source: { route: "/summary-of-publications" } },
    { id: "page--search", locale: "en", state: "default", source: { route: "/search" } },
    { id: "page--audit", locale: "en", state: "default", source: { route: "/audit-log-viewer" } }
  ];
  await write("pages/index.jsonl", `${pages.map((page) => JSON.stringify(page)).join("\n")}\n`);
  await write("pages/page--summary/en/default/meta.json", { h1: ["What do you want to do?"] });
  await write("pages/page--search/en/default/meta.json", { h1: ["Search"] });
  await write("pages/page--audit/en/default/meta.json", { h1: [] });
  await write("journeys/subscriptions/en/journey.json", {
    steps: [
      { path: "/subscription-confirmed", h1: ["There is a problem", "Subscription confirmed"] },
      { path: "/subscription-confirmed", h1: ["Later heading"] },
      { path: "/search", h1: ["Not the page's heading"] },
      { path: "/no-heading" }
    ]
  });
  await mkdir(path.join(runDir, "journeys/not-recorded"), { recursive: true });
  return runDir;
}
