import { getLocationWithDetails } from "@hmcts/location";
import { prisma } from "@hmcts/postgres-prisma";
import { buildPdfPushHeaders, buildPushHeaders, resolveSourceArtefactId } from "./push/headers.js";
import { jsonBody, type PushBody, type PushFiles } from "./push/http-client.js";
import { buildFileMultipart } from "./push/multipart.js";
import { pushWithRetry } from "./push/retry.js";
import { findSubscribersByListType } from "./queries.js";

const COURTEL_API_URL_ENV = "COURTEL_API_URL";
const COURTEL_CERTIFICATE_ENV = "COURTEL_CERTIFICATE";
// Mirrors legacy's maxFileSize: data-management refused larger PDFs, so legacy never sent one.
const COURTEL_MAX_PDF_BYTES = 2_000_000;

export async function sendThirdPartyPublications(params: ThirdPartyPushParams): Promise<ThirdPartyPushOutcome> {
  const { artefactId, listTypeId, isUpdate, jsonData, loadArtefactFields, loadFiles, logPrefix = "[ThirdParty]" } = params;

  const secrets = resolveCourtelSecrets(logPrefix);
  if (!secrets) return "skipped";

  const subscribers = await findSubscribersByListType(listTypeId);
  if (subscribers.length === 0) {
    console.info(`${logPrefix} Third-party push skipped: no subscribers for listTypeId ${listTypeId}`);
    return "skipped";
  }

  const artefactFields = await loadArtefactFields();
  if (!artefactFields) {
    console.error(`${logPrefix} Third-party push failed: artefact not found for artefactId ${artefactId}`);
    return "failed";
  }

  const headers = await buildHeaders({ ...params, ...artefactFields });
  const files = loadFiles ? await loadFiles() : {};
  if (!files) {
    console.error(`${logPrefix} Third-party push failed: publication file not found for artefactId ${artefactId}`);
    return "failed";
  }

  const target: PushTarget = { ...secrets, artefactId, listTypeId, logPrefix };
  const logType = isUpdate ? "UPDATE" : "CREATE";

  if (files.flatFile) {
    const body = buildFileMultipart(files.flatFile, resolveSourceArtefactId(artefactId, artefactFields.sourceArtefactId));
    const result = await sendRequest(target, headers, body, logType, "flat file");
    return result.success ? "sent" : "failed";
  }

  // Without this guard the push would go out with no body, which Courtel reads as a deletion.
  if (jsonData == null) {
    console.error(`${logPrefix} Third-party push failed: no JSON to send for artefactId ${artefactId}`);
    return "failed";
  }

  // As in legacy, the PDF is only sent once Courtel has accepted the JSON.
  const jsonResult = await sendRequest(target, headers, jsonBody(JSON.stringify(jsonData)), logType, "JSON");
  if (!jsonResult.success) return "failed";

  if (!isSendablePdf(files.pdf, artefactId, logPrefix)) return "sent";

  const pdfResult = await sendRequest(target, buildPdfPushHeaders(headers), buildFileMultipart(files.pdf, `${artefactId}.pdf`), `${logType}_PDF`, "PDF");
  return pdfResult.success ? "sent" : "failed";
}

export async function sendThirdPartyDeletion(params: ThirdPartyDeletionParams): Promise<void> {
  const { artefactId, listTypeId, logPrefix = "[ThirdParty]" } = params;

  const secrets = resolveCourtelSecrets(logPrefix);
  if (!secrets) return;

  const subscribers = await findSubscribersByListType(listTypeId);
  if (subscribers.length === 0) {
    console.info(`${logPrefix} Third-party deletion push skipped: no subscribers for listTypeId ${listTypeId}`);
    return;
  }

  const headers = await buildHeaders(params);
  await sendRequest({ ...secrets, artefactId, listTypeId, logPrefix }, headers, null, "DELETION", "deletion");
}

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

async function buildHeaders(params: ThirdPartyDeletionParams): Promise<Record<string, string>> {
  const { artefactId, sourceArtefactId, type, locationId, listTypeId, contentDate, sensitivity, language, displayFrom, displayTo, provenance } = params;
  const location = await getLocationWithDetails(Number.parseInt(locationId, 10));
  return buildPushHeaders({
    artefactId,
    sourceArtefactId,
    type,
    listTypeId,
    contentDate,
    sensitivity,
    language,
    displayFrom,
    displayTo,
    provenance,
    location
  });
}

async function sendRequest(
  target: PushTarget,
  headers: Record<string, string>,
  body: PushBody | null,
  logType: string,
  requestName: string
): Promise<{ statusCode: number; success: boolean }> {
  const { url, certPem, artefactId, listTypeId, logPrefix } = target;

  console.info(`${logPrefix} Sending third-party ${requestName} request for artefactId ${artefactId} to ${url}`);
  const result = await pushWithRetry(url, certPem, headers, body, logPrefix);
  if (!result.success) {
    console.error(`${logPrefix} Third-party ${requestName} request failed for artefactId ${artefactId} (status ${result.statusCode})`);
  }

  writePushLog(artefactId, listTypeId, logType, result).catch((err) => {
    console.warn(`${logPrefix} Failed to write push log:`, err instanceof Error ? err.message : String(err));
  });

  return result;
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

function isSendablePdf(pdf: Buffer | undefined, artefactId: string, logPrefix: string): pdf is Buffer {
  if (!pdf) {
    console.info(`${logPrefix} No PDF sent to third party for artefactId ${artefactId}: no PDF available`);
    return false;
  }

  if (pdf.byteLength === 0) {
    console.warn(`${logPrefix} Empty PDF not sent to third party for artefactId ${artefactId}`);
    return false;
  }

  if (pdf.byteLength > COURTEL_MAX_PDF_BYTES) {
    console.warn(`${logPrefix} PDF not sent to third party for artefactId ${artefactId}: ${pdf.byteLength} bytes exceeds limit ${COURTEL_MAX_PDF_BYTES}`);
    return false;
  }

  return true;
}

export interface ThirdPartyDeletionParams extends ArtefactPushFields {
  artefactId: string;
  locationId: string;
  listTypeId: number;
  contentDate: Date;
  sensitivity: string;
  language: string;
  displayFrom?: Date | null;
  displayTo?: Date | null;
  provenance: string;
  logPrefix?: string;
}

export interface ThirdPartyPushParams extends Omit<ThirdPartyDeletionParams, keyof ArtefactPushFields> {
  isUpdate: boolean;
  jsonData?: unknown;
  // Both loaders are called only once a push will happen, so uploads with no Courtel subscribers do no extra work.
  // loadArtefactFields resolves null when the artefact row is missing, which fails the push.
  loadArtefactFields: () => Promise<ArtefactPushFields | null>;
  // Resolves null when a file the publication needs is missing, which fails the push rather than sending it empty.
  loadFiles?: () => Promise<PushFiles | null>;
}

export interface ArtefactPushFields {
  type: string;
  sourceArtefactId: string | null;
}

export type ThirdPartyPushOutcome = "sent" | "failed" | "skipped";

interface PushTarget {
  url: string;
  certPem: string;
  artefactId: string;
  listTypeId: number;
  logPrefix: string;
}
