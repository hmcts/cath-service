import crypto from "node:crypto";
import path from "node:path";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import type { S3UploadResult } from "../types.js";
import { createS3Client } from "./s3-client.js";

export async function uploadHtmlToS3(fileBuffer: Buffer, originalFilename: string, correlationId?: string): Promise<S3UploadResult> {
  const s3Client = createS3Client();
  const bucketName = process.env.AWS_S3_XHIBIT_BUCKET_NAME;
  const prefix = process.env.AWS_S3_XHIBIT_PREFIX || "pdda-html/";

  if (!bucketName) {
    throw new Error("AWS S3 bucket name not configured");
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const uuid = crypto.randomUUID();
  const extension = path.extname(originalFilename).toLowerCase();
  const s3Key = `${prefix}${year}/${month}/${day}/${uuid}${extension}`;

  try {
    const putCommand = new PutObjectCommand({
      Bucket: bucketName,
      Key: s3Key,
      Body: fileBuffer,
      ContentType: "text/html",
      Metadata: {
        originalFilename,
        correlationId: correlationId || "",
        uploadTimestamp: now.toISOString()
      }
    });

    await s3Client.send(putCommand);

    return {
      success: true,
      s3Key,
      bucketName
    };
  } catch (error) {
    console.error("S3 upload failed:", {
      error: error instanceof Error ? error.message : "Unknown error",
      bucketName,
      s3Key,
      correlationId
    });
    throw new Error("The file could not be uploaded to storage. Try again.");
  }
}
