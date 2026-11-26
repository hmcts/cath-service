import { CONTAINER, getBlobProperties } from "@hmcts/azure-blob";
import { prisma } from "@hmcts/postgres-prisma";
import { getFileBuffer, getFileExtension } from "../file-storage/file-retrieval.js";
import { getArtefactListTypeId } from "./queries.js";

function isValidArtefactId(artefactId: string): boolean {
  // Only allow alphanumeric characters, hyphens, and underscores (typical UUID format)
  const validPattern = /^[a-zA-Z0-9_-]+$/;
  return validPattern.test(artefactId);
}

export async function getJsonContent(artefactId: string): Promise<object | null> {
  if (!isValidArtefactId(artefactId)) {
    return null;
  }

  try {
    const buffer = await getFileBuffer(artefactId);
    if (!buffer) {
      return null;
    }

    return JSON.parse(buffer.toString("utf-8"));
  } catch {
    return null;
  }
}

export async function getRenderedTemplateUrl(artefactId: string): Promise<string | null> {
  const listTypeId = await getArtefactListTypeId(artefactId);

  if (!listTypeId) {
    return null;
  }

  const listType = await prisma.listType.findUnique({
    where: {
      id: listTypeId
    }
  });

  if (!listType?.url) {
    return null;
  }

  return `/${listType.url}?artefactId=${encodeURIComponent(artefactId)}`;
}

export async function getFlatFileUrl(artefactId: string): Promise<string | null> {
  if (!isValidArtefactId(artefactId)) {
    return null;
  }

  try {
    const extension = await getFileExtension(artefactId);

    // New blobs are stored without an extension (just the artefactId).
    const bareBlob = await getBlobProperties(artefactId, CONTAINER.ARTEFACT);

    // Backward-compat: older blobs were stored with the extension appended.
    const legacyBlob = bareBlob ? null : await getBlobProperties(`${artefactId}${extension}`, CONTAINER.ARTEFACT);

    if (!bareBlob && !legacyBlob) {
      return null;
    }

    return `/files/${encodeURIComponent(`${artefactId}${extension}`)}`;
  } catch {
    return null;
  }
}
