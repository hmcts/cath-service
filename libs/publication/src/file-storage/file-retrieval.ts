import path from "node:path";
import { CONTAINER, downloadBlob } from "@hmcts/azure-blob";
import { prisma } from "@hmcts/postgres-prisma";
import { getContentTypeFromExtension } from "./content-type.js";

export async function getSourceArtefactId(artefactId: string): Promise<string> {
  const artefact = await prisma.artefact.findUnique({
    where: { artefactId },
    select: { sourceArtefactId: true }
  });
  return artefact?.sourceArtefactId ?? `${artefactId}.pdf`;
}

export async function getFileExtension(artefactId: string): Promise<string> {
  const sourceArtefactId = await getSourceArtefactId(artefactId);
  return path.extname(sourceArtefactId) || ".pdf";
}

export async function getFileBuffer(artefactId: string): Promise<Buffer | null> {
  // New blobs are stored without an extension (just the artefactId).
  const buffer = await downloadBlob(artefactId, CONTAINER.ARTEFACT);
  if (buffer) return buffer;

  // Backward-compat: older blobs were stored with the extension appended.
  const sourceArtefactId = await getSourceArtefactId(artefactId);
  const extension = path.extname(sourceArtefactId) || ".pdf";
  const legacyBuffer = await downloadBlob(`${artefactId}${extension}`, CONTAINER.ARTEFACT);
  if (legacyBuffer) return legacyBuffer;

  // Non-strategic Excel uploads stored the original Excel filename in source_artefact_id
  // but the converted blob was always .json — fall back to .json if legacy extension missed.
  if (extension !== ".json") {
    return downloadBlob(`${artefactId}.json`, CONTAINER.ARTEFACT);
  }
  return null;
}

export async function getPublicationJson(artefactId: string): Promise<unknown | null> {
  const buffer = await getFileBuffer(artefactId);
  if (!buffer) return null;
  return JSON.parse(buffer.toString("utf-8"));
}

export function getContentType(fileExtension: string | null | undefined): string {
  return getContentTypeFromExtension(fileExtension);
}

export function getFileName(sourceArtefactId: string): string {
  return sourceArtefactId;
}
