import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadUsers, type ParityUser } from "../fixtures/manifest.js";

// The script reads routes/pip-routes.json and output/seed/pip.json, and writes under output/targets;
// those paths are sent to a temporary directory
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
    writeFile: via(actual.writeFile),
    mkdir: via(actual.mkdir)
  };
});
vi.mock("../fixtures/manifest.js", () => ({ loadUsers: vi.fn() }));

const PARITY_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const USERS: ParityUser[] = [
  user("verified-media", "PI_AAD", "VERIFIED"),
  user("system-admin", "SSO", "SYSTEM_ADMIN"),
  user("super-admin-local", "SSO", "INTERNAL_SUPER_ADMIN_LOCAL"),
  { ...user("journey-admin", "SSO", "SYSTEM_ADMIN"), journeysOnly: true }
];
const route = (routePath: string, category: string, queryParams: string[] = [], guard: string | null = null, captureAs: string | null = null) => ({
  path: routePath,
  category,
  guard,
  captureAs,
  controller: `${routePath}-controller`,
  queryParams
});
const ROUTES = [
  route("/", "public"),
  route("/search", "public", ["locationId", "error", "page"]),
  route("/robots.txt", "public"),
  route("/civil-daily-cause-list", "list-page", ["artefactId"]),
  route("/subscription-confirmed", "journey-step"),
  route("/admin-dashboard", "signed-in", [], "isPermittedAdmin", "super-admin-local"),
  route("/user-management", "signed-in", ["email", "roles", "id"], "isPermittedSystemAdmin", "system-admin"),
  route("/manage-third-party-users/view", "signed-in", ["userId"], "isPermittedSystemAdmin", "system-admin"),
  route("/manage-third-party-subscribers/view", "signed-in", ["userId"], "isPermittedSystemAdmin", "system-admin"),
  route("/audit-log-details", "signed-in", ["id", "timestamp"], "isPermittedSystemAdmin", "system-admin"),
  route("/delete-subscription", "signed-in", ["subscription", "listType"], "isPermittedMedia", "verified-media"),
  route("/mystery", "public", ["foo"])
];
const SEED = {
  app: "pip",
  seededAt: "2026-10-01T00:00:00Z",
  ingestion: "api",
  publications: { "civil-and-family-daily-cause-list": { artefactId: "a1", locationId: 7 } },
  rejected: {},
  users: { "verified-media": "pip-user-1" },
  records: {
    "legacy-third-party": { userId: "legacy-1" },
    "manage-user-audit": { id: "audit-1", timestamp: "2026-09-30T14:05:06.123Z" },
    "location-subscription": { subscriptionId: "sub-1" }
  }
};

describe("build-page-targets script", () => {
  let log: ReturnType<typeof vi.spyOn>;
  let dir: string;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.stubEnv("PIP_ACCOUNT_MANAGEMENT_URL", undefined);
    dir = await mkdtemp(path.join(tmpdir(), "page-targets-"));
    sandbox.redirects = [
      [path.join(PARITY_DIR, "routes/pip-routes.json"), path.join(dir, "pip-routes.json")],
      [path.join(PARITY_DIR, "output"), path.join(dir, "output")]
    ];
    await writeFile(path.join(dir, "pip-routes.json"), JSON.stringify({ routes: ROUTES }));
    await mkdir(path.join(dir, "output/seed"), { recursive: true });
    await writeSeed(SEED);
    vi.mocked(loadUsers).mockResolvedValue(USERS);
    fetchMock = vi.fn(async () => Response.json({ userId: "pip-user-1" }));
    vi.stubGlobal("fetch", fetchMock);
    log = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    sandbox.redirects = [];
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    log.mockRestore();
  });

  const writeSeed = (seed: unknown) => writeFile(path.join(dir, "output/seed/pip.json"), JSON.stringify(seed));
  const run = async () => {
    await import("./build-page-targets.js");
    return {
      targets: JSON.parse(await readFile(path.join(dir, "output/targets/pip-pages.json"), "utf-8")),
      pending: JSON.parse(await readFile(path.join(dir, "output/targets/pip-pages-pending.json"), "utf-8"))
    };
  };

  it("should build a target for each page with its query filled from the seed, as each role its guard lets in", async () => {
    // Act
    const { targets } = await run();

    // Assert
    const desktop = targets.filter((target: { viewport?: string }) => !target.viewport);
    const byId = Object.fromEntries(desktop.map((target: { id: string }) => [target.id, target]));
    expect(desktop.map((target: { id: string }) => target.id)).toEqual([
      "page--",
      "page--@verified-media",
      "page--search",
      "page--search@verified-media",
      "page--admin-dashboard",
      "page--admin-dashboard@system-admin",
      "page--user-management",
      "page--manage-third-party-users--view",
      "page--audit-log-details",
      "page--delete-subscription",
      "page--not-found-address"
    ]);
    expect(byId["page--"]).toMatchObject({
      url: "https://localhost:8180/",
      locales: ["en", "cy"],
      source: { app: "pip", kind: "page", route: "/", guard: null, viewAs: null, controller: "/-controller", seededAt: SEED.seededAt }
    });
    expect(byId["page--"].setup).toBeUndefined();
    expect(byId["page--@verified-media"].setup).toEqual(["https://localhost:8180/parity-login?oid=pid-verified-media&flow=AAD&redirect=/"]);
    expect(byId["page--search"].url).toBe("https://localhost:8180/search?locationId=7");
    expect(byId["page--admin-dashboard"]).toMatchObject({ setup: ["https://localhost:8180/parity-login?oid=pid-super-admin-local&flow=SSO&redirect=/"] });
    expect(byId["page--admin-dashboard@system-admin"].source.viewAs).toBe("system-admin");
    expect(byId["page--user-management"].url).toBe("https://localhost:8180/user-management?id=pip-user-1");
    expect(byId["page--manage-third-party-users--view"].url).toBe("https://localhost:8180/manage-third-party-users/view?userId=legacy-1");
    expect(byId["page--audit-log-details"].url).toBe(
      `https://localhost:8180/audit-log-details?${new URLSearchParams({ id: "audit-1", timestamp: "30/09/2026 14:05:06" })}`
    );
    expect(byId["page--delete-subscription"].url).toBe(
      "https://localhost:8180/delete-subscription?subscription=sub-1&listType=CIVIL_AND_FAMILY_DAILY_CAUSE_LIST"
    );
    expect(byId["page--not-found-address"]).toMatchObject({
      url: "https://localhost:8180/ui-baseline-page-that-does-not-exist",
      source: { expectedStatus: 404, viewAs: null }
    });
    expect(targets.filter((target: { viewport?: string }) => target.viewport === "mobile")).toHaveLength(8);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("should report a page as pending when its data was not seeded or has no value rule", async () => {
    // Act
    const { pending } = await run();

    // Assert
    expect(pending).toEqual([
      { path: "/manage-third-party-subscribers/view", reason: 'records.json "third-party-subscriber" was not seeded' },
      { path: "/mystery", reason: 'no value rule for query parameter "foo"' }
    ]);
    expect(log).toHaveBeenCalledWith('  pending /mystery: no value rule for query parameter "foo"');
    expect(log).toHaveBeenCalledWith(expect.stringMatching(/^wrote 19 page targets → .*pip-pages\.json; 2 pending$/));
  });

  it("should report the audit details page as pending when the audit record was not seeded", async () => {
    // Arrange
    await writeSeed({ ...SEED, records: undefined });

    // Act
    const { pending } = await run();

    // Assert
    expect(pending).toContainEqual({ path: "/audit-log-details", reason: 'records.json "manage-user-audit" was not seeded' });
    expect(pending).toContainEqual({ path: "/manage-third-party-users/view", reason: 'records.json "legacy-third-party" was not seeded' });
    expect(pending).toContainEqual({ path: "/delete-subscription", reason: 'records.json "location-subscription" was not seeded' });
  });

  it("should report a page that names a user as pending when the seed has no pip id for it", async () => {
    // Arrange
    await writeSeed({ ...SEED, users: undefined });

    // Act
    const { pending } = await run();

    // Assert
    expect(pending).toContainEqual({ path: "/user-management", reason: "the seed has no pip id for verified-media" });
  });

  it("should stop when a fixture user it needs is missing", async () => {
    // Arrange
    vi.mocked(loadUsers).mockResolvedValue(USERS.filter((candidate) => candidate.id !== "verified-media"));

    // Act and assert
    await expect(import("./build-page-targets.js")).rejects.toThrow("missing verified-media");
  });
});

function user(id: string, provenance: ParityUser["provenance"], role: string): ParityUser {
  return { id, provenance, role, provenanceUserId: `pid-${id}`, email: `${id}@example.com`, forenames: id, surname: "User" };
}
