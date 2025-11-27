import type { Request, Response } from "express";
import type { BlobIngestionRequest } from "../../blob-ingestion/repository/model.js";
import { processBlobIngestion } from "../../blob-ingestion/repository/service.js";
import { authenticateApi } from "../../middleware/oauth-middleware.js";

// OAuth authentication is applied first in the middleware chain
export const POST = [
  authenticateApi(),
  async (req: Request, res: Response) => {
    try {
      const request = req.body as BlobIngestionRequest;
      const rawBodySize = JSON.stringify(req.body).length;

      const result = await processBlobIngestion(request, rawBodySize);

      if (!result.success) {
        // Determine appropriate status code
        if (result.message === "Validation failed") {
          return res.status(400).json(result);
        }
        return res.status(500).json(result);
      }

      // Success response - 201 Created since we created an artefact
      return res.status(201).json(result);
    } catch (error) {
      console.error("Unexpected error in blob ingestion endpoint:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error"
      });
    }
  }
];
