import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { locationData } from "@hmcts/location/location-data";
import { loadEnvironment } from "../environments.js";
import { loadManifest, loadUsers, type ParityUser, publicationMetadata, readPayload, type SeedResult } from "../fixtures/manifest.js";
import type { PipSignIns } from "./account-sign-in.js";
import { type PipApi, pipApi } from "./pip-api.js";
import { type PipUser, seedRecords } from "./records.js";
import { type PipRun, runEmail, runLocationId, runName, startRun } from "./run.js";

// Seeds pip through pip's own ingestion: locations via the reference-data CSV upload, publications
// via data-management's POST /publication. Locations come from CaTH's location-data.ts so both apps
// share one source of reference data.
//
// --env local (the default) seeds the local pip stack, which starts empty, and creates the fixture
// users, who sign in through /parity-login. Any other environment is a deployed pip that other
// people use too (pip test): the seed is a run of its own (pip/run.ts), with the fixtures'
// locations under names and ids of its own, a system admin of its own to make requests as, and
// records owned by the test accounts pip/sign-in.ts signed in, since only those can sign in. Run
// pip/sign-in.ts first, and pip/cleanup.ts after.
const OUTPUT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "../output/seed");
const EXCEL_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const CSV_HEADER = [
  "P&I ID",
  "Court Desc",
  "Welsh Court Desc",
  "Region",
  "Welsh Region",
  "Jurisdiction",
  "Welsh Jurisdiction",
  "Jurisdiction Type",
  "Welsh Jurisdiction Type",
  "Provenance",
  "Provenance Location ID",
  "Provenance Location Type",
  "Email",
  "Contact No"
];

const { values: args } = parseArgs({ options: { env: { type: "string", default: "local" } }, strict: false, args: process.argv.slice(2) });
const environment = await loadEnvironment(String(args.env));
const local = await pipApi(environment);
const run = local.deployed ? await startRun(environment.name) : null;
const signIns = run ? await readSignIns() : null;
const api = run ? local.asRequester(await createRunAdmin(local, run)) : local;

const seededAt = new Date();
const manifest = await loadManifest();
const users = await loadUsers();
const locations = new Map(manifest.publications.map((publication) => [publication.locationId, runLocationId(run, publication.locationId)]));

await uploadLocations();
if (!run) await createUsers(users);
await createListSearchConfigs();
const result: SeedResult = {
  app: "pip",
  seededAt: seededAt.toISOString(),
  ingestion: "pip data-management POST /publication",
  ...(run ? { runToken: run.token, environment: environment.name, locations: Object.fromEntries(locations) } : {}),
  publications: {},
  rejected: {}
};
for (const publication of manifest.publications) {
  const metadata = publicationMetadata(publication, manifest, seededAt);
  const locationId = required(locations.get(publication.locationId), `the location of ${publication.id}`);
  const headers = {
    "x-type": metadata.type,
    "x-provenance": metadata.provenance,
    "x-sensitivity": metadata.sensitivity,
    "x-language": metadata.language,
    "x-display-from": metadata.displayFrom,
    "x-display-to": metadata.displayTo,
    "x-list-type": publication.listType,
    "x-court-id": String(locationId),
    "x-content-date": metadata.contentDate
  };
  const payload = await readPayload(publication);
  const response =
    publication.format === "excel"
      ? await uploadExcel(payload, headers)
      : publication.format === "flat-file"
        ? await uploadFlatFile(payload, headers, publication.payload)
        : await uploadJson(payload, headers);
  if (!response.ok) {
    result.rejected[publication.id] = `${response.status} ${(await response.text()).slice(0, 500)}`;
    console.log(`REJECTED ${publication.id}: ${response.status}`);
    continue;
  }
  const { artefactId } = (await response.json()) as { artefactId: string };
  result.publications[publication.id] = { artefactId, locationId, metadata };
  console.log(`published ${publication.id} → ${artefactId}`);
}

// Records reference seeded publications (e.g. a subscription to a list's location), so they come last
const owners = signIns ? await signedInOwners(signIns) : undefined;
result.records = await seedRecords(api, users, result.publications, { run, owners });
// pip's own user ids appear in page URLs (e.g. /manage-user?id=), so a check can map them to CaTH's
result.users = owners ? Object.fromEntries(Object.entries(owners).map(([id, owner]) => [id, owner.userId])) : await pipUserIds(users);
console.log(`ensured ${Object.keys(result.records).length} account records`);

const output = path.join(OUTPUT_DIR, "pip.json");
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(output, `${JSON.stringify(result, null, 2)}\n`);
console.log(`wrote ${output}`);

async function readSignIns(): Promise<PipSignIns> {
  const file = path.join(OUTPUT_DIR, `pip-sign-in-${environment.name}.json`);
  if (!existsSync(file)) throw new Error(`no ${path.basename(file)}: sign in to pip first (tsx apps/ui-baseline/pip/sign-in.ts --env ${environment.name})`);
  return JSON.parse(await readFile(file, "utf-8")) as PipSignIns;
}

// A system admin of the run's own: pip only takes most writes, and account lookups, from one
async function createRunAdmin(api: PipApi, pipRun: PipRun): Promise<string> {
  const admin = (await api.json("account", "/account/system-admin", {
    method: "POST",
    requester: false,
    body: { email: runEmail(pipRun, "system-admin@example.com"), firstName: "Parity", surname: "Recorder", provenanceUserId: crypto.randomUUID() }
  })) as { userId?: string };
  if (!admin.userId) throw new Error("pip created the run's system admin but did not say its id");
  console.log(`made requests as the run's system admin, ${runEmail(pipRun, "system-admin@example.com")}`);
  return admin.userId;
}

function uploadJson(payload: Buffer, headers: Record<string, string>): Promise<Response> {
  return api.request("data", "/publication", { method: "POST", headers: { ...headers, "content-type": "application/json" }, body: new Uint8Array(payload) });
}

// Non-strategic lists go through pip's spreadsheet upload, which converts them to JSON itself
function uploadExcel(payload: Buffer, headers: Record<string, string>): Promise<Response> {
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(payload)], { type: EXCEL_TYPE }), "publication.xlsx");
  return api.request("data", "/publication/non-strategic", { method: "POST", headers, body: form });
}

// Flat files go through the same multipart upload pip's E2E suite uses, named by x-source-artefact-id
function uploadFlatFile(payload: Buffer, headers: Record<string, string>, payloadPath: string): Promise<Response> {
  const fileName = path.basename(payloadPath);
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(payload)], { type: "application/pdf" }), fileName);
  return api.request("data", "/publication", { method: "POST", headers: { ...headers, "x-source-artefact-id": fileName }, body: form });
}

// Users exist only in account-management's database, never in Azure B2C; pip-frontend reloads them
// from account-management on every request, so pip's own role and sensitivity rules apply
async function createUsers(fixtureUsers: ParityUser[]): Promise<void> {
  for (const user of fixtureUsers) {
    const existing = await api.request("account", `/account/provenance/${user.provenance}/${user.provenanceUserId}`);
    if (existing.ok) continue;

    // pip only creates system admins through their own endpoint
    const response =
      user.role === "SYSTEM_ADMIN"
        ? await api.request("account", "/account/system-admin", {
            method: "POST",
            requester: false,
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ email: user.email, firstName: user.forenames, surname: user.surname, provenanceUserId: user.provenanceUserId })
          })
        : await api.request("account", "/account/add/pi", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify([
              {
                email: user.email,
                provenanceUserId: user.provenanceUserId,
                userProvenance: user.provenance,
                roles: user.role,
                forenames: user.forenames,
                surname: user.surname
              }
            ])
          });
    const body = await response.text();
    if (!response.ok || body.includes('"ERRORED_ACCOUNTS":[{')) throw new Error(`pip refused user ${user.id}: ${response.status} ${body.slice(0, 300)}`);
  }
  console.log(`ensured ${fixtureUsers.length} users`);
}

async function pipUserIds(fixtureUsers: ParityUser[]): Promise<Record<string, string>> {
  const ids: Record<string, string> = {};
  for (const user of fixtureUsers) {
    const response = await api.request("account", `/account/provenance/${user.provenance}/${user.provenanceUserId}`);
    if (!response.ok) throw new Error(`pip has no user ${user.id} after creating it: ${response.status}`);
    ids[user.id] = ((await response.json()) as { userId: string }).userId;
  }
  return ids;
}

// The pip user behind each signed-in fixture user: the test account it signed in as, looked up by
// email among accounts of the fixture user's provenance
async function signedInOwners(pipSignIns: PipSignIns): Promise<Record<string, PipUser>> {
  const owners: Record<string, PipUser> = {};
  for (const [fixtureId, signedIn] of Object.entries(pipSignIns.users)) {
    const user = required(
      users.find((candidate) => candidate.id === fixtureId),
      `fixture user ${fixtureId}`
    );
    const page = (await api.json("account", `/account/all?${new URLSearchParams({ email: signedIn.email, pageSize: "25" })}`)) as { content: PipUser[] };
    const match = page.content.find((account) => account.email.toLowerCase() === signedIn.email.toLowerCase() && account.userProvenance === user.provenance);
    if (!match) throw new Error(`pip has no ${user.provenance} account for the ${signedIn.account} test account after it signed in`);
    owners[fixtureId] = match;
  }
  return owners;
}

// Search config has to exist before publications are uploaded: pip indexes cases at upload time
async function createListSearchConfigs(): Promise<void> {
  const { jsonListTypes } = JSON.parse(await readFile(path.join(path.dirname(fileURLToPath(import.meta.url)), "../fixtures/list-search-config.json"), "utf-8"));
  // pip takes search config only from a system admin: the run's own, or the local fixture one
  const requester = run ? api : api.asRequester(await localSystemAdminId());

  let created = 0;
  for (const publication of manifest.publications.filter((entry) => entry.format === "json")) {
    const response = await requester.request("data", "/publication/search/config", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ listType: publication.listType, ...jsonListTypes })
    });
    if (response.ok) created++;
    // The config is unique per list type, so a conflict means an earlier seed (or, in a shared
    // environment, pip's own) already has it
    else if (response.status !== 409) throw new Error(`pip refused search config for ${publication.listType}: ${response.status} ${await response.text()}`);
  }
  console.log(`ensured list search config (${created} new)`);
}

async function localSystemAdminId(): Promise<string> {
  const systemAdmin = required(
    users.find((user) => user.role === "SYSTEM_ADMIN"),
    "users.json has no SYSTEM_ADMIN user"
  );
  const lookup = await api.request("account", `/account/provenance/${systemAdmin.provenance}/${systemAdmin.provenanceUserId}`);
  return ((await lookup.json()) as { userId: string }).userId;
}

// Locally, every CaTH location, at its own id; in a shared environment, only the fixtures'
// locations, at the run's ids and under the run's names
async function uploadLocations(): Promise<void> {
  const form = new FormData();
  const csv = locationsCsv();
  form.append("locationList", new Blob([csv.text], { type: "text/csv" }), "locations.csv");
  const response = await api.request("data", "/locations/upload", { method: "POST", body: form });
  if (!response.ok) throw new Error(`pip rejected locations: ${response.status} ${await response.text()}`);
  // What was sent, not what pip echoes back, which is not logged unchecked
  console.log(`uploaded ${csv.count} locations${run ? ` at ids from ${run.locationIdBase}, named "${run.token} …"` : ""}`);
}

// CaTH's jurisdiction maps to pip's Jurisdiction and CaTH's sub-jurisdiction to pip's Jurisdiction Type
function locationsCsv(): { text: string; count: number } {
  const regions = new Map(locationData.regions.map((region) => [region.regionId, region]));
  const jurisdictions = new Map(locationData.jurisdictions.map((jurisdiction) => [jurisdiction.jurisdictionId, jurisdiction]));
  const subJurisdictions = new Map(locationData.subJurisdictions.map((sub) => [sub.subJurisdictionId, sub]));
  const uploaded = run ? locationData.locations.filter((location) => locations.has(location.locationId)) : locationData.locations;

  const rows = uploaded.map((location) => {
    const locationRegions = location.regions.map((id) => required(regions.get(id), `location-data.ts references a missing region ${id}`));
    const locationSubs = location.subJurisdictions.map((id) =>
      required(subJurisdictions.get(id), `location-data.ts references a missing sub-jurisdiction ${id}`)
    );
    const locationJurisdictions = [...new Set(locationSubs.map((sub) => sub.jurisdictionId))].map((id) =>
      required(jurisdictions.get(id), `location-data.ts references a missing jurisdiction ${id}`)
    );
    const id = String(runLocationId(run, location.locationId));
    return [
      id,
      runName(run, location.name),
      runName(run, location.welshName),
      join(locationRegions.map((region) => region.name)),
      join(locationRegions.map((region) => region.welshName)),
      join(locationJurisdictions.map((jurisdiction) => jurisdiction.name)),
      join(locationJurisdictions.map((jurisdiction) => jurisdiction.welshName)),
      join(locationSubs.map((sub) => sub.name)),
      join(locationSubs.map((sub) => sub.welshName)),
      "MANUAL_UPLOAD",
      id,
      "Venue",
      "",
      ""
    ];
  });

  return { text: [CSV_HEADER, ...rows].map((row) => row.map(csvCell).join(",")).join("\n"), count: rows.length };
}

function join(values: string[]): string {
  return values.join("; ");
}

function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function required<T>(value: T | undefined, message: string): T {
  if (value === undefined) throw new Error(message);
  return value;
}
