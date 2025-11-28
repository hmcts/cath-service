import type { Request, Response } from "express";
import type { BlobIngestionRequest } from "../../blob-ingestion/repository/model.js";
import { processBlobIngestion } from "../../blob-ingestion/repository/service.js";
import { authenticateApi } from "../../middleware/oauth-middleware.js";

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

// OAuth authentication is applied first in the middleware chain
export const POST = [
  authenticateApi(),
  async (req: Request, res: Response) => {
    try {
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
    } catch (error) {
      console.error("Unexpected error in blob ingestion endpoint:", {
        name: error instanceof Error ? error.name : "Unknown",
        message: error instanceof Error ? error.message : "Unknown error",
        code: error instanceof Error && "code" in error ? error.code : undefined
      });
      return res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  }
];
