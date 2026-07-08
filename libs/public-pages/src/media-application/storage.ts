import path from "node:path";
import { CONTAINER, getContentType, uploadBlob } from "@hmcts/azure-blob";

export async function saveIdProofFile(applicationId: string, originalName: string, fileBuffer: Buffer): Promise<string> {
  const fileExtension = path.extname(originalName).toLowerCase();
  const contentType = getContentType(fileExtension);
  const blobKey = `${applicationId}${fileExtension}`;

  await uploadBlob(blobKey, fileBuffer, contentType, CONTAINER.FILES);

  return blobKey;
}
