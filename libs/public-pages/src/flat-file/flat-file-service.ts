import type { UserProfile } from "@hmcts/auth";
import { getLocationById } from "@hmcts/location";
import { canAccessPublicationData, getArtefactById, getContentType, getFileBuffer, getFileExtension, getFileName, resolveListType } from "@hmcts/publication";
import { findListTypeById } from "@hmcts/system-admin-pages";

export async function getFlatFileForDisplay(artefactId: string, locationId: string, locale: string = "en", user: UserProfile | undefined = undefined) {
  const artefact = await getArtefactById(artefactId);

  if (!artefact) {
    return { error: "NOT_FOUND" as const };
  }

  if (artefact.locationId !== locationId) {
    return { error: "LOCATION_MISMATCH" as const };
  }

  if (!artefact.isFlatFile) {
    return { error: "NOT_FLAT_FILE" as const };
  }

  const now = new Date();
  if (now < artefact.displayFrom || now > artefact.displayTo) {
    return { error: "EXPIRED" as const };
  }

  if (!canAccessPublicationData(user, artefact, await resolveListType(artefact.listTypeId))) {
    return { error: "ACCESS_DENIED" as const };
  }

  const fileBuffer = await getFileBuffer(artefact.artefactId);

  if (!fileBuffer) {
    return { error: "FILE_NOT_FOUND" as const };
  }

  const location = await getLocationById(Number.parseInt(artefact.locationId, 10));
  const listTypeInfo = await findListTypeById(artefact.listTypeId);

  const courtName = locale === "cy" ? location?.welshName || location?.name || "Unknown" : location?.name || "Unknown";
  const listTypeName = locale === "cy" ? listTypeInfo?.welshFriendlyName || "Unknown" : listTypeInfo?.friendlyName || "Unknown";

  // Get file extension from filesystem
  const fileExtension = await getFileExtension(artefact.artefactId);

  return {
    success: true,
    artefactId: artefact.artefactId,
    courtName,
    listTypeName,
    contentDate: artefact.contentDate,
    language: artefact.language,
    fileExtension
  };
}

export async function getFileForDownload(artefactId: string, user: UserProfile | undefined = undefined) {
  const artefact = await getArtefactById(artefactId);

  if (!artefact) {
    return { error: "NOT_FOUND" as const };
  }

  if (!artefact.isFlatFile) {
    return { error: "NOT_FLAT_FILE" as const };
  }

  const now = new Date();
  if (now < artefact.displayFrom || now > artefact.displayTo) {
    return { error: "EXPIRED" as const };
  }

  if (!canAccessPublicationData(user, artefact, await resolveListType(artefact.listTypeId))) {
    return { error: "ACCESS_DENIED" as const };
  }

  const fileBuffer = await getFileBuffer(artefact.artefactId);

  if (!fileBuffer) {
    return { error: "FILE_NOT_FOUND" as const };
  }

  // Get file extension from filesystem
  const fileExtension = await getFileExtension(artefact.artefactId);

  return {
    success: true,
    fileBuffer,
    contentType: getContentType(fileExtension),
    fileName: getFileName(artefact.artefactId, fileExtension)
  };
}

type FlatFileResult = Awaited<ReturnType<typeof getFlatFileForDisplay>>;
type DownloadFileResult = Awaited<ReturnType<typeof getFileForDownload>>;
export type { FlatFileResult, DownloadFileResult };
