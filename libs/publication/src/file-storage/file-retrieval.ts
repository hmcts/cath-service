import { CONTAINER, downloadBlob } from "@hmcts/azure-blob";
import { prisma } from "@hmcts/postgres-prisma";
import { getContentTypeFromExtension } from "./content-type.js";

export async function getFileExtension(artefactId: string): Promise<string> {
  const artefact = await prisma.artefact.findUnique({
    where: { artefactId },
    select: { fileExtension: true }
  });
  return artefact?.fileExtension ?? ".pdf";
}

export async function getFileBuffer(artefactId: string): Promise<Buffer | null> {
  const extension = await getFileExtension(artefactId);
  return downloadBlob(`${artefactId}${extension}`, CONTAINER.ARTEFACT);
}

export async function getPublicationJson(artefactId: string): Promise<unknown | null> {
  const buffer = await getFileBuffer(artefactId);
  if (!buffer) return null;
  return JSON.parse(buffer.toString("utf-8"));
}

export function getContentType(fileExtension: string | null | undefined): string {
  return getContentTypeFromExtension(fileExtension);
}

export function getFileName(artefactId: string, fileExtension: string | null | undefined): string {
  const extension = fileExtension || ".pdf";
  return `${artefactId}${extension}`;
}
