import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { locationData } from "@hmcts/location/location-data";
import { loadManifest, loadUsers, type ParityUser, publicationMetadata, readPayload, type SeedResult } from "../fixtures/manifest.js";
import { seedRecords } from "./records.js";

// Seeds the local pip stack through pip's own ingestion: locations via the reference-data CSV
// upload, publications via data-management's POST /publication. Locations come from CaTH's
// location-data.ts so both apps share one source of reference data.
const DATA_MANAGEMENT_URL = process.env.PIP_DATA_MANAGEMENT_URL ?? "http://localhost:18090";
const ACCOUNT_MANAGEMENT_URL = process.env.PIP_ACCOUNT_MANAGEMENT_URL ?? "http://localhost:16969";
const OUTPUT = path.join(path.dirname(fileURLToPath(import.meta.url)), "../output/seed/pip.json");
// pip records who made each change; any UUID is accepted in dev mode
const REQUESTER_ID = "00000000-0000-4000-8000-000000000001";
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

const seededAt = new Date();
const manifest = await loadManifest();

await uploadLocations();
const users = await loadUsers();
await createUsers(users);
await createListSearchConfigs();
const result: SeedResult = { app: "pip", seededAt: seededAt.toISOString(), ingestion: "pip data-management POST /publication", publications: {}, rejected: {} };
for (const publication of manifest.publications) {
  const metadata = publicationMetadata(publication, manifest, seededAt);
  const headers = {
    "x-type": metadata.type,
    "x-provenance": metadata.provenance,
    "x-sensitivity": metadata.sensitivity,
    "x-language": metadata.language,
    "x-display-from": metadata.displayFrom,
    "x-display-to": metadata.displayTo,
    "x-list-type": publication.listType,
    "x-court-id": String(publication.locationId),
    "x-content-date": metadata.contentDate,
    "x-requester-id": REQUESTER_ID
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
  result.publications[publication.id] = { artefactId, locationId: publication.locationId, metadata };
  console.log(`published ${publication.id} → ${artefactId}`);
}

// Records reference seeded publications (e.g. a subscription to a list's location), so they come last
result.records = await seedRecords(users, result.publications);
console.log(`ensured ${Object.keys(result.records).length} account records`);

await mkdir(path.dirname(OUTPUT), { recursive: true });
await writeFile(OUTPUT, `${JSON.stringify(result, null, 2)}\n`);
console.log(`wrote ${OUTPUT}`);

function uploadJson(payload: Buffer, headers: Record<string, string>): Promise<Response> {
  return fetch(`${DATA_MANAGEMENT_URL}/publication`, { method: "POST", headers: { ...headers, "content-type": "application/json" }, body: payload });
}

// Non-strategic lists go through pip's spreadsheet upload, which converts them to JSON itself
function uploadExcel(payload: Buffer, headers: Record<string, string>): Promise<Response> {
  const form = new FormData();
  form.append("file", new Blob([payload], { type: EXCEL_TYPE }), "publication.xlsx");
  return fetch(`${DATA_MANAGEMENT_URL}/publication/non-strategic`, { method: "POST", headers, body: form });
}

// Users exist only in account-management's database, never in Azure B2C; pip-frontend reloads them
// from account-management on every request, so pip's own role and sensitivity rules apply
async function createUsers(users: ParityUser[]): Promise<void> {
  for (const user of users) {
    const existing = await fetch(`${ACCOUNT_MANAGEMENT_URL}/account/provenance/${user.provenance}/${user.provenanceUserId}`, {
      headers: { "x-requester-id": REQUESTER_ID }
    });
    if (existing.ok) continue;

    // pip only creates system admins through their own endpoint
    const response =
      user.role === "SYSTEM_ADMIN"
        ? await fetch(`${ACCOUNT_MANAGEMENT_URL}/account/system-admin`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ email: user.email, firstName: user.forenames, surname: user.surname, provenanceUserId: user.provenanceUserId })
          })
        : await fetch(`${ACCOUNT_MANAGEMENT_URL}/account/add/pi`, {
            method: "POST",
            headers: { "content-type": "application/json", "x-requester-id": REQUESTER_ID },
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
  console.log(`ensured ${users.length} users`);
}

// Search config has to exist before publications are uploaded: pip indexes cases at upload time
async function createListSearchConfigs(): Promise<void> {
  const { jsonListTypes } = JSON.parse(await readFile(path.join(path.dirname(fileURLToPath(import.meta.url)), "../fixtures/list-search-config.json"), "utf-8"));
  const systemAdmin = required(
    (await loadUsers()).find((user) => user.role === "SYSTEM_ADMIN"),
    "a SYSTEM_ADMIN user in users.json"
  );
  const lookup = await fetch(`${ACCOUNT_MANAGEMENT_URL}/account/provenance/${systemAdmin.provenance}/${systemAdmin.provenanceUserId}`, {
    headers: { "x-requester-id": REQUESTER_ID }
  });
  const { userId } = (await lookup.json()) as { userId: string };

  let created = 0;
  for (const publication of manifest.publications.filter((entry) => entry.format === "json")) {
    const response = await fetch(`${DATA_MANAGEMENT_URL}/publication/search/config`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-requester-id": userId },
      body: JSON.stringify({ listType: publication.listType, ...jsonListTypes })
    });
    if (response.ok) created++;
    // The config is unique per list type, so a conflict means an earlier seed already created it
    else if (response.status !== 409) throw new Error(`pip refused search config for ${publication.listType}: ${response.status} ${await response.text()}`);
  }
  console.log(`ensured list search config (${created} new)`);
}

// Flat files go through the same multipart upload pip's E2E suite uses, named by x-source-artefact-id
function uploadFlatFile(payload: Buffer, headers: Record<string, string>, payloadPath: string): Promise<Response> {
  const fileName = path.basename(payloadPath);
  const form = new FormData();
  form.append("file", new Blob([payload], { type: "application/pdf" }), fileName);
  return fetch(`${DATA_MANAGEMENT_URL}/publication`, { method: "POST", headers: { ...headers, "x-source-artefact-id": fileName }, body: form });
}

async function uploadLocations(): Promise<void> {
  const form = new FormData();
  form.append("locationList", new Blob([locationsCsv()], { type: "text/csv" }), "locations.csv");
  const response = await fetch(`${DATA_MANAGEMENT_URL}/locations/upload`, { method: "POST", headers: { "x-requester-id": REQUESTER_ID }, body: form });
  if (!response.ok) throw new Error(`pip rejected locations: ${response.status} ${await response.text()}`);
  console.log(`uploaded ${((await response.json()) as unknown[]).length} locations`);
}

// CaTH's jurisdiction maps to pip's Jurisdiction and CaTH's sub-jurisdiction to pip's Jurisdiction Type
function locationsCsv(): string {
  const regions = new Map(locationData.regions.map((region) => [region.regionId, region]));
  const jurisdictions = new Map(locationData.jurisdictions.map((jurisdiction) => [jurisdiction.jurisdictionId, jurisdiction]));
  const subJurisdictions = new Map(locationData.subJurisdictions.map((sub) => [sub.subJurisdictionId, sub]));

  const rows = locationData.locations.map((location) => {
    const locationRegions = location.regions.map((id) => required(regions.get(id), `region ${id}`));
    const locationSubs = location.subJurisdictions.map((id) => required(subJurisdictions.get(id), `sub-jurisdiction ${id}`));
    const locationJurisdictions = [...new Set(locationSubs.map((sub) => sub.jurisdictionId))].map((id) =>
      required(jurisdictions.get(id), `jurisdiction ${id}`)
    );
    return [
      String(location.locationId),
      location.name,
      location.welshName,
      join(locationRegions.map((region) => region.name)),
      join(locationRegions.map((region) => region.welshName)),
      join(locationJurisdictions.map((jurisdiction) => jurisdiction.name)),
      join(locationJurisdictions.map((jurisdiction) => jurisdiction.welshName)),
      join(locationSubs.map((sub) => sub.name)),
      join(locationSubs.map((sub) => sub.welshName)),
      "MANUAL_UPLOAD",
      String(location.locationId),
      "Venue",
      "",
      ""
    ];
  });

  return [CSV_HEADER, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}

function join(values: string[]): string {
  return values.join("; ");
}

function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function required<T>(value: T | undefined, what: string): T {
  if (value === undefined) throw new Error(`location-data.ts references a missing ${what}`);
  return value;
}
