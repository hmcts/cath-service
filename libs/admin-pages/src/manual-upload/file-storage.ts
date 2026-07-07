import path from "node:path";
import { uploadBlob } from "@hmcts/azure-blob";

export async function saveUploadedFile(artefactId: string, originalFileName: string, fileBuffer: Buffer): Promise<void> {
  const fileExtension = path.extname(originalFileName);
  const blobName = `${artefactId}${fileExtension}`;
  await uploadBlob(blobName, fileBuffer);
}
