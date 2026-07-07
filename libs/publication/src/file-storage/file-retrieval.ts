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
  const sourceArtefactId = await getSourceArtefactId(artefactId);
  const extension = path.extname(sourceArtefactId) || ".pdf";
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

export function getFileName(sourceArtefactId: string): string {
  return sourceArtefactId;
}
