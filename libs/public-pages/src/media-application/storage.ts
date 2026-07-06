import path from "node:path";
import { CONTAINER, uploadBlob } from "@hmcts/azure-blob";

const CONTENT_TYPE_MAP: Record<string, string> = {
  ".pdf": "application/pdf",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png"
};

export async function saveIdProofFile(applicationId: string, originalName: string, fileBuffer: Buffer): Promise<string> {
  const fileExtension = path.extname(originalName).toLowerCase();
  const contentType = CONTENT_TYPE_MAP[fileExtension] ?? "application/octet-stream";
  const blobKey = `${applicationId}${fileExtension}`;

  await uploadBlob(blobKey, fileBuffer, contentType, CONTAINER.FILES);

  return blobKey;
}
