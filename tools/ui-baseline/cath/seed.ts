import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { uploadBlob } from "@hmcts/azure-blob";
import { convertExcelForListTypeName, validateListTypeJson } from "@hmcts/list-types-common";
import { loadManifest, publicationMetadata, readPayload, type SeedResult } from "../fixtures/manifest.js";

// Seeds a local CaTH with the same publications and metadata as tools/ui-baseline/pip/seed.ts. Locations
// already come from location-data.ts via `yarn db:seed`. The artefact row is created through
// test-support because the publication API needs Azure client credentials local dev lacks;
// the API process must run with TZ=Europe/London so the metadata's London wall-clock times
// are read the same way pip reads them.
const API_URL = process.env.CATH_SERVICE_API_URL ?? "http://localhost:3001";
// PARITY_SEED_OUTPUT lets a focused check keep its own record, so it only ever removes its own artefacts
const OUTPUT = process.env.PARITY_SEED_OUTPUT ?? path.join(path.dirname(fileURLToPath(import.meta.url)), "../output/seed/cath.json");

await loadListTypeConverters();

// --only id,id seeds just those publications, for a focused check
const onlyArg = process.argv.find((arg) => arg.startsWith("--only="))?.slice("--only=".length);
const only = onlyArg ? new Set(onlyArg.split(",").filter(Boolean)) : null;

const seededAt = new Date();
const loaded = await loadManifest();
const manifest = { ...loaded, publications: loaded.publications.filter((publication) => !only || only.has(publication.id)) };
const listTypes = (await api("GET", "/test-support/list-types")) as ListTypeRow[];

// With API client credentials (CI against a preview) publications go through the real
// publication API, which stores the blob itself; without them (local dev) the artefact row is
// made through test-support and the blob written directly
const token = process.env.CATH_SERVICE_API_CLIENT_ID ? await apiToken() : null;

await removePreviousSeed();
const result: SeedResult = {
  app: "cath",
  seededAt: seededAt.toISOString(),
  ingestion: token ? "publication API POST /publication" : "test-support POST /test-support/artefacts + blob upload",
  publications: {},
  rejected: {}
};
for (const publication of manifest.publications) {
  if (!publication.paths.cath) continue;
  try {
    const listType = listTypes.find((row) => row.name === publication.cathListType);
    if (!listType) throw new Error(`CaTH has no list type ${publication.cathListType}`);

    const raw = await readPayload(publication);
    // Non-strategic lists go through CaTH's own Excel converter, as the upload page does
    const json = publication.format === "excel" ? await convertExcelForListTypeName(listType.name, raw) : JSON.parse(raw.toString("utf-8"));
    const payload = Buffer.from(JSON.stringify(json));
    // Mirrors CaTH's upload pages: JSON uploads are schema-validated, converted Excel is stored as converted
    if (publication.format === "json") {
      const validation = await validateListTypeJson(String(listType.id), json, listTypes);
      if (!validation.isValid) throw new Error(`schema rejected: ${JSON.stringify(validation.errors).slice(0, 500)}`);
    }

    const metadata = publicationMetadata(publication, manifest, seededAt);
    const artefact = token
      ? await publish(token, publication.locationId, listType.name, metadata, payload)
      : ((await api("POST", "/test-support/artefacts", { locationId: String(publication.locationId), listTypeId: listType.id, ...metadata })) as {
          artefactId: string;
        });
    if (!token) await uploadBlob(artefact.artefactId, payload, "application/json");

    result.publications[publication.id] = { artefactId: artefact.artefactId, locationId: publication.locationId, metadata };
    console.log(`published ${publication.id} → ${artefact.artefactId}`);
  } catch (error) {
    result.rejected[publication.id] = (error as Error).message;
    console.log(`REJECTED ${publication.id}: ${(error as Error).message.slice(0, 120)}`);
  }
}

await mkdir(path.dirname(OUTPUT), { recursive: true });
await writeFile(OUTPUT, `${JSON.stringify(result, null, 2)}\n`);
console.log(`wrote ${OUTPUT}`);

async function apiToken(): Promise<string> {
  const { AZURE_TENANT_ID: tenantId, CATH_SERVICE_API_CLIENT_ID: clientId, CATH_SERVICE_API_CLIENT_SECRET: clientSecret } = process.env;
  if (!tenantId || !clientSecret) throw new Error("CATH_SERVICE_API_CLIENT_ID is set, so AZURE_TENANT_ID and CATH_SERVICE_API_CLIENT_SECRET are needed too");
  const response = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId as string, client_secret: clientSecret, scope: `${clientId}/.default`, grant_type: "client_credentials" })
  });
  if (!response.ok) throw new Error(`token request failed: ${response.status}`);
  return ((await response.json()) as { access_token: string }).access_token;
}

async function publish(
  token: string,
  locationId: number,
  listTypeName: string,
  metadata: ReturnType<typeof publicationMetadata>,
  payload: Buffer
): Promise<{ artefactId: string }> {
  const response = await fetch(`${API_URL}/publication`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "x-provenance": metadata.provenance,
      "x-court-id": String(locationId),
      "x-type": metadata.type,
      "x-list-type": listTypeName,
      "x-content-date": metadata.contentDate,
      "x-language": metadata.language,
      "x-sensitivity": metadata.sensitivity,
      "x-display-from": metadata.displayFrom,
      "x-display-to": metadata.displayTo
    },
    body: payload
  });
  if (!response.ok) throw new Error(`publication API ${response.status}: ${(await response.text()).slice(0, 300)}`);
  return (await response.json()) as { artefactId: string };
}

// Each list-type package registers its Excel converter when its index loads, as in the web app
async function loadListTypeConverters(): Promise<void> {
  const listTypesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../../libs/list-types");
  for (const entry of await readdir(listTypesDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const { name } = JSON.parse(await readFile(path.join(listTypesDir, entry.name, "package.json"), "utf-8")) as { name: string };
    await import(name);
  }
}

async function removePreviousSeed(): Promise<void> {
  const previous = await readFile(OUTPUT, "utf-8").then(
    (text) => JSON.parse(text) as SeedResult,
    () => null
  );
  if (!previous) return;
  const artefactIds = Object.values(previous.publications).map((publication) => publication.artefactId);
  if (artefactIds.length) await api("DELETE", "/test-support/artefacts", { artefactIds });
  await rm(OUTPUT, { force: true });
  console.log(`removed ${artefactIds.length} artefacts from the previous seed`);
}

async function api(method: string, endpoint: string, body?: unknown): Promise<unknown> {
  const response = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!response.ok) throw new Error(`${method} ${endpoint} failed: ${response.status} ${await response.text()}`);
  return response.status === 204 ? null : response.json();
}

interface ListTypeRow {
  id: number;
  name: string;
  friendlyName: string | null;
}
