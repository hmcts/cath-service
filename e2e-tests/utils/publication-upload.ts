/**
 * Publishes through the real ingestion endpoint (POST /publication) so validation, search extraction,
 * file generation and subscription notifications all run, exactly as for a real publisher.
 * Always publish to a court the test created; the run prefix on that court lets global-teardown remove the artefact.
 */

import { getApiAuthToken } from "./api-auth-helpers.js";
import { API_BASE_URL, uploadTestFlatFileToWeb } from "./test-support-api.js";

const PUBLICATION_ENDPOINT = `${API_BASE_URL}/publication`;
const IS_DEPLOYED = !!process.env.CATH_SERVICE_WEB_URL;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_DISPLAY_DAYS = 30;

export async function uploadTestPublication(options: UploadTestPublicationOptions): Promise<UploadedPublication> {
  if (!options.payload && !options.file) {
    throw new Error("uploadTestPublication needs a JSON payload or a flat file");
  }

  const token = await getApiAuthToken();
  const headers: Record<string, string> = { ...publicationHeaders(options), Authorization: `Bearer ${token}` };
  let body: string | FormData;

  if (options.file) {
    body = new FormData();
    body.append("file", new Blob([new Uint8Array(options.file.buffer)], { type: options.file.mimeType }), options.file.name);
  } else {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.payload);
  }

  const response = await fetch(PUBLICATION_ENDPOINT, { method: "POST", headers, body });
  const responseText = await response.text();

  if (response.status !== 201) {
    throw new Error(`POST /publication (${options.listTypeName} at location ${options.locationId}) returned ${response.status}: ${responseText}`);
  }

  const publication = JSON.parse(responseText) as UploadedPublication;
  if (!publication.artefactId) {
    throw new Error(`POST /publication (${options.listTypeName}) returned no artefactId: ${responseText}`);
  }

  // Deployed API and web pods have separate filesystems, so the page that renders the list needs its own copy of the JSON
  if (options.mirrorJsonToWeb && IS_DEPLOYED && options.payload) {
    await uploadTestFlatFileToWeb({ artefactId: publication.artefactId, content: Buffer.from(JSON.stringify(options.payload)), extension: ".json" });
  }

  return publication;
}

function publicationHeaders(options: UploadTestPublicationOptions): Record<string, string> {
  const now = Date.now();

  return {
    "x-provenance": options.provenance ?? "MANUAL_UPLOAD",
    "x-court-id": String(options.locationId),
    "x-content-date": options.contentDate ?? new Date(now).toISOString().split("T")[0],
    "x-list-type": options.listTypeName,
    "x-language": options.language ?? "ENGLISH",
    "x-type": "LIST",
    "x-sensitivity": options.sensitivity ?? "PUBLIC",
    "x-display-from": options.displayFrom ?? new Date(now - ONE_DAY_MS).toISOString(),
    "x-display-to": options.displayTo ?? new Date(now + DEFAULT_DISPLAY_DAYS * ONE_DAY_MS).toISOString()
  };
}

export interface UploadTestPublicationOptions {
  locationId: number;
  listTypeName: string;
  payload?: unknown;
  file?: { name: string; mimeType: string; buffer: Buffer };
  sensitivity?: "PUBLIC" | "PRIVATE" | "CLASSIFIED";
  language?: "ENGLISH" | "WELSH" | "BI_LINGUAL";
  provenance?: string;
  contentDate?: string;
  displayFrom?: string;
  displayTo?: string;
  mirrorJsonToWeb?: boolean;
}

export interface UploadedPublication {
  artefactId: string;
  locationId: string;
  listType: string;
  sensitivity: string;
  [field: string]: unknown;
}
