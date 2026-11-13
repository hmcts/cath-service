import { getLocationWithDetails } from "@hmcts/location";
import { prisma } from "@hmcts/postgres-prisma";
import { buildPushHeaders } from "./push/headers.js";
import type { PushFiles } from "./push/http-client.js";
import { pushWithRetry } from "./push/retry.js";
import { findSubscribersByListType } from "./queries.js";

const COURTEL_API_URL_ENV = "COURTEL_API_URL";
const COURTEL_CERTIFICATE_ENV = "COURTEL_CERTIFICATE";

export interface ThirdPartyPushParams {
  artefactId: string;
  locationId: string;
  listTypeId: number;
  contentDate: Date;
  sensitivity: string;
  language: string;
  displayFrom?: Date | null;
  displayTo?: Date | null;
  provenance: string;
  isUpdate: boolean;
  jsonData?: unknown;
  // Called only once a push will happen, so uploads with no Courtel subscribers download nothing.
  // Resolves null when a file the publication needs is missing, which fails the push rather than sending it empty.
  loadFiles?: () => Promise<PushFiles | null>;
  logPrefix?: string;
}

export type ThirdPartyDeletionParams = Omit<ThirdPartyPushParams, "jsonData" | "loadFiles" | "isUpdate">;

export type ThirdPartyPushOutcome = "sent" | "failed" | "skipped";

function resolveCourtelSecrets(logPrefix: string): { url: string; certPem: string } | null {
  const url = process.env[COURTEL_API_URL_ENV];
  const certBase64 = process.env[COURTEL_CERTIFICATE_ENV];

  if (!url) {
    console.error(`${logPrefix} Third-party push skipped: ${COURTEL_API_URL_ENV} is not set`);
    return null;
  }

  if (!certBase64) {
    console.error(`${logPrefix} Third-party push skipped: ${COURTEL_CERTIFICATE_ENV} is not set`);
    return null;
  }

  const certPem = Buffer.from(certBase64, "base64").toString("utf-8");
  return { url, certPem };
}

export async function sendThirdPartyPublications(params: ThirdPartyPushParams): Promise<ThirdPartyPushOutcome> {
  const {
    artefactId,
    locationId,
    listTypeId,
    contentDate,
    sensitivity,
    language,
    displayFrom,
    displayTo,
    provenance,
    isUpdate,
    jsonData,
    loadFiles,
    logPrefix = "[ThirdParty]"
  } = params;

  const secrets = resolveCourtelSecrets(logPrefix);
  if (!secrets) return "skipped";

  const subscribers = await findSubscribersByListType(listTypeId);
  if (subscribers.length === 0) {
    console.info(`${logPrefix} Third-party push skipped: no subscribers for listTypeId ${listTypeId}`);
    return "skipped";
  }

  const location = await getLocationWithDetails(Number.parseInt(locationId, 10));
  const headers = await buildPushHeaders({ artefactId, listTypeId, contentDate, sensitivity, language, displayFrom, displayTo, provenance, location });
  const body = jsonData != null ? JSON.stringify(jsonData) : null;
  const files = loadFiles ? await loadFiles() : {};
  if (!files) {
    console.error(`${logPrefix} Third-party push failed: publication file not found for artefactId ${artefactId}`);
    return "failed";
  }

  console.info(`${logPrefix} Sending third-party push for artefactId ${artefactId} to ${secrets.url}`);
  const result = await pushWithRetry(secrets.url, secrets.certPem, headers, body, logPrefix, files);
  writePushLog(artefactId, listTypeId, isUpdate ? "UPDATE" : "CREATE", result).catch((err) => {
    console.warn(`${logPrefix} Failed to write push log:`, err instanceof Error ? err.message : String(err));
  });

  return result.success ? "sent" : "failed";
}

export async function sendThirdPartyDeletion(params: ThirdPartyDeletionParams): Promise<void> {
  const { artefactId, locationId, listTypeId, contentDate, sensitivity, language, displayFrom, displayTo, provenance, logPrefix = "[ThirdParty]" } = params;

  const secrets = resolveCourtelSecrets(logPrefix);
  if (!secrets) return;

  const subscribers = await findSubscribersByListType(listTypeId);
  if (subscribers.length === 0) {
    console.info(`${logPrefix} Third-party deletion push skipped: no subscribers for listTypeId ${listTypeId}`);
    return;
  }

  const location = await getLocationWithDetails(Number.parseInt(locationId, 10));
  const headers = await buildPushHeaders({ artefactId, listTypeId, contentDate, sensitivity, language, displayFrom, displayTo, provenance, location });

  console.info(`${logPrefix} Sending third-party deletion for artefactId ${artefactId} to ${secrets.url}`);
  const result = await pushWithRetry(secrets.url, secrets.certPem, headers, null, logPrefix);
  writePushLog(artefactId, listTypeId, "DELETION", result).catch((err) => {
    console.warn(`${logPrefix} Failed to write push log:`, err instanceof Error ? err.message : String(err));
  });
}

async function writePushLog(artefactId: string, listTypeId: number, type: string, result: { statusCode: number; success: boolean }): Promise<void> {
  await prisma.thirdPartyPushLog.create({
    data: {
      artefactId,
      listTypeId,
      type,
      status: result.success ? "SUCCESS" : "FAILED",
      statusCode: result.statusCode
    }
  });
}
