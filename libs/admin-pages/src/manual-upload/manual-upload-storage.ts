import { randomUUID } from "node:crypto";
import { getRedisClient } from "@hmcts/redis";

const UPLOAD_TTL = 3600; // 1 hour expiry

interface DateInput {
  day: string;
  month: string;
  year: string;
}

export interface ManualUploadData {
  file: Buffer;
  fileName: string;
  fileType: string;
  locationId: string;
  listType: string;
  hearingStartDate: DateInput;
  sensitivity: string;
  language: string;
  displayFrom: DateInput;
  displayTo: DateInput;
}

export async function storeManualUpload(data: ManualUploadData): Promise<string> {
  const redis = await getRedisClient();
  const uploadId = randomUUID();
  const key = `manual-upload:${uploadId}`;

  await redis.setEx(
    key,
    UPLOAD_TTL,
    JSON.stringify({
      fileName: data.fileName,
      fileType: data.fileType,
      fileBase64: data.file.toString("base64"),
      locationId: data.locationId,
      listType: data.listType,
      hearingStartDate: data.hearingStartDate,
      sensitivity: data.sensitivity,
      language: data.language,
      displayFrom: data.displayFrom,
      displayTo: data.displayTo,
      uploadedAt: new Date().toISOString()
    })
  );

  return uploadId;
}

export async function getManualUpload(uploadId: string): Promise<ManualUploadData | null> {
  const redis = await getRedisClient();
  const key = `manual-upload:${uploadId}`;
  const data = await redis.get(key);

  if (!data) {
    return null;
  }

  const parsed = JSON.parse(data);
  return {
    file: Buffer.from(parsed.fileBase64, "base64"),
    fileName: parsed.fileName,
    fileType: parsed.fileType,
    locationId: parsed.locationId,
    listType: parsed.listType,
    hearingStartDate: parsed.hearingStartDate,
    sensitivity: parsed.sensitivity,
    language: parsed.language,
    displayFrom: parsed.displayFrom,
    displayTo: parsed.displayTo
  };
}
