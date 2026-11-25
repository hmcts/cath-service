import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The script writes routes/pip-routes.json; that path is sent to a temporary directory
const { sandbox } = vi.hoisted(() => ({ sandbox: { from: "", to: "" } }));

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  const redirect = (file: string) => (sandbox.from && file === sandbox.from ? sandbox.to : file);
  const via = <F>(fn: F) => ((file: string, ...rest: unknown[]) => (fn as (...args: unknown[]) => unknown)(redirect(file), ...rest)) as F;
  return {
    ...actual,
    writeFile: via(actual.writeFile)
  };
});

const ROUTES_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), "pip-routes.json");

const ROUTES_TS = `
export default function (app, passport): void {
  app.get('/', app.locals.container.cradle.homeController.get);
  app.post('/search', app.locals.container.cradle.searchController.post);
  app.get('/search', app.locals.container.cradle.searchController.get);
  app.get('/civil-daily-cause-list', app.locals.container.cradle.civilDailyCauseListController.get);
  app.get('/login', passport.authenticate('login'), regenerateSession);
  app.get('/sso/return', (req, res) => res.redirect('/'));
  app.get('/admin-dashboard', isPermittedAdmin, app.locals.container.cradle.adminDashboardController.get);
  app.get('/media-account-review', isPermittedMediaAccount, app.locals.container.cradle.mediaAccountReviewController.get);
  app.get('/subscription-confirmed', isPermittedMedia, app.locals.container.cradle.subscriptionConfirmedController.get);
  app.get('/robots.txt', (req, res) => res.send(req.query.format));
  app.get('/unknown-controller', app.locals.container.cradle.missingController.get);
  app.get('/*', (req, res) => res.render('not-found'));
}
`;
const LIST_LOOKUP = { CIVIL_DAILY_CAUSE_LIST: { url: "civil-daily-cause-list" }, DEPRECATED_LIST: { url: "" } };
const CONTROLLERS: Record<string, string> = {
  "HomeController.ts": "export default class { get(req, res) { res.render('home'); } }",
  // Inside a method, as pip's controllers are: the destructuring must not be read from the method's own brace
  "SearchController.ts": "get(req, res) {\n  const location = req.query.locationId;\n  const { error, page: pageNumber } = req.query;\n}",
  "list/CivilDailyCauseListController.ts": "get(req, res) { const id = req.query?.artefactId; const lang = req.query['lng']; const x = req.query?.['other']; }",
  "admin/AdminDashboardController.ts": "get(req, res) {}",
  "admin/MediaAccountReviewController.ts": "get(req, res) { req.query.applicantId; }",
  "SubscriptionConfirmedController.ts": "get(req, res) {}",
  "helpers.ts": "req.query.ignored"
};

describe("inventory script", () => {
  const argv = process.argv;
  let log: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.resetModules();
    log = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    process.argv = argv;
    sandbox.from = "";
    log.mockRestore();
  });

  it("should need a pip-frontend checkout", async () => {
    // Arrange
    process.argv = ["node", "inventory.ts"];

    // Act and assert
    await expect(import("./inventory.js")).rejects.toThrow("usage: inventory.ts <pip-frontend checkout>");
  });

  it("should list every GET route with its category, guard, capture user and query parameters", async () => {
    // Arrange
    const checkout = await pipFrontendCheckout();
    sandbox.from = ROUTES_FILE;
    sandbox.to = path.join(checkout, "pip-routes.json");
    process.argv = ["node", "inventory.ts", checkout];

    // Act
    await import("./inventory.js");

    // Assert
    const inventory = JSON.parse(await readFile(sandbox.to, "utf-8"));
    const byPath = Object.fromEntries(inventory.routes.map((route: { path: string }) => [route.path, route]));
    expect(inventory.routes.map((route: { path: string }) => route.path)).toEqual([
      "/",
      "/search",
      "/civil-daily-cause-list",
      "/login",
      "/sso/return",
      "/admin-dashboard",
      "/media-account-review",
      "/subscription-confirmed",
      "/robots.txt",
      "/unknown-controller",
      "/*"
    ]);
    expect(byPath["/"]).toEqual({
      path: "/",
      category: "public",
      guard: null,
      roles: null,
      captureAs: null,
      controller: "home",
      queryParams: [],
      needsData: false
    });
    expect(byPath["/search"]).toMatchObject({ category: "public", controller: "search", queryParams: ["locationId", "error", "page"], needsData: true });
    expect(byPath["/civil-daily-cause-list"]).toMatchObject({ category: "list-page", queryParams: ["artefactId", "lng", "other"] });
    expect(byPath["/login"].category).toBe("auth-hand-off");
    expect(byPath["/sso/return"].category).toBe("auth-hand-off");
    expect(byPath["/admin-dashboard"]).toMatchObject({
      category: "signed-in",
      guard: "isPermittedAdmin",
      roles: "all admin roles",
      captureAs: "super-admin-local",
      controller: "adminDashboard"
    });
    expect(byPath["/media-account-review"]).toMatchObject({ guard: "isPermittedMediaAccount", captureAs: "super-admin-ctsc", queryParams: ["applicantId"] });
    expect(byPath["/subscription-confirmed"]).toMatchObject({ category: "journey-step", guard: "isPermittedMedia", captureAs: "verified-media" });
    expect(byPath["/robots.txt"]).toMatchObject({ category: "public", controller: null, queryParams: ["format"] });
    expect(byPath["/unknown-controller"]).toMatchObject({ controller: "missing", queryParams: [] });
    expect(byPath["/*"].category).toBe("middleware");
    expect(inventory.counts).toEqual({ public: 4, "list-page": 1, "auth-hand-off": 2, "signed-in": 2, "journey-step": 1, middleware: 1 });
    expect(inventory.$comment).toContain("Generated by inventory.ts");
    expect(log).toHaveBeenCalledWith("11 GET routes", inventory.counts);
  });
});

async function pipFrontendCheckout(): Promise<string> {
  const checkout = await mkdtemp(path.join(tmpdir(), "pip-frontend-"));
  const write = async (relative: string, content: string) => {
    await mkdir(path.dirname(path.join(checkout, relative)), { recursive: true });
    await writeFile(path.join(checkout, relative), content);
  };
  await write("src/main/routes/routes.ts", ROUTES_TS);
  await write("src/main/resources/listLookup.json", JSON.stringify(LIST_LOOKUP));
  for (const [file, content] of Object.entries(CONTROLLERS)) await write(`src/main/controllers/${file}`, content);
  return checkout;
}
