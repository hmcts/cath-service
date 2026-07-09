import type { UserProfile } from "@hmcts/auth";
import { getLocationById } from "@hmcts/location";
import type { Artefact } from "@hmcts/publication";
import { canAccessPublicationData, getArtefactById, getContentType, getFileBuffer, getFileExtension, getFileName, resolveListType } from "@hmcts/publication";
import { findListTypeById } from "@hmcts/system-admin-pages";

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

  const [location, listTypeInfo, fileExtension] = await Promise.all([
    getLocationById(Number.parseInt(artefact.locationId, 10)),
    findListTypeById(artefact.listTypeId),
    getFileExtension(artefact.artefactId)
  ]);

  const courtName = locale === "cy" ? location?.welshName || location?.name || "Unknown" : location?.name || "Unknown";
  const listTypeName = locale === "cy" ? listTypeInfo?.welshFriendlyName || "Unknown" : listTypeInfo?.friendlyName || "Unknown";

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
  if (!artefact) return { error: "NOT_FOUND" as const };

  const accessError = await checkArtefactAccess(artefact, user);
  if (accessError) return accessError;

  const fileBuffer = await getFileBuffer(artefact.artefactId);
  if (!fileBuffer) return { error: "FILE_NOT_FOUND" as const };

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
