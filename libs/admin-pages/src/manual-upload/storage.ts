import { randomUUID } from "node:crypto";
import { getRedisClient } from "@hmcts/redis";
import type { DateInput } from "@hmcts/web-core";

const UPLOAD_TTL = 3600; // 1 hour expiry

export interface UploadData {
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

async function storeUpload(data: UploadData, keyPrefix: string): Promise<string> {
  const redis = await getRedisClient();
  const uploadId = randomUUID();
  const key = `${keyPrefix}:${uploadId}`;

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

async function getUpload(uploadId: string, keyPrefix: string): Promise<UploadData | null> {
  const redis = await getRedisClient();
  const key = `${keyPrefix}:${uploadId}`;
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

export async function storeManualUpload(data: UploadData): Promise<string> {
  return storeUpload(data, "manual-upload");
}

export async function getManualUpload(uploadId: string): Promise<UploadData | null> {
  return getUpload(uploadId, "manual-upload");
}

export async function storeNonStrategicUpload(data: UploadData): Promise<string> {
  return storeUpload(data, "non-strategic-upload");
}

export async function getNonStrategicUpload(uploadId: string): Promise<UploadData | null> {
  return getUpload(uploadId, "non-strategic-upload");
}
