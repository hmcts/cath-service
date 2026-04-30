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

vi.mock("@hmcts/pdda-html-upload", () => ({
  validatePddaHtmlUpload: vi.fn(),
  uploadHtmlToS3: vi.fn()
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
      headers: {
        "content-length": "277"
      },
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
    vi.spyOn(console, "info").mockImplementation(() => {});
  });

  it("should return 201 and artefact_id when blob ingestion is successful", async () => {
    const { processBlobIngestion } = await import("../../blob-ingestion/repository/service.js");

    vi.mocked(processBlobIngestion).mockResolvedValue({
      success: true,
      artefact_id: "test-artefact-123",
      message: "Blob ingestion successful"
    });

    const handlers = POST;
    const handler = handlers[2] as (req: Request, res: Response) => Promise<void>;

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
    const handler = handlers[2] as (req: Request, res: Response) => Promise<void>;

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
    const handler = handlers[2] as (req: Request, res: Response) => Promise<void>;

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
    const handler = handlers[2] as (req: Request, res: Response) => Promise<void>;

    await handler(mockRequest as Request, mockResponse as Response);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Unexpected error in publication endpoint:",
      expect.objectContaining({
        name: expect.any(String),
        message: expect.any(String)
      })
    );
    expect(statusMock).toHaveBeenCalledWith(500);
    expect(jsonMock).toHaveBeenCalledWith({
      success: false,
      message: "Internal server error",
      correlation_id: undefined
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
    const handler = handlers[2] as (req: Request, res: Response) => Promise<void>;

    await handler(mockRequest as Request, mockResponse as Response);

    // Should use Content-Length header value
    const expectedSize = 277;
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
    const handler = handlers[2] as (req: Request, res: Response) => Promise<void>;

    await handler(mockRequest as Request, mockResponse as Response);

    expect(statusMock).toHaveBeenCalledWith(200);
    expect(jsonMock).toHaveBeenCalledWith({
      success: false,
      no_match: true,
      message: "Court not found"
    });
  });

  describe("HTML file upload (multipart/form-data)", () => {
    let mockMultipartRequest: Partial<Request>;

    beforeEach(() => {
      mockMultipartRequest = {
        headers: {
          "content-type": "multipart/form-data; boundary=----WebKitFormBoundary",
          "x-correlation-id": "test-correlation-id"
        },
        body: {
          type: "LCSU"
        },
        file: {
          fieldname: "file",
          originalname: "test.html",
          encoding: "7bit",
          mimetype: "text/html",
          buffer: Buffer.from("<html></html>"),
          size: 100,
          stream: null as any,
          destination: "",
          filename: "",
          path: ""
        }
      };
    });

    it("should return 201 on successful HTML upload", async () => {
      const { validatePddaHtmlUpload, uploadHtmlToS3 } = await import("@hmcts/pdda-html-upload");

      vi.mocked(validatePddaHtmlUpload).mockReturnValue({ valid: true });
      vi.mocked(uploadHtmlToS3).mockResolvedValue({
        success: true,
        s3Key: "pdda-html/2026/02/11/uuid.html",
        bucketName: "test-bucket"
      });

      const handlers = POST;
      const handler = handlers[2] as (req: Request, res: Response) => Promise<void>;

      await handler(mockMultipartRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        message: "Upload accepted and stored",
        s3_key: "pdda-html/2026/02/11/uuid.html",
        correlation_id: "test-correlation-id"
      });
    });

    it("should return 400 when HTML validation fails", async () => {
      const { validatePddaHtmlUpload } = await import("@hmcts/pdda-html-upload");

      vi.mocked(validatePddaHtmlUpload).mockReturnValue({
        valid: false,
        error: "The uploaded file must be an HTM or HTML file"
      });

      const handlers = POST;
      const handler = handlers[2] as (req: Request, res: Response) => Promise<void>;

      await handler(mockMultipartRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: "The uploaded file must be an HTM or HTML file",
        correlation_id: "test-correlation-id"
      });
    });

    it("should return 400 when type is not LCSU", async () => {
      mockMultipartRequest.body = { type: "JSON" };

      const { validatePddaHtmlUpload } = await import("@hmcts/pdda-html-upload");

      vi.mocked(validatePddaHtmlUpload).mockReturnValue({
        valid: false,
        error: "ArtefactType must be LCSU for HTM/HTML uploads"
      });

      const handlers = POST;
      const handler = handlers[2] as (req: Request, res: Response) => Promise<void>;

      await handler(mockMultipartRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: "ArtefactType must be LCSU for HTM/HTML uploads",
        correlation_id: "test-correlation-id"
      });
    });

    it("should return 500 when S3 upload fails", async () => {
      const { validatePddaHtmlUpload, uploadHtmlToS3 } = await import("@hmcts/pdda-html-upload");

      vi.mocked(validatePddaHtmlUpload).mockReturnValue({ valid: true });
      vi.mocked(uploadHtmlToS3).mockRejectedValue(new Error("S3 upload failed"));

      const handlers = POST;
      const handler = handlers[2] as (req: Request, res: Response) => Promise<void>;

      await handler(mockMultipartRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: "Internal server error",
        correlation_id: "test-correlation-id"
      });
    });

    it("should work without correlation ID", async () => {
      mockMultipartRequest.headers = {
        "content-type": "multipart/form-data; boundary=----WebKitFormBoundary"
      };

      const { validatePddaHtmlUpload, uploadHtmlToS3 } = await import("@hmcts/pdda-html-upload");

      vi.mocked(validatePddaHtmlUpload).mockReturnValue({ valid: true });
      vi.mocked(uploadHtmlToS3).mockResolvedValue({
        success: true,
        s3Key: "pdda-html/2026/02/11/uuid.html",
        bucketName: "test-bucket"
      });

      const handlers = POST;
      const handler = handlers[2] as (req: Request, res: Response) => Promise<void>;

      await handler(mockMultipartRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        message: "Upload accepted and stored",
        s3_key: "pdda-html/2026/02/11/uuid.html",
        correlation_id: undefined
      });
    });
  });
});
