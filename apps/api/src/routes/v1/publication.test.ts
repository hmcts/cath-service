import type { Request, Response } from "express";
import multer from "multer";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./publication.js";

vi.mock("@hmcts/blob-ingestion", async () => {
  const actual = await vi.importActual<typeof import("@hmcts/blob-ingestion")>("@hmcts/blob-ingestion");
  return {
    ...actual,
    authenticateApi: vi.fn(() => (_req: Request, _res: Response, next: () => void) => next()),
    processBlobIngestion: vi.fn(),
    processFlatFileBlobIngestion: vi.fn(),
    validatePublicationMetadata: vi.fn(),
    logIngestionResult: vi.fn()
  };
});

vi.mock("@hmcts/pdda-html-upload", () => ({
  validatePddaHtmlUpload: vi.fn(),
  uploadHtmlToS3: vi.fn()
}));

const { processBlobIngestion, processFlatFileBlobIngestion, validatePublicationMetadata, logIngestionResult } = await import("@hmcts/blob-ingestion");
const { uploadHtmlToS3, validatePddaHtmlUpload } = await import("@hmcts/pdda-html-upload");

const VALID_HEADERS = {
  "x-provenance": "SNL",
  "x-court-id": "1",
  "x-content-date": "2026-09-14T00:00:00.000Z",
  "x-list-type": "CIVIL_AND_FAMILY_DAILY_CAUSE_LIST",
  "x-language": "ENGLISH",
  "x-type": "LIST"
};

const CREATED_ARTEFACT = {
  artefactId: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  contentDate: "2026-09-14T00:00:00.000Z",
  displayFrom: null,
  displayTo: null,
  isFlatFile: false,
  language: "ENGLISH",
  listType: "CIVIL_AND_FAMILY_DAILY_CAUSE_LIST",
  locationId: "1",
  payload: "https://account.blob.core.windows.net/artefact/3fa85f64",
  provenance: "SNL",
  sensitivity: "PUBLIC",
  sourceArtefactId: null,
  type: "LIST"
};

function multerFile(overrides: Partial<Express.Multer.File> = {}): Express.Multer.File {
  return {
    fieldname: "file",
    originalname: "list.html",
    encoding: "7bit",
    mimetype: "text/html",
    buffer: Buffer.from("<html></html>"),
    size: 100,
    stream: null as any,
    destination: "",
    filename: "",
    path: "",
    ...overrides
  };
}

describe("POST /publication", () => {
  let statusMock: ReturnType<typeof vi.fn>;
  let jsonMock: ReturnType<typeof vi.fn>;
  let mockResponse: Partial<Response>;

  const handler = () => {
    const handlers = Array.isArray(POST) ? POST : [POST];
    return handlers[handlers.length - 1] as (req: Request, res: Response) => Promise<void>;
  };

  const jsonRequest = (headers: Record<string, string> = {}, body: unknown = { courtLists: [] }): Partial<Request> => ({
    headers: { "content-type": "application/json", "content-length": "42", ...VALID_HEADERS, ...headers },
    body
  });

  const multipartRequest = (headers: Record<string, string> = {}, file: Express.Multer.File | null = multerFile()): Partial<Request> =>
    ({
      headers: { "content-type": "multipart/form-data; boundary=x", ...VALID_HEADERS, ...headers },
      body: {},
      file: file ?? undefined
    }) as Partial<Request>;

  beforeEach(() => {
    vi.clearAllMocks();

    statusMock = vi.fn().mockReturnThis();
    jsonMock = vi.fn();
    mockResponse = { status: statusMock, json: jsonMock };

    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});

    vi.mocked(processBlobIngestion).mockResolvedValue({ outcome: "CREATED", artefact: CREATED_ARTEFACT });
    vi.mocked(processFlatFileBlobIngestion).mockResolvedValue({ outcome: "CREATED", artefact: { ...CREATED_ARTEFACT, isFlatFile: true } });
    vi.mocked(validatePublicationMetadata).mockResolvedValue({ isValid: true, errors: [], listTypeId: 1, resolvedLocationId: "1" });
    vi.mocked(validatePddaHtmlUpload).mockReturnValue({ valid: true });
    vi.mocked(uploadHtmlToS3).mockResolvedValue({ success: true, s3Key: "pdda-html/list.html", bucketName: "bucket" });
  });

  describe("JSON publication", () => {
    it("should return 201 with the Artefact body when the payload is accepted", async () => {
      // Arrange
      const req = jsonRequest();

      // Act
      await handler()(req as Request, mockResponse as Response);

      // Assert
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith(CREATED_ARTEFACT);
    });

    // The incumbent skips its master-schema layer for these list types
    // (PublicationControllerTest#shouldNotValidateMasterSchemaForMagistratesAdultCourtLists).
    // We have no master schema — validation is per list type — so the behaviour to hold is
    // simply that every one of them is accepted on the JSON path.
    it.each([
      ["MAGISTRATES_ADULT_COURT_LIST_DAILY"],
      ["MAGISTRATES_ADULT_COURT_LIST_FUTURE"],
      ["MAGISTRATES_PUBLIC_ADULT_COURT_LIST_DAILY"],
      ["MAGISTRATES_PUBLIC_ADULT_COURT_LIST_FUTURE"],
      ["CROWN_DAILY_PDDA_LIST"],
      ["CROWN_FIRM_PDDA_LIST"],
      ["CROWN_WARNED_PDDA_LIST"]
    ])("should accept a JSON publication for %s", async (listType) => {
      // Arrange
      const req = jsonRequest({ "x-list-type": listType });

      // Act
      await handler()(req as Request, mockResponse as Response);

      // Assert
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(processBlobIngestion).toHaveBeenCalledWith(expect.objectContaining({ listType }), expect.anything(), 42);
    });

    it("should pass the raw body through as the payload with no hearing_list wrapper", async () => {
      // Arrange
      const payload = [{ courtLists: [] }];
      const req = jsonRequest({}, payload);

      // Act
      await handler()(req as Request, mockResponse as Response);

      // Assert
      expect(processBlobIngestion).toHaveBeenCalledWith(expect.objectContaining({ provenance: "SNL", courtId: "1" }), payload, 42);
    });

    it("should accept a request that omits every optional header and default sensitivity to PUBLIC", async () => {
      // Arrange
      const req = jsonRequest();

      // Act
      await handler()(req as Request, mockResponse as Response);

      // Assert
      expect(processBlobIngestion).toHaveBeenCalledWith(
        expect.objectContaining({ sensitivity: "PUBLIC", displayFrom: null, displayTo: null, sourceArtefactId: null }),
        expect.anything(),
        expect.any(Number)
      );
      expect(statusMock).toHaveBeenCalledWith(201);
    });

    it("should return 400 with a Message body when the payload fails validation", async () => {
      // Arrange
      vi.mocked(processBlobIngestion).mockResolvedValue({
        outcome: "VALIDATION_ERROR",
        message: "body must have required property 'courtLists'",
        errors: [{ field: "body", message: "body must have required property 'courtLists'" }]
      });

      // Act
      await handler()(jsonRequest() as Request, mockResponse as Response);

      // Assert
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ message: "body must have required property 'courtLists'", timestamp: expect.any(String) });
    });

    it("should return 409 when the ingestion reports a conflict", async () => {
      // Arrange
      vi.mocked(processBlobIngestion).mockResolvedValue({ outcome: "CONFLICT", message: "already being created" });

      // Act
      await handler()(jsonRequest() as Request, mockResponse as Response);

      // Assert
      expect(statusMock).toHaveBeenCalledWith(409);
      expect(jsonMock).toHaveBeenCalledWith({ message: "already being created", timestamp: expect.any(String) });
    });

    it("should return 500 with a Message body when the ingestion errors", async () => {
      // Arrange
      vi.mocked(processBlobIngestion).mockResolvedValue({ outcome: "ERROR", message: "Internal server error during ingestion" });

      // Act
      await handler()(jsonRequest() as Request, mockResponse as Response);

      // Assert
      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ message: "Internal server error during ingestion", timestamp: expect.any(String) });
    });

    it("should return 500 with a Message body when the ingestion throws", async () => {
      // Arrange
      vi.mocked(processBlobIngestion).mockRejectedValue(new Error("boom"));

      // Act
      await handler()(jsonRequest() as Request, mockResponse as Response);

      // Assert
      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ message: "Internal server error", timestamp: expect.any(String) });
    });

    it("should fall back to the serialised body length when content-length is absent", async () => {
      // Arrange
      const req = jsonRequest();
      delete (req.headers as Record<string, unknown>)["content-length"];

      // Act
      await handler()(req as Request, mockResponse as Response);

      // Assert
      expect(processBlobIngestion).toHaveBeenCalledWith(expect.anything(), { courtLists: [] }, Buffer.byteLength('{"courtLists":[]}', "utf8"));
    });
  });

  describe("header validation", () => {
    it.each([["x-provenance"], ["x-court-id"], ["x-content-date"], ["x-list-type"], ["x-language"], ["x-type"]])(
      "should return 400 with a Message body when %s is missing",
      async (header) => {
        // Arrange
        const req = jsonRequest();
        delete (req.headers as Record<string, unknown>)[header];

        // Act
        await handler()(req as Request, mockResponse as Response);

        // Assert
        expect(statusMock).toHaveBeenCalledWith(400);
        expect(jsonMock).toHaveBeenCalledWith({ message: expect.stringContaining(`${header} is required`), timestamp: expect.any(String) });
        expect(processBlobIngestion).not.toHaveBeenCalled();
      }
    );

    it("should return 400 without treating an unrecognised x-type as LIST", async () => {
      // Act
      await handler()(jsonRequest({ "x-type": "FOO" }) as Request, mockResponse as Response);

      // Assert
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ message: "x-type must be one of LIST, LCSU", timestamp: expect.any(String) });
      expect(processBlobIngestion).not.toHaveBeenCalled();
      expect(processFlatFileBlobIngestion).not.toHaveBeenCalled();
      expect(uploadHtmlToS3).not.toHaveBeenCalled();
    });

    it("should reject LCSU sent as application/json", async () => {
      // Act
      await handler()(jsonRequest({ "x-type": "LCSU" }) as Request, mockResponse as Response);

      // Assert
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ message: "LCSU publications must be sent as multipart/form-data", timestamp: expect.any(String) });
      expect(uploadHtmlToS3).not.toHaveBeenCalled();
    });
  });

  describe("flat file publication", () => {
    it("should return 201 with isFlatFile true and never call S3", async () => {
      // Act
      await handler()(multipartRequest({}, multerFile({ originalname: "list.pdf" })) as Request, mockResponse as Response);

      // Assert
      expect(processFlatFileBlobIngestion).toHaveBeenCalledTimes(1);
      expect(uploadHtmlToS3).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ isFlatFile: true }));
    });

    it("should return 400 when no file part is provided", async () => {
      // Act
      await handler()(multipartRequest({}, null) as Request, mockResponse as Response);

      // Assert
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        message: "No file provided. Include a file in the 'file' field of the multipart form.",
        timestamp: expect.any(String)
      });
      expect(processFlatFileBlobIngestion).not.toHaveBeenCalled();
    });

    it("should ignore a type form field and still ingest as a flat file", async () => {
      // Arrange
      const req = multipartRequest();
      req.body = { type: "LCSU" };

      // Act
      await handler()(req as Request, mockResponse as Response);

      // Assert
      expect(processFlatFileBlobIngestion).toHaveBeenCalledTimes(1);
      expect(uploadHtmlToS3).not.toHaveBeenCalled();
    });
  });

  describe("LCSU upload", () => {
    it("should upload to S3 and return 201 with a blank artefactId", async () => {
      // Act
      await handler()(multipartRequest({ "x-type": "LCSU" }) as Request, mockResponse as Response);

      // Assert
      expect(uploadHtmlToS3).toHaveBeenCalledWith(Buffer.from("<html></html>"), "list.html", undefined);
      expect(processFlatFileBlobIngestion).not.toHaveBeenCalled();
      expect(processBlobIngestion).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ artefactId: "", type: "LCSU" }));
    });

    it("should not include a payload or search in the LCSU response", async () => {
      // Act
      await handler()(multipartRequest({ "x-type": "LCSU" }) as Request, mockResponse as Response);

      // Assert
      const body = jsonMock.mock.calls[0][0];
      expect(body).not.toHaveProperty("payload");
      expect(body).not.toHaveProperty("search");
    });

    // The incumbent builds the LCSU metadata with the flat-file flag set even though the file
    // goes to S3 rather than blob storage — PublicationTest#testPublicationEndpointWithHtml-
    // FileUploadToS3Bucket asserts getIsFlatFile() is true.
    it("should report isFlatFile true in the LCSU response", async () => {
      // Act
      await handler()(multipartRequest({ "x-type": "LCSU" }) as Request, mockResponse as Response);

      // Assert
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ isFlatFile: true }));
    });

    // The incumbent's functional test uploads LCSU with no x-list-type at all.
    it("should accept an LCSU upload that omits x-list-type", async () => {
      // Arrange
      const req = multipartRequest({ "x-type": "LCSU" });
      delete (req.headers as Record<string, unknown>)["x-list-type"];

      // Act
      await handler()(req as Request, mockResponse as Response);

      // Assert
      expect(statusMock).toHaveBeenCalledWith(201);
      expect(uploadHtmlToS3).toHaveBeenCalled();
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ listType: null, type: "LCSU" }));
    });

    it("should surface a 500 when the S3 upload fails", async () => {
      // Arrange
      vi.mocked(uploadHtmlToS3).mockRejectedValue(new Error("Failed to upload file"));

      // Act
      await handler()(multipartRequest({ "x-type": "LCSU" }) as Request, mockResponse as Response);

      // Assert
      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({ message: "Internal server error", timestamp: expect.any(String) });
      expect(logIngestionResult).not.toHaveBeenCalled();
    });

    it("should write an ingestion log for traceability", async () => {
      // Act
      await handler()(multipartRequest({ "x-type": "LCSU" }) as Request, mockResponse as Response);

      // Assert
      expect(logIngestionResult).toHaveBeenCalledWith({ sourceSystem: "SNL", courtId: "1", status: "SUCCESS" });
    });

    it("should pass the correlation id through to S3", async () => {
      // Act
      await handler()(multipartRequest({ "x-type": "LCSU", "x-correlation-id": "corr-1" }) as Request, mockResponse as Response);

      // Assert
      expect(uploadHtmlToS3).toHaveBeenCalledWith(expect.any(Buffer), "list.html", "corr-1");
    });

    it("should reject a missing required header before any S3 upload", async () => {
      // Arrange
      const req = multipartRequest({ "x-type": "LCSU" });
      delete (req.headers as Record<string, unknown>)["x-court-id"];

      // Act
      await handler()(req as Request, mockResponse as Response);

      // Assert
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(uploadHtmlToS3).not.toHaveBeenCalled();
      expect(validatePddaHtmlUpload).not.toHaveBeenCalled();
    });

    it("should reject a non-HTML file with the unsupported format message and no S3 upload", async () => {
      // Arrange
      vi.mocked(validatePddaHtmlUpload).mockReturnValue({ valid: false, error: "File format is not supported for LCSU." });

      // Act
      await handler()(multipartRequest({ "x-type": "LCSU" }, multerFile({ originalname: "list.pdf" })) as Request, mockResponse as Response);

      // Assert
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ message: "File format is not supported for LCSU.", timestamp: expect.any(String) });
      expect(uploadHtmlToS3).not.toHaveBeenCalled();
    });

    it("should reject invalid metadata before any S3 upload", async () => {
      // Arrange
      vi.mocked(validatePublicationMetadata).mockResolvedValue({
        isValid: false,
        errors: [{ field: "x-list-type", message: "Invalid x-list-type. Allowed values: A, B" }]
      });

      // Act
      await handler()(multipartRequest({ "x-type": "LCSU" }) as Request, mockResponse as Response);

      // Assert
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ message: "Invalid x-list-type. Allowed values: A, B", timestamp: expect.any(String) });
      expect(uploadHtmlToS3).not.toHaveBeenCalled();
    });
  });

  describe("one endpoint, three modes", () => {
    it("should serve JSON, flat file and LCSU from the same exported handler", async () => {
      // Arrange
      const route = handler();

      // Act
      await route(jsonRequest() as Request, mockResponse as Response);
      await route(multipartRequest() as Request, mockResponse as Response);
      await route(multipartRequest({ "x-type": "LCSU" }) as Request, mockResponse as Response);

      // Assert
      expect(processBlobIngestion).toHaveBeenCalledTimes(1);
      expect(processFlatFileBlobIngestion).toHaveBeenCalledTimes(1);
      expect(uploadHtmlToS3).toHaveBeenCalledTimes(1);
      expect(statusMock.mock.calls.map(([code]) => code)).toEqual([201, 201, 201]);
    });
  });

  describe("multipart middleware", () => {
    const multerMiddleware = () => (POST as unknown as ((req: Request, res: Response, next: (error?: unknown) => void) => void)[])[1];

    it("should skip multer for non-multipart requests", () => {
      // Arrange
      const next = vi.fn();

      // Act
      multerMiddleware()(jsonRequest() as Request, mockResponse as Response, next);

      // Assert
      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith();
    });

    it("should translate a multer error into a 400 Message rather than letting it reach the app-level 500", async () => {
      // Arrange — a multer failure (e.g. the file size limit) must not reach the app-level 500 handler
      vi.resetModules();
      const limitError = new multer.MulterError("LIMIT_FILE_SIZE", "file");
      vi.doMock("multer", () => {
        const mockMulter = () => ({ single: () => (_req: Request, _res: Response, cb: (error: unknown) => void) => cb(limitError) });
        mockMulter.memoryStorage = () => ({});
        mockMulter.MulterError = multer.MulterError;
        return { default: mockMulter };
      });
      const { POST: postWithFailingMulter } = await import("./publication.js");
      const middleware = (postWithFailingMulter as unknown as ((req: Request, res: Response, next: (error?: unknown) => void) => void)[])[1];
      const next = vi.fn();

      // Act
      middleware(multipartRequest() as Request, mockResponse as Response, next);

      // Assert
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ message: "File too large", timestamp: expect.any(String) });
      expect(next).not.toHaveBeenCalled();
      vi.doUnmock("multer");
      vi.resetModules();
    });
  });
});
