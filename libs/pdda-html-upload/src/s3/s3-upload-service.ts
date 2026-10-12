import { PutObjectCommand } from "@aws-sdk/client-s3";
import { isOutboundEnabled } from "@hmcts/outbound";
import type { S3UploadResult } from "../types.js";
import { createS3Client } from "./s3-client.js";

export async function uploadHtmlToS3(fileBuffer: Buffer, originalFilename: string, correlationId?: string): Promise<S3UploadResult> {
  const bucketName = process.env.AWS_S3_XHIBIT_BUCKET_NAME;
  const prefix = process.env.AWS_S3_XHIBIT_PREFIX || "pdda-html/";
  const s3Key = `${prefix}${originalFilename}`;

  if (!isOutboundEnabled()) {
    console.warn(`[pdda-html-upload] S3 upload skipped: outbound disabled (correlationId ${correlationId ?? "none"})`);
    return { success: false, s3Key, bucketName: bucketName ?? "" };
  }

  if (!bucketName) {
    throw new Error("AWS S3 bucket name not configured");
  }

  const s3Client = createS3Client();
  const now = new Date();

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
    // Log detailed error information including raw response
    const errorDetails: any = {
      error: error instanceof Error ? error.message : "Unknown error",
      bucketName,
      s3Key,
      correlationId
    };

    // Try to extract the raw response from AWS SDK error
    if (error && typeof error === "object") {
      const awsError = error as any;
      if (awsError.$response) {
        errorDetails.statusCode = awsError.$response.statusCode;
        errorDetails.headers = awsError.$response.headers;
      }
      if (awsError.$metadata) {
        errorDetails.metadata = awsError.$metadata;
      }
      if (awsError.Code) {
        errorDetails.awsErrorCode = awsError.Code;
      }
      if (awsError.RequestId) {
        errorDetails.requestId = awsError.RequestId;
      }
    }

    console.error("S3 upload failed:", errorDetails);
    throw new Error("The file could not be uploaded to storage. Try again.");
  }
}
