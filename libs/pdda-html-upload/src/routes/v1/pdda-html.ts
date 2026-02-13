import { authenticateApi } from "@hmcts/blob-ingestion";
import type { Request, RequestHandler, Response } from "express";
import multer from "multer";
import { uploadHtmlToS3 } from "../../s3/s3-upload-service.js";
import type { PddaHtmlUploadResponse } from "../../types.js";
import { validatePddaHtmlUpload } from "../../validation/file-validation.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: Number.parseInt(process.env.PDDA_HTML_MAX_FILE_SIZE || "10485760", 10)
  }
});

const postHandler = async (req: Request, res: Response) => {
  const correlationId = req.headers["x-correlation-id"] as string | undefined;

  try {
    const { artefact_type } = req.body;
    const file = req.file;

    const validation = validatePddaHtmlUpload(artefact_type, file);
    if (!validation.valid) {
      const response: PddaHtmlUploadResponse = {
        success: false,
        message: validation.error || "Validation failed",
        correlation_id: correlationId
      };
      return res.status(400).json(response);
    }

    // TypeScript doesn't know validation ensures file exists
    if (!file) {
      throw new Error("File missing after validation - this should never happen");
    }

    const uploadResult = await uploadHtmlToS3(file.buffer, file.originalname, correlationId);

    console.info("PDDA HTML upload successful", {
      s3Key: uploadResult.s3Key,
      bucketName: uploadResult.bucketName,
      correlationId,
      originalFilename: file.originalname,
      fileSize: file.size
    });

    const response: PddaHtmlUploadResponse = {
      success: true,
      message: "Upload accepted and stored",
      s3_key: uploadResult.s3Key,
      correlation_id: correlationId
    };
    return res.status(201).json(response);
  } catch (error) {
    console.error("PDDA HTML upload failed", {
      error: error instanceof Error ? error.message : "Unknown error",
      correlationId
    });

    const response: PddaHtmlUploadResponse = {
      success: false,
      message: "Internal server error",
      correlation_id: correlationId
    };
    return res.status(500).json(response);
  }
};

export const POST: RequestHandler[] = [authenticateApi(), upload.single("file"), postHandler];
