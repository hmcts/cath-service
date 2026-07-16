import { uploadBlob } from "@hmcts/azure-blob";

export async function saveUploadedFile(artefactId: string, _originalFileName: string, fileBuffer: Buffer): Promise<void> {
  await uploadBlob(artefactId, fileBuffer);
}
