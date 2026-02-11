import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./pdda-html.js";

vi.mock("@hmcts/blob-ingestion", () => ({
  authenticateApi: vi.fn(() => (_req: Request, _res: Response, next: () => void) => next())
}));

vi.mock("../../validation/file-validation.js", () => ({
  validatePddaHtmlUpload: vi.fn()
}));

vi.mock("../../s3/s3-upload-service.js", () => ({
  uploadHtmlToS3: vi.fn()
}));

describe("POST /api/v1/pdda-html", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockJson: ReturnType<typeof vi.fn>;
  let mockStatus: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockJson = vi.fn();
    mockStatus = vi.fn().mockReturnThis();

    mockRequest = {
      body: { artefact_type: "LCSU" },
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
      },
      headers: {
        "x-correlation-id": "test-correlation-id"
      }
    };

    mockResponse = {
      json: mockJson,
      status: mockStatus
    };
  });

  it("should return 201 on successful upload", async () => {
    const { validatePddaHtmlUpload } = await import("../../validation/file-validation.js");
    const { uploadHtmlToS3 } = await import("../../s3/s3-upload-service.js");

    vi.mocked(validatePddaHtmlUpload).mockReturnValue({ valid: true });
    vi.mocked(uploadHtmlToS3).mockResolvedValue({
      success: true,
      s3Key: "pdda-html/2026/02/11/uuid.html",
      bucketName: "test-bucket"
    });

    const handler = POST[POST.length - 1];
    await handler(mockRequest as Request, mockResponse as Response, vi.fn());

    expect(mockStatus).toHaveBeenCalledWith(201);
    expect(mockJson).toHaveBeenCalledWith({
      success: true,
      message: "Upload accepted and stored",
      s3_key: "pdda-html/2026/02/11/uuid.html",
      correlation_id: "test-correlation-id"
    });
  });

  it("should return 400 when validation fails", async () => {
    const { validatePddaHtmlUpload } = await import("../../validation/file-validation.js");

    vi.mocked(validatePddaHtmlUpload).mockReturnValue({
      valid: false,
      error: "The uploaded file must be an HTM or HTML file"
    });

    const handler = POST[POST.length - 1];
    await handler(mockRequest as Request, mockResponse as Response, vi.fn());

    expect(mockStatus).toHaveBeenCalledWith(400);
    expect(mockJson).toHaveBeenCalledWith({
      success: false,
      message: "The uploaded file must be an HTM or HTML file",
      correlation_id: "test-correlation-id"
    });
  });

  it("should return 400 when artefact_type is not LCSU", async () => {
    mockRequest.body = { artefact_type: "JSON" };

    const { validatePddaHtmlUpload } = await import("../../validation/file-validation.js");

    vi.mocked(validatePddaHtmlUpload).mockReturnValue({
      valid: false,
      error: "ArtefactType must be LCSU for HTM/HTML uploads"
    });

    const handler = POST[POST.length - 1];
    await handler(mockRequest as Request, mockResponse as Response, vi.fn());

    expect(mockStatus).toHaveBeenCalledWith(400);
    expect(mockJson).toHaveBeenCalledWith({
      success: false,
      message: "ArtefactType must be LCSU for HTM/HTML uploads",
      correlation_id: "test-correlation-id"
    });
  });

  it("should return 400 when file is missing", async () => {
    mockRequest.file = undefined;

    const { validatePddaHtmlUpload } = await import("../../validation/file-validation.js");

    vi.mocked(validatePddaHtmlUpload).mockReturnValue({
      valid: false,
      error: "Select an HTM or HTML file to upload"
    });

    const handler = POST[POST.length - 1];
    await handler(mockRequest as Request, mockResponse as Response, vi.fn());

    expect(mockStatus).toHaveBeenCalledWith(400);
    expect(mockJson).toHaveBeenCalledWith({
      success: false,
      message: "Select an HTM or HTML file to upload",
      correlation_id: "test-correlation-id"
    });
  });

  it("should return 500 when S3 upload fails", async () => {
    const { validatePddaHtmlUpload } = await import("../../validation/file-validation.js");
    const { uploadHtmlToS3 } = await import("../../s3/s3-upload-service.js");

    vi.mocked(validatePddaHtmlUpload).mockReturnValue({ valid: true });
    vi.mocked(uploadHtmlToS3).mockRejectedValue(new Error("The file could not be uploaded to storage. Try again."));

    const handler = POST[POST.length - 1];
    await handler(mockRequest as Request, mockResponse as Response, vi.fn());

    expect(mockStatus).toHaveBeenCalledWith(500);
    expect(mockJson).toHaveBeenCalledWith({
      success: false,
      message: "The file could not be uploaded to storage. Try again.",
      correlation_id: "test-correlation-id"
    });
  });

  it("should pass correlation ID to S3 upload service", async () => {
    const { validatePddaHtmlUpload } = await import("../../validation/file-validation.js");
    const { uploadHtmlToS3 } = await import("../../s3/s3-upload-service.js");

    vi.mocked(validatePddaHtmlUpload).mockReturnValue({ valid: true });
    vi.mocked(uploadHtmlToS3).mockResolvedValue({
      success: true,
      s3Key: "pdda-html/2026/02/11/uuid.html",
      bucketName: "test-bucket"
    });

    const handler = POST[POST.length - 1];
    await handler(mockRequest as Request, mockResponse as Response, vi.fn());

    expect(uploadHtmlToS3).toHaveBeenCalledWith(mockRequest.file?.buffer, "test.html", "test-correlation-id");
  });

  it("should work without correlation ID", async () => {
    mockRequest.headers = {};

    const { validatePddaHtmlUpload } = await import("../../validation/file-validation.js");
    const { uploadHtmlToS3 } = await import("../../s3/s3-upload-service.js");

    vi.mocked(validatePddaHtmlUpload).mockReturnValue({ valid: true });
    vi.mocked(uploadHtmlToS3).mockResolvedValue({
      success: true,
      s3Key: "pdda-html/2026/02/11/uuid.html",
      bucketName: "test-bucket"
    });

    const handler = POST[POST.length - 1];
    await handler(mockRequest as Request, mockResponse as Response, vi.fn());

    expect(mockStatus).toHaveBeenCalledWith(201);
    expect(mockJson).toHaveBeenCalledWith({
      success: true,
      message: "Upload accepted and stored",
      s3_key: "pdda-html/2026/02/11/uuid.html",
      correlation_id: undefined
    });
  });
});
