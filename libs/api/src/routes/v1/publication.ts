import { type PddaHtmlUploadResponse, uploadHtmlToS3, validatePddaHtmlUpload } from "@hmcts/pdda-html-upload";
import type { Request, Response } from "express";
import multer from "multer";
import type { BlobIngestionRequest } from "../../blob-ingestion/repository/model.js";
import { processBlobIngestion } from "../../blob-ingestion/repository/service.js";
import { authenticateApi } from "../../middleware/oauth-middleware.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: Number.parseInt(process.env.PDDA_HTML_MAX_FILE_SIZE || "10485760", 10)
  }
});

function isBlobIngestionRequest(body: unknown): body is BlobIngestionRequest {
  if (typeof body !== "object" || body === null) {
    return false;
  }

  const req = body as Record<string, unknown>;
  return (
    typeof req.court_id === "string" &&
    typeof req.provenance === "string" &&
    typeof req.content_date === "string" &&
    typeof req.list_type === "string" &&
    typeof req.sensitivity === "string" &&
    typeof req.language === "string" &&
    typeof req.display_from === "string" &&
    typeof req.display_to === "string" &&
    req.hearing_list !== undefined
  );
}

function isMultipartRequest(req: Request): boolean {
  const contentType = req.headers["content-type"];
  return contentType?.includes("multipart/form-data") || false;
}

async function handleJsonBlobIngestion(req: Request, res: Response) {
  if (!isBlobIngestionRequest(req.body)) {
    console.error("Invalid request body structure");
    return res.status(400).json({
      success: false,
      message: "Invalid request body structure. Missing or invalid required fields."
    });
  }

  const request = req.body;
  // Use Content-Length header to get actual raw bytes received
  const contentLength = req.headers["content-length"];
  const rawBodySize = contentLength ? Number.parseInt(contentLength, 10) : Buffer.byteLength(JSON.stringify(req.body), "utf8");

  const result = await processBlobIngestion(request, rawBodySize);

  if (!result.success) {
    // Check if this is a no_match scenario - treat as successful operation
    if ("no_match" in result && result.no_match) {
      return res.status(200).json(result);
    }

    // Determine appropriate status code
    if (result.message === "Validation failed") {
      return res.status(400).json(result);
    }
    return res.status(500).json(result);
  }

  // Success response - 201 Created since we created an artefact
  return res.status(201).json(result);
}

async function handleHtmlFileUpload(req: Request, res: Response) {
  const correlationId = req.headers["x-correlation-id"] as string | undefined;

  const { type } = req.body;
  const file = req.file;

  const validation = validatePddaHtmlUpload(type, file);
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
}

// OAuth authentication is applied first in the middleware chain
export const POST = [
  authenticateApi(),
  // Conditionally apply multer only for multipart requests
  (req: Request, res: Response, next: () => void) => {
    if (isMultipartRequest(req)) {
      upload.single("file")(req, res, next);
    } else {
      next();
    }
  },
  async (req: Request, res: Response) => {
    try {
      // Route to appropriate handler based on content type
      if (isMultipartRequest(req)) {
        return await handleHtmlFileUpload(req, res);
      }
      return await handleJsonBlobIngestion(req, res);
    } catch (error) {
      const correlationId = req.headers["x-correlation-id"] as string | undefined;
      console.error("Unexpected error in publication endpoint:", {
        name: error instanceof Error ? error.name : "Unknown",
        message: error instanceof Error ? error.message : "Unknown error",
        code: error instanceof Error && "code" in error ? error.code : undefined,
        correlationId
      });
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        correlation_id: correlationId
      });
    }
  }
];
