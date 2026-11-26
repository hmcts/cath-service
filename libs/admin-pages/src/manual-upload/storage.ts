import { randomUUID } from "node:crypto";
import { getRedisClient } from "@hmcts/redis";
import type { DateInput } from "@hmcts/web-core";
import type { PendingFileReference, UploadedFile, ValidationError } from "./model.js";

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

export async function storePendingFile(prefix: PendingFilePrefix, file: UploadedFile): Promise<PendingFileReference> {
  const redis = await getRedisClient();
  const id = randomUUID();

  await redis.setEx(
    pendingFileKey(prefix, id),
    UPLOAD_TTL,
    JSON.stringify({
      fileName: file.originalname,
      fileType: file.mimetype,
      fileBase64: file.buffer.toString("base64")
    })
  );

  return { id, fileName: file.originalname };
}

export async function getPendingFile(prefix: PendingFilePrefix, id: string): Promise<UploadedFile | null> {
  const redis = await getRedisClient();
  const data = await redis.get(pendingFileKey(prefix, id));

  if (!data) {
    return null;
  }

  const parsed = JSON.parse(data);
  const buffer = Buffer.from(parsed.fileBase64, "base64");
  return { buffer, originalname: parsed.fileName, mimetype: parsed.fileType, size: buffer.length };
}

export async function deletePendingFile(prefix: PendingFilePrefix, id: string): Promise<void> {
  const redis = await getRedisClient();
  await redis.del(pendingFileKey(prefix, id));
}

// A file is only kept when it passed its own checks, so users never get an invalid file back.
export async function retainPendingFile(
  prefix: PendingFilePrefix,
  current: PendingFileReference | undefined,
  newFile: UploadedFile | undefined,
  errors: ValidationError[]
): Promise<PendingFileReference | undefined> {
  const hasFileError = errors.some((error) => error.href === "#file");

  if (!hasFileError && !newFile) {
    return current;
  }

  if (current) {
    await deletePendingFile(prefix, current.id);
  }

  if (hasFileError || !newFile) {
    return undefined;
  }

  return storePendingFile(prefix, newFile);
}

function pendingFileKey(prefix: PendingFilePrefix, id: string): string {
  return `${prefix}-pending:${id}`;
}

export type PendingFilePrefix = "manual-upload" | "non-strategic-upload";
