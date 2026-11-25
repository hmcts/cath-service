import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadUsers, type ParityUser, type SeedResult } from "../fixtures/manifest.js";
import { loadPipSessions, signedInTargets } from "../pip/session.js";
import { NOT_FOUND_ID, NOT_FOUND_PATH, SIGNED_IN_VIEWER, variantId, variantUsers, withMobile } from "../variants.js";

// Builds capture targets for pip's non-list pages from the route inventory. Query parameters are
// filled from what the seeders created; a page whose data is not seeded yet is reported as pending
// with the reason, never captured with an invented value. pip is the pip UI_BASELINE_PIP_ENV names
// (pip/session.ts); a role that cannot be signed in there is reported, and its variant not captured.
const PARITY_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const LOCALES = ["en", "cy"];
// The publication whose location, artefact and list type stand in wherever a page needs one
const REFERENCE_PUBLICATION = "civil-and-family-daily-cause-list";
// Read by the controller but not needed to render the page's normal state
// Filter, paging and error-banner state: read by controllers but not needed for the page's normal state
const OPTIONAL_PARAMS = new Set(["error", "verified", "currentPath", "clear", "showerror", "filterValues", "page"]);
// Pages that are not HTML or are pip internals rather than user-facing pages
// Search filters on list-of-records pages: empty shows the unfiltered list
const ROUTE_OPTIONAL_PARAMS: Record<string, string[]> = {
  "/user-management": ["email", "userId", "userProvenanceId", "roles", "provenances"],
  "/audit-log-viewer": ["email", "userId", "actions"]
};
// Not user-facing HTML pages: pip internals, and routes that respond with a file download
const NOT_PAGES = new Set([
  "/robots.txt",
  "/info",
  "/list-download-files",
  "/blob-view-publication-download",
  "/manual-reference-data-download",
  "/file-publication",
  "/media-account-review/image"
]);

const inventory = JSON.parse(await readFile(path.join(PARITY_DIR, "routes/pip-routes.json"), "utf-8")) as { routes: InventoryRoute[] };
const sessions = await loadPipSessions();
const config = { baseUrl: sessions.baseUrl, cookies: sessions.cookies };
const seed = JSON.parse(await readFile(path.join(PARITY_DIR, "output/seed/pip.json"), "utf-8")) as SeedResult;
const users = new Map((await loadUsers()).map((user) => [user.id, user]));
const reference = seed.publications[REFERENCE_PUBLICATION];
const listTypeName = REFERENCE_PUBLICATION.toUpperCase().replace(/-/g, "_");
// The pip id of the user pages that name one are about (/manage-user?id=), which the seed recorded
const pipUserId = seed.users?.[SIGNED_IN_VIEWER] ?? { pending: `the seed has no pip id for ${SIGNED_IN_VIEWER}` };

const records = seed.records ?? {};
const record = (id: string, field: string) => records[id]?.[field] ?? { pending: `records.json "${id}" was not seeded` };
const thirdPartySubscriber = (name: string) => (name === "userId" ? record("third-party-subscriber", "userId") : undefined);
const legacyThirdParty = (name: string) => (name === "userId" ? record("legacy-third-party", "userId") : undefined);

const PARAM_VALUES: Record<string, string | { pending: string }> = {
  locationId: String(reference.locationId),
  artefactId: reference.artefactId,
  listType: listTypeName,
  id: pipUserId,
  type: "pdf",
  // One of pip's reSignInUrls keys; only changes which sign-in link the page offers
  reSignInUrl: "AAD",
  subscription: record("location-subscription", "subscriptionId"),
  applicantId: record("pending-application", "applicantId"),
  imageId: record("pending-application", "imageId")
};
// Where a parameter means different things on different pages, the route decides
const ROUTE_PARAM_VALUES: Record<string, (name: string) => string | { pending: string } | undefined> = {
  "/manage-third-party-users/view": legacyThirdParty,
  "/manage-third-party-users/subscriptions": legacyThirdParty,
  "/manage-third-party-subscribers/view": thirdPartySubscriber,
  "/manage-third-party-subscriber-status": thirdPartySubscriber,
  "/manage-third-party-subscriptions": thirdPartySubscriber,
  "/manage-third-party-subscriber-oauth-config": thirdPartySubscriber,
  "/audit-log-details": (name) =>
    name === "id" ? record("manage-user-audit", "id") : name === "timestamp" ? auditTimestamp(records["manage-user-audit"]?.timestamp) : undefined
};

const targets = [];
const pending: { path: string; reason: string }[] = [];
const notSignedIn: { id: string; reason: string }[] = [];
for (const route of inventory.routes.filter((r) => (r.category === "public" || r.category === "signed-in") && !NOT_PAGES.has(r.path))) {
  const params = new URLSearchParams();
  let reason: string | null = null;
  for (const name of route.queryParams.filter((param) => !OPTIONAL_PARAMS.has(param) && !ROUTE_OPTIONAL_PARAMS[route.path]?.includes(param))) {
    const value = ROUTE_PARAM_VALUES[route.path]?.(name) ?? PARAM_VALUES[name];
    if (value === undefined) reason = `no value rule for query parameter "${name}"`;
    else if (typeof value === "object") reason = value.pending;
    else params.set(name, value);
    if (reason) break;
  }
  if (reason) {
    pending.push({ path: route.path, reason });
    continue;
  }

  const user = route.captureAs ? required(users.get(route.captureAs), route.captureAs) : undefined;
  const query = params.toString();
  const id = `page${route.path.replace(/\//g, "--")}`;
  const target = (as: ParityUser | undefined, targetId: string) => {
    const signedOut = {
      id: targetId,
      url: `${config.baseUrl}${route.path}${query ? `?${query}` : ""}`,
      locales: LOCALES,
      cookies: config.cookies,
      source: {
        app: "pip",
        kind: "page",
        route: route.path,
        guard: route.guard,
        viewAs: as?.id ?? null,
        controller: route.controller,
        seededAt: seed.seededAt,
        ...(seed.runToken ? { runToken: seed.runToken, environment: seed.environment } : {})
      }
    };
    if (!as) return [signedOut];
    const { targets: signedIn, unavailable } = signedInTargets(sessions, signedOut, as);
    if (unavailable) notSignedIn.push({ id: targetId, reason: unavailable });
    return signedIn;
  };
  targets.push(...target(user, id));
  // The same page as every other role its guard lets in; a public page signed in as a verified user
  const others =
    route.category === "public" ? [required(users.get(SIGNED_IN_VIEWER), SIGNED_IN_VIEWER)] : variantUsers(route.guard, route.captureAs, [...users.values()]);
  for (const other of others) targets.push(...target(other, variantId(id, other.id)));
}
targets.push({
  id: NOT_FOUND_ID,
  url: `${config.baseUrl}${NOT_FOUND_PATH}`,
  locales: LOCALES,
  cookies: config.cookies,
  source: {
    app: "pip",
    kind: "page",
    route: NOT_FOUND_PATH,
    expectedStatus: 404,
    viewAs: null,
    seededAt: seed.seededAt,
    ...(seed.runToken ? { runToken: seed.runToken, environment: seed.environment } : {})
  }
});

const output = path.join(PARITY_DIR, "output/targets/pip-pages.json");
await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(withMobile(targets), null, 2)}\n`);
await writeFile(path.join(PARITY_DIR, "output/targets/pip-pages-pending.json"), `${JSON.stringify(pending, null, 2)}\n`);
console.log(`wrote ${withMobile(targets).length} page targets → ${output}; ${pending.length} pending`);
for (const entry of pending) console.log(`  pending ${entry.path}: ${entry.reason}`);
for (const entry of notSignedIn) console.log(`  not captured ${entry.id}: ${entry.reason}`);

// The audit log viewer links to details with the row's London time as dd/MM/yyyy HH:mm:ss
function auditTimestamp(iso: string | undefined): string | { pending: string } {
  const match = iso?.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}:\d{2}:\d{2})/);
  return match ? `${match[3]}/${match[2]}/${match[1]} ${match[4]}` : { pending: 'records.json "manage-user-audit" was not seeded' };
}

function required<T>(value: T | undefined, what: string): T {
  if (value === undefined) throw new Error(`missing ${what}`);
  return value;
}

interface InventoryRoute {
  path: string;
  category: string;
  guard: string | null;
  captureAs: string | null;
  controller: string | null;
  queryParams: string[];
}
