import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadUsers, type ParityUser, type SeedResult } from "../fixtures/manifest.js";

// Builds capture targets for pip's non-list pages from the route inventory. Query parameters are
// filled from what the seeders created; a page whose data is not seeded yet is reported as pending
// with the reason, never captured with an invented value.
const PARITY_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const LOCALES = ["en", "cy"];
const ACCOUNT_MANAGEMENT_URL = process.env.PIP_ACCOUNT_MANAGEMENT_URL ?? "http://localhost:16969";
const REQUESTER_ID = "00000000-0000-4000-8000-000000000001";
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
const SIGN_IN = {
  PI_AAD: { key: "oid", flow: "AAD" },
  SSO: { key: "oid", flow: "SSO" },
  CFT_IDAM: { key: "uid", flow: "CFT" },
  CRIME_IDAM: { key: "uid", flow: "Crime" }
} as const;

const inventory = JSON.parse(await readFile(path.join(PARITY_DIR, "routes/pip-routes.json"), "utf-8")) as { routes: InventoryRoute[] };
const apps = JSON.parse(await readFile(path.join(PARITY_DIR, "apps.json"), "utf-8"));
const config = apps.pip;
const seed = JSON.parse(await readFile(path.join(PARITY_DIR, "output/seed/pip.json"), "utf-8")) as SeedResult;
const users = new Map((await loadUsers()).map((user) => [user.id, user]));
const reference = seed.publications[REFERENCE_PUBLICATION];
const listTypeName = REFERENCE_PUBLICATION.toUpperCase().replace(/-/g, "_");
const pipUserId = await lookUpPipUserId(required(users.get("verified-media"), "verified-media"));

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
  targets.push({
    id: `page${route.path.replace(/\//g, "--")}`,
    url: `${config.baseUrl}${route.path}${query ? `?${query}` : ""}`,
    locales: LOCALES,
    cookies: config.cookies,
    ...(user ? { setup: [signInUrl(user)] } : {}),
    source: { app: "pip", kind: "page", route: route.path, guard: route.guard, viewAs: user?.id ?? null, controller: route.controller, seededAt: seed.seededAt }
  });
}

const output = path.join(PARITY_DIR, "output/targets/pip-pages.json");
await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(targets, null, 2)}\n`);
await writeFile(path.join(PARITY_DIR, "output/targets/pip-pages-pending.json"), `${JSON.stringify(pending, null, 2)}\n`);
console.log(`wrote ${targets.length} page targets → ${output}; ${pending.length} pending`);
for (const entry of pending) console.log(`  pending ${entry.path}: ${entry.reason}`);

// The audit log viewer links to details with the row's London time as dd/MM/yyyy HH:mm:ss
function auditTimestamp(iso: string | undefined): string | { pending: string } {
  const match = iso?.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}:\d{2}:\d{2})/);
  return match ? `${match[3]}/${match[2]}/${match[1]} ${match[4]}` : { pending: 'records.json "manage-user-audit" was not seeded' };
}

function signInUrl(user: ParityUser): string {
  const { key, flow } = SIGN_IN[user.provenance];
  return `${config.baseUrl}${(config.signIn as string).replace("{key}", key).replace("{provenanceUserId}", user.provenanceUserId).replace("{flow}", flow)}`;
}

async function lookUpPipUserId(user: ParityUser): Promise<string> {
  const response = await fetch(`${ACCOUNT_MANAGEMENT_URL}/account/provenance/${user.provenance}/${user.provenanceUserId}`, {
    headers: { "x-requester-id": REQUESTER_ID }
  });
  if (!response.ok) throw new Error(`pip has no user ${user.id}; run tools/ui-baseline/pip/seed.ts first`);
  return ((await response.json()) as { userId: string }).userId;
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
