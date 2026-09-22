import {
  authenticateApi,
  buildLcsuArtefactResponse,
  buildMessage,
  joinValidationMessages,
  logIngestionResult,
  MAX_BLOB_SIZE,
  type PublicationIngestionResult,
  type PublicationMetadata,
  parsePublicationHeaders,
  processBlobIngestion,
  processFlatFileBlobIngestion,
  validatePublicationMetadata
} from "@hmcts/blob-ingestion";
import { uploadHtmlToS3, validatePddaHtmlUpload } from "@hmcts/pdda-html-upload";
import { ArtefactType } from "@hmcts/publication";
import type { NextFunction, Request, Response } from "express";
import multer from "multer";

const LCSU_JSON_REJECTION = "LCSU publications must be sent as multipart/form-data";
const MISSING_FILE_MESSAGE = "No file provided. Include a file in the 'file' field of the multipart form.";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BLOB_SIZE }
});

// OAuth authentication is applied first in the middleware chain.
export const POST = [
  authenticateApi(),
  conditionalMulter,
  async (req: Request, res: Response) => {
    const correlationId = readCorrelationId(req);

    try {
      const { metadata, errors } = parsePublicationHeaders(req.headers);

      // Headers are validated before any branch, so LCSU is checked exactly like a flat file.
      if (!metadata) {
        return res.status(400).json(buildMessage(joinValidationMessages(errors)));
      }

      if (isMultipartRequest(req)) {
        return metadata.type === ArtefactType.LCSU ? await handleLcsuUpload(req, res, metadata, correlationId) : await handleFlatFileUpload(req, res, metadata);
      }

      if (metadata.type === ArtefactType.LCSU) {
        return res.status(400).json(buildMessage(LCSU_JSON_REJECTION));
      }

      return await handleJsonPublication(req, res, metadata);
    } catch (error) {
      console.error("Unexpected error in publication endpoint:", {
        name: error instanceof Error ? error.name : "Unknown",
        message: error instanceof Error ? error.message : "Unknown error",
        code: error instanceof Error && "code" in error ? error.code : undefined,
        correlationId
      });
      return res.status(500).json(buildMessage("Internal server error"));
    }
  }
];

function conditionalMulter(req: Request, res: Response, next: NextFunction) {
  if (!isMultipartRequest(req)) {
    return next();
  }

  upload.single("file")(req, res, (error: unknown) => {
    if (error instanceof multer.MulterError) {
      return res.status(400).json(buildMessage(error.message));
    }
    return next(error as Error | undefined);
  });
}

async function handleJsonPublication(req: Request, res: Response, metadata: PublicationMetadata) {
  const contentLength = req.headers["content-length"];
  const rawBodySize = contentLength ? Number.parseInt(contentLength, 10) : Buffer.byteLength(JSON.stringify(req.body ?? null), "utf8");

  const result = await processBlobIngestion(metadata, req.body, rawBodySize);
  return respondToIngestion(res, result);
}

async function handleFlatFileUpload(req: Request, res: Response, metadata: PublicationMetadata) {
  if (!req.file) {
    return res.status(400).json(buildMessage(MISSING_FILE_MESSAGE));
  }

  const result = await processFlatFileBlobIngestion(metadata, req.file.buffer, req.file.size);
  return respondToIngestion(res, result);
}

/**
 * LCSU is a pass-through to S3: the metadata is validated exactly as for a publication,
 * but nothing is persisted — no artefact row, no blob, no PDF, no notifications.
 */
async function handleLcsuUpload(req: Request, res: Response, metadata: PublicationMetadata, correlationId: string | undefined) {
  const fileValidation = validatePddaHtmlUpload(req.file);
  if (!fileValidation.valid) {
    return res.status(400).json(buildMessage(fileValidation.error ?? "Validation failed"));
  }

  const file = req.file as Express.Multer.File;

  const metadataValidation = await validatePublicationMetadata(metadata, file.size);
  if (!metadataValidation.isValid) {
    return res.status(400).json(buildMessage(joinValidationMessages(metadataValidation.errors)));
  }

  const uploadResult = await uploadHtmlToS3(file.buffer, file.originalname, correlationId);

  console.info("LCSU HTML upload successful", {
    s3Key: uploadResult.s3Key,
    bucketName: uploadResult.bucketName,
    correlationId,
    originalFilename: file.originalname,
    fileSize: file.size
  });

  // Traceability only — the publisher sees nothing of this and no artefact is created.
  await logIngestionResult({ sourceSystem: metadata.provenance, courtId: metadata.courtId, status: "SUCCESS" });

  return res.status(201).json(buildLcsuArtefactResponse(metadata));
}

function respondToIngestion(res: Response, result: PublicationIngestionResult) {
  switch (result.outcome) {
    case "CREATED":
      return res.status(201).json(result.artefact);
    case "VALIDATION_ERROR":
      return res.status(400).json(buildMessage(result.message ?? "Validation failed"));
    case "CONFLICT":
      return res.status(409).json(buildMessage(result.message ?? "Conflict"));
    default:
      return res.status(500).json(buildMessage(result.message ?? "Internal server error"));
  }
}

function isMultipartRequest(req: Request): boolean {
  return req.headers["content-type"]?.includes("multipart/form-data") ?? false;
}

function readCorrelationId(req: Request): string | undefined {
  const raw = req.headers["x-correlation-id"];
  return Array.isArray(raw) ? raw[0] : raw;
}
