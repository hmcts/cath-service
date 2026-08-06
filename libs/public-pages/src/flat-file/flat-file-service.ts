import path from "node:path";
import type { UserProfile } from "@hmcts/auth";
import { CONTAINER, downloadBlob } from "@hmcts/azure-blob";
import { getLocationById } from "@hmcts/location";
import type { Artefact } from "@hmcts/publication";
import {
  canAccessPublicationData,
  getArtefactById,
  getContentType,
  getFileBuffer,
  getFileName,
  getSourceArtefactId,
  resolveListType
} from "@hmcts/publication";
import { findListTypeById } from "@hmcts/system-admin-pages";

const XLSX_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

type GuardError = { error: "NOT_FLAT_FILE" | "EXPIRED" | "ACCESS_DENIED" };

async function checkArtefactAccess(artefact: Artefact, user: UserProfile | undefined): Promise<GuardError | null> {
  if (!artefact.isFlatFile) return { error: "NOT_FLAT_FILE" };
  const now = new Date();
  if (now < artefact.displayFrom || now > artefact.displayTo) return { error: "EXPIRED" };
  if (!canAccessPublicationData(user, artefact, await resolveListType(artefact.listTypeId))) return { error: "ACCESS_DENIED" };
  return null;
}

export async function getFlatFileForDisplay(artefactId: string, locationId: string, locale: string = "en", user: UserProfile | undefined = undefined) {
  const artefact = await getArtefactById(artefactId);
  if (!artefact) return { error: "NOT_FOUND" as const };
  if (artefact.locationId !== locationId) return { error: "LOCATION_MISMATCH" as const };

  const accessError = await checkArtefactAccess(artefact, user);
  if (accessError) return accessError;

  const fileBuffer = await getFileBuffer(artefact.artefactId);
  if (!fileBuffer) return { error: "FILE_NOT_FOUND" as const };

  const [location, listTypeInfo] = await Promise.all([getLocationById(Number.parseInt(artefact.locationId, 10)), findListTypeById(artefact.listTypeId)]);

  const courtName = locale === "cy" ? location?.welshName || location?.name || "Unknown" : location?.name || "Unknown";
  const listTypeName = locale === "cy" ? listTypeInfo?.welshFriendlyName || "Unknown" : listTypeInfo?.friendlyName || "Unknown";

  const sourceArtefactId = await getSourceArtefactId(artefact.artefactId);

  return {
    success: true,
    artefactId: artefact.artefactId,
    courtName,
    listTypeName,
    contentDate: artefact.contentDate,
    language: artefact.language,
    sourceArtefactId
  };
}

export async function getFileForDownload(artefactId: string, user: UserProfile | undefined = undefined) {
  const artefact = await getArtefactById(artefactId);
  if (!artefact) return { error: "NOT_FOUND" as const };

  const accessError = await checkArtefactAccess(artefact, user);
  if (accessError) return accessError;

  const fileBuffer = await getFileBuffer(artefact.artefactId);
  if (!fileBuffer) return { error: "FILE_NOT_FOUND" as const };

  const sourceArtefactId = await getSourceArtefactId(artefact.artefactId);

  return {
    success: true,
    fileBuffer,
    contentType: getContentType(path.extname(sourceArtefactId) || null),
    fileName: getFileName(sourceArtefactId)
  };
}

// No isFlatFile guard here. Excel files are generated from JSON publications
// (isFlatFile: false). The guard in getFileForDownload is for flat-file artefacts only
// and would incorrectly block every Excel download if added here.
export async function getExcelForDownload(artefactId: string, user: UserProfile | undefined = undefined) {
  const artefact = await getArtefactById(artefactId);

  if (!artefact) {
    return { error: "NOT_FOUND" as const };
  }

  const now = new Date();
  if (now < artefact.displayFrom || now > artefact.displayTo) {
    return { error: "EXPIRED" as const };
  }

  if (!canAccessPublicationData(user, artefact, await resolveListType(artefact.listTypeId))) {
    return { error: "ACCESS_DENIED" as const };
  }

  const fileBuffer = await downloadBlob(`${artefactId}.xlsx`, CONTAINER.PUBLICATIONS);

  if (!fileBuffer) {
    return { error: "FILE_NOT_FOUND" as const };
  }

  return {
    success: true,
    fileBuffer,
    contentType: XLSX_CONTENT_TYPE,
    fileName: `${artefactId}.xlsx`
  };
}

type FlatFileResult = Awaited<ReturnType<typeof getFlatFileForDisplay>>;
type DownloadFileResult = Awaited<ReturnType<typeof getFileForDownload>>;
type ExcelDownloadResult = Awaited<ReturnType<typeof getExcelForDownload>>;
export type { FlatFileResult, DownloadFileResult, ExcelDownloadResult };
