import { getBlobUrl, uploadBlob } from "@hmcts/azure-blob";

// Returns the blob URL so the Artefact response can carry it as `payload`.
export async function saveUploadedFile(artefactId: string, _originalFileName: string, fileBuffer: Buffer): Promise<string> {
  await uploadBlob(artefactId, fileBuffer);
  return getBlobUrl(artefactId);
}
