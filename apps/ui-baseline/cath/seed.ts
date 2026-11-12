import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { convertExcelForListTypeName, validateListTypeJson } from "@hmcts/list-types-common";
import { type Environment, loadEnvironment } from "../environments.js";
import { loadManifest, type PublicationFixture, publicationMetadata, readPayload, type SeedResult } from "../fixtures/manifest.js";
import { cathApi, createRunLocations, newRunToken, removeRuns } from "./run.js";

// Seeds CaTH with the same publications and metadata as apps/ui-baseline/pip/seed.ts.
// A deployed CaTH (--env aat) is shared, so, as CaTH's own E2E tests do, each run publishes through
// the real publication API (with the environment's client credentials) to courts of its own:
// copies of the fixture courts under the run's token (run.ts). Nobody else subscribes to them, so no
// one else is notified, and no one else's lists show on their pages. The check removes them when it
// ends (check.ts), and the next run removes any a run left behind. A local CaTH is seeded at the
// fixture courts themselves (location-data.ts): through the publication API when the root .env has
// a client for it, otherwise with the artefact
// row created through test-support, the payload written to blob storage, and the publication
// processed as the upload pages process it, which is what writes its PDF and Excel files. The API
// process must run with TZ=Europe/London so the metadata's London wall-clock times are read the
// same way pip reads them.
const { values: args } = parseArgs({ options: { env: { type: "string" }, only: { type: "string" } } });
const environment = await loadEnvironment(args.env);
const API_URL = process.env.CATH_SERVICE_API_URL ?? environment.cath.apiUrl;
// PARITY_SEED_OUTPUT lets a focused check keep its own record, so it only ever removes its own artefacts
const OUTPUT = process.env.PARITY_SEED_OUTPUT ?? path.join(path.dirname(fileURLToPath(import.meta.url)), `../output/seed/cath-${environment.name}.json`);

await loadListTypeConverters();

// --only id,id seeds just those publications, for a focused check
const only = args.only ? new Set(args.only.split(",").filter(Boolean)) : null;

const seededAt = new Date();
const loaded = await loadManifest();
const manifest = { ...loaded, publications: loaded.publications.filter((publication) => !only || only.has(publication.id)) };
const api = cathApi(API_URL);
const listTypes = (await api("GET", "/test-support/list-types")) as ListTypeRow[];

const deployed = environment.cath.signIn !== "session";
const token = await apiToken(environment);
if (!token && deployed) throw new Error(`no publication API credentials for ${environment.name}: a deployed CaTH is seeded through its publication API`);
const local = token ? null : await localPublishing();

await removePreviousSeed();
// Runs that ended without removing what they seeded (the pod restarted, say), however old the file
// that recorded them; never one recent enough to still be going. One that cannot be removed now is
// left for a later run: it must not stop this one.
if (deployed) await removeRuns(api, { staleAt: Date.now() }).catch((error: Error) => console.log(`left for a later run: ${error.message.split("\n")[0]}`));
// A flat file has no page of its own: CaTH lists it on the court's summary of publications
const seedable = manifest.publications.filter((publication) => publication.paths.cath || (publication.format === "flat-file" && publication.cathListType));
const run = deployed ? newRunToken() : null;
// Until the record of the run is written, nothing else knows its token, so a run that fails partway
// (a court that could not be created, say) removes what it seeded as this script ends
let isRecorded = false;
await using _removesUnrecordedRun = {
  [Symbol.asyncDispose]: async () => {
    if (run && !isRecorded) await removeRuns(api, { token: run }).catch((error: Error) => console.log(`could not remove run ${run}: ${error.message}`));
  }
};
const locations = run
  ? await createRunLocations(
      api,
      run,
      seedable.map((publication) => publication.locationId)
    )
  : null;
const locationOf = (publication: PublicationFixture) => locations?.[String(publication.locationId)] ?? publication.locationId;
const result: SeedResult = {
  app: "cath",
  seededAt: seededAt.toISOString(),
  ingestion: token
    ? `publication API POST /publication${run ? ", on courts of the run's own" : ""}`
    : "test-support POST /test-support/artefacts + blob upload + processPublication",
  ...(run && locations ? { environment: environment.name, runToken: run, locations } : {}),
  publications: {},
  rejected: {}
};
for (const publication of seedable) {
  const locationId = locationOf(publication);
  try {
    const listType = listTypes.find((row) => row.name === publication.cathListType);
    if (!listType) throw new Error(`CaTH has no list type ${publication.cathListType}`);

    const raw = await readPayload(publication);
    if (publication.format === "flat-file") {
      const metadata = publicationMetadata(publication, manifest, seededAt);
      const artefactId = await seedFlatFile(listType, locationId, metadata, raw, path.basename(publication.payload));
      result.publications[publication.id] = { artefactId, locationId, metadata };
      console.log(`published ${publication.id} → ${artefactId}`);
      continue;
    }
    // Non-strategic lists go through CaTH's own Excel converter, as the upload page does
    const json = publication.format === "excel" ? await convertExcelForListTypeName(listType.name, raw) : JSON.parse(raw.toString("utf-8"));
    const payload = Buffer.from(JSON.stringify(json));
    // Mirrors CaTH's upload pages: JSON uploads are schema-validated, converted Excel is stored as converted
    if (publication.format === "json") {
      const validation = await validateListTypeJson(String(listType.id), json, listTypes);
      if (!validation.isValid) throw new Error(`schema rejected: ${JSON.stringify(validation.errors).slice(0, 500)}`);
    }

    const metadata = publicationMetadata(publication, manifest, seededAt);
    const artefactId = local
      ? await local.publish(listType, locationId, metadata, json, payload, publication.format === "excel" ? raw : undefined)
      : (await publish(token as string, locationId, listType.name, metadata, payload)).artefactId;

    // The publication API takes JSON only, so a list whose Excel file is the uploaded spreadsheet reformatted has none
    result.publications[publication.id] = {
      artefactId,
      locationId,
      metadata,
      ...(!local && publication.format === "excel" ? { excelUploaded: false } : {})
    };
    console.log(`published ${publication.id} → ${artefactId}`);
  } catch (error) {
    result.rejected[publication.id] = (error as Error).message;
    console.log(`REJECTED ${publication.id}: ${(error as Error).message.slice(0, 120)}`);
  }
}
await local?.close();

await mkdir(path.dirname(OUTPUT), { recursive: true });
await writeFile(OUTPUT, `${JSON.stringify(result, null, 2)}\n`);
isRecorded = true;
console.log(`wrote ${OUTPUT}`);

// The environment's publication API client, or for a local CaTH one given in the root .env
// (CATH_SERVICE_API_CLIENT_ID with AZURE_TENANT_ID and CATH_SERVICE_API_CLIENT_SECRET)
async function apiToken(env: Environment): Promise<string | null> {
  const names = env.cath.publicationApi;
  const clientId = names ? await env.secret(env.cath, names.clientId) : (process.env.CATH_SERVICE_API_CLIENT_ID ?? null);
  if (!clientId) return null;
  const tenantId = names ? await env.secret(env.cath, names.tenantId) : process.env.AZURE_TENANT_ID;
  const clientSecret = names ? await env.secret(env.cath, names.clientSecret) : process.env.CATH_SERVICE_API_CLIENT_SECRET;
  if (!tenantId || !clientSecret) throw new Error("a publication API client id is set, so its tenant id and secret are needed too");
  const response = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, scope: `${clientId}/.default`, grant_type: "client_credentials" })
  });
  if (!response.ok) throw new Error(`token request failed: ${response.status}`);
  return ((await response.json()) as { access_token: string }).access_token;
}

// A local CaTH's ingestion, run in this process with the root .env: the artefact row through
// test-support, the payload to blob storage, then the same processing the upload pages start
// (search data, PDF, Excel), without notifications or the third-party push
async function localPublishing() {
  const { uploadBlob } = await import("@hmcts/azure-blob");
  const { processPublication } = await import("@hmcts/publication");
  const { prisma } = await import("@hmcts/postgres-prisma");
  return {
    async publish(
      listType: ListTypeRow,
      locationId: number,
      metadata: ReturnType<typeof publicationMetadata>,
      json: unknown,
      payload: Buffer,
      uploadedExcel?: Buffer
    ): Promise<string> {
      const { artefactId } = (await api("POST", "/test-support/artefacts", { locationId: String(locationId), listTypeId: listType.id, ...metadata })) as {
        artefactId: string;
      };
      await uploadBlob(artefactId, payload, "application/json");
      await processPublication({
        artefactId,
        locationId: String(locationId),
        listTypeId: listType.id,
        contentDate: new Date(metadata.contentDate),
        locale: metadata.language === "WELSH" ? "cy" : "en",
        jsonData: json,
        payloadSizeBytes: payload.length,
        provenance: metadata.provenance,
        sensitivity: metadata.sensitivity,
        language: metadata.language,
        displayFrom: new Date(metadata.displayFrom),
        displayTo: new Date(metadata.displayTo),
        uploadedExcel,
        skipNotifications: true,
        skipThirdPartyPush: true,
        logPrefix: "[ui-baseline seed]"
      });
      return artefactId;
    },
    close: () => prisma.$disconnect()
  };
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
    body: new Uint8Array(payload)
  });
  if (!response.ok) throw new Error(`publication API ${response.status}: ${(await response.text()).slice(0, 300)}`);
  return (await response.json()) as { artefactId: string };
}

// A flat file through test-support, in every environment: the publication API takes JSON only.
// The artefact row is marked as a flat file and the document stored as CaTH's upload stores it.
async function seedFlatFile(
  listType: ListTypeRow,
  locationId: number,
  metadata: ReturnType<typeof publicationMetadata>,
  file: Buffer,
  fileName: string
): Promise<string> {
  const { artefactId } = (await api("POST", "/test-support/artefacts", {
    locationId: String(locationId),
    listTypeId: listType.id,
    isFlatFile: true,
    ...metadata
  })) as {
    artefactId: string;
  };
  await api("POST", "/test-support/flat-files", {
    artefactId,
    content: file.toString("base64"),
    extension: path.extname(fileName),
    sourceArtefactId: fileName
  });
  return artefactId;
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
  // A run on courts of its own goes with its courts. One that cannot be removed now still has them,
  // so the stale sweep below removes it once it is old enough: it must not stop this run, or every
  // run after it.
  if (previous.runToken) {
    await removeRuns(api, { token: previous.runToken }).catch((error: Error) => console.log(`left for a later run: ${error.message.split("\n")[0]}`));
  } else {
    const artefactIds = Object.values(previous.publications).map((publication) => publication.artefactId);
    if (artefactIds.length) await api("DELETE", "/test-support/artefacts", { artefactIds });
    console.log(`removed ${artefactIds.length} artefacts from the previous seed`);
  }
  await rm(OUTPUT, { force: true });
}

interface ListTypeRow {
  id: number;
  name: string;
  friendlyName: string | null;
}
