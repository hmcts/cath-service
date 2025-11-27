import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BlobIngestionRequest } from "../../blob-ingestion/repository/model.js";
import { POST } from "./publication.js";

vi.mock("../../blob-ingestion/repository/service.js", () => ({
  processBlobIngestion: vi.fn()
}));

vi.mock("../../middleware/oauth-middleware.js", () => ({
  authenticateApi: vi.fn(() => (_req: Request, _res: Response, next: () => void) => next())
}));

describe("POST /v1/publication", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let statusMock: ReturnType<typeof vi.fn>;
  let jsonMock: ReturnType<typeof vi.fn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();

    statusMock = vi.fn().mockReturnThis();
    jsonMock = vi.fn();

    mockRequest = {
      body: {
        court_id: "TEST_COURT_ID",
        provenance: "TEST_SOURCE",
        content_date: "2024-01-15",
        list_type: "CIVIL_AND_FAMILY_DAILY_CAUSE_LIST",
        sensitivity: "PUBLIC",
        language: "ENGLISH",
        display_from: "2024-01-15T00:00:00Z",
        display_to: "2024-01-16T00:00:00Z",
        hearing_list: { cases: [] }
      }
    };

    mockResponse = {
      status: statusMock,
      json: jsonMock
    };

    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("should return 201 and artefact_id when blob ingestion is successful", async () => {
    const { processBlobIngestion } = await import("../../blob-ingestion/repository/service.js");

    vi.mocked(processBlobIngestion).mockResolvedValue({
      success: true,
      artefact_id: "test-artefact-123",
      message: "Blob ingestion successful"
    });

    const handlers = POST;
    const handler = handlers[1] as (req: Request, res: Response) => Promise<void>;

    await handler(mockRequest as Request, mockResponse as Response);

    expect(statusMock).toHaveBeenCalledWith(201);
    expect(jsonMock).toHaveBeenCalledWith({
      success: true,
      artefact_id: "test-artefact-123",
      message: "Blob ingestion successful"
    });
  });

  it("should return 400 when validation fails", async () => {
    const { processBlobIngestion } = await import("../../blob-ingestion/repository/service.js");

    vi.mocked(processBlobIngestion).mockResolvedValue({
      success: false,
      message: "Validation failed",
      errors: [{ field: "court_id", message: "Invalid court ID" }]
    });

    const handlers = POST;
    const handler = handlers[1] as (req: Request, res: Response) => Promise<void>;

    await handler(mockRequest as Request, mockResponse as Response);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith({
      success: false,
      message: "Validation failed",
      errors: [{ field: "court_id", message: "Invalid court ID" }]
    });
  });

  it("should return 500 when processing fails with generic error", async () => {
    const { processBlobIngestion } = await import("../../blob-ingestion/repository/service.js");

    vi.mocked(processBlobIngestion).mockResolvedValue({
      success: false,
      message: "Database error"
    });

    const handlers = POST;
    const handler = handlers[1] as (req: Request, res: Response) => Promise<void>;

    await handler(mockRequest as Request, mockResponse as Response);

    expect(statusMock).toHaveBeenCalledWith(500);
    expect(jsonMock).toHaveBeenCalledWith({
      success: false,
      message: "Database error"
    });
  });

  it("should return 500 when unexpected error occurs", async () => {
    const { processBlobIngestion } = await import("../../blob-ingestion/repository/service.js");

    vi.mocked(processBlobIngestion).mockRejectedValue(new Error("Unexpected error"));

    const handlers = POST;
    const handler = handlers[1] as (req: Request, res: Response) => Promise<void>;

    await handler(mockRequest as Request, mockResponse as Response);

    expect(consoleErrorSpy).toHaveBeenCalledWith("Unexpected error in blob ingestion endpoint:", expect.any(Error));
    expect(statusMock).toHaveBeenCalledWith(500);
    expect(jsonMock).toHaveBeenCalledWith({
      success: false,
      message: "Internal server error"
    });
  });

  it("should calculate raw body size correctly", async () => {
    const { processBlobIngestion } = await import("../../blob-ingestion/repository/service.js");

    vi.mocked(processBlobIngestion).mockResolvedValue({
      success: true,
      artefact_id: "test-artefact-123",
      message: "Blob ingestion successful"
    });

    const handlers = POST;
    const handler = handlers[1] as (req: Request, res: Response) => Promise<void>;

    await handler(mockRequest as Request, mockResponse as Response);

    const expectedSize = JSON.stringify(mockRequest.body).length;
    expect(processBlobIngestion).toHaveBeenCalledWith(mockRequest.body as BlobIngestionRequest, expectedSize);
  });

  it("should handle no_match scenario", async () => {
    const { processBlobIngestion } = await import("../../blob-ingestion/repository/service.js");

    vi.mocked(processBlobIngestion).mockResolvedValue({
      success: false,
      no_match: true,
      message: "Court not found"
    });

    const handlers = POST;
    const handler = handlers[1] as (req: Request, res: Response) => Promise<void>;

    await handler(mockRequest as Request, mockResponse as Response);

    expect(statusMock).toHaveBeenCalledWith(500);
    expect(jsonMock).toHaveBeenCalledWith({
      success: false,
      no_match: true,
      message: "Court not found"
    });
  });
});
