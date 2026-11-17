import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PushBody } from "./push/http-client.js";
import { sendThirdPartyDeletion, sendThirdPartyPublications } from "./service.js";

const mockPushLogCreate = vi.hoisted(() => vi.fn());
const mockBuildPushHeaders = vi.hoisted(() => vi.fn());

vi.mock("@hmcts/location", () => ({
  getLocationWithDetails: vi.fn()
}));

vi.mock("@hmcts/postgres-prisma", () => ({
  prisma: {
    thirdPartyPushLog: {
      create: mockPushLogCreate
    }
  }
}));

vi.mock("./push/headers.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./push/headers.js")>()),
  buildPushHeaders: mockBuildPushHeaders
}));

vi.mock("./push/retry.js", () => ({
  pushWithRetry: vi.fn()
}));

vi.mock("./queries.js", () => ({
  findSubscribersByListType: vi.fn()
}));

const { getLocationWithDetails } = await import("@hmcts/location");
const { pushWithRetry } = await import("./push/retry.js");
const { findSubscribersByListType } = await import("./queries.js");

const BASE_HEADERS = { "x-provenance": "MANUAL_UPLOAD", "x-source-artefact-id": "source-1", "x-type": "LIST" };
const LOCATION = { locationId: 1, name: "Test Court", welshName: "Llys Prawf", regions: [], subJurisdictions: [] };
const JSON_DATA = { document: { publicationDate: "2024-01-01" } };
const PDF = Buffer.from("%PDF-1.4 english rendering");
const COURTEL_MAX_PDF_BYTES = 2_000_000;

const ARTEFACT_FIELDS = { sourceArtefactId: "source-1", type: "LIST" };

const COMMON_PARAMS = {
  artefactId: "artefact-1",
  locationId: "1",
  listTypeId: 10,
  contentDate: new Date("2024-01-01"),
  sensitivity: "PUBLIC",
  language: "ENGLISH",
  displayFrom: new Date("2024-01-01"),
  displayTo: new Date("2024-12-31"),
  provenance: "MANUAL_UPLOAD"
};

const BASE_PARAMS = {
  ...COMMON_PARAMS,
  isUpdate: false,
  loadArtefactFields: () => Promise.resolve(ARTEFACT_FIELDS)
};

const DELETION_PARAMS = { ...COMMON_PARAMS, ...ARTEFACT_FIELDS };

function pushCall(index: number) {
  const [url, certPem, headers, body, logPrefix] = vi.mocked(pushWithRetry).mock.calls[index];
  return { url, certPem, headers, body: body as PushBody | null, logPrefix };
}

function multipartText(body: PushBody | null): string {
  return body?.buffer.toString("binary") ?? "";
}

function loggedRows() {
  return mockPushLogCreate.mock.calls.map(([args]) => args.data);
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(getLocationWithDetails).mockResolvedValue(LOCATION);
  mockBuildPushHeaders.mockResolvedValue(BASE_HEADERS);
  vi.mocked(pushWithRetry).mockResolvedValue({ statusCode: 201, success: true });
  vi.mocked(findSubscribersByListType).mockResolvedValue([{ id: "sub-1", user: { id: "user-1", name: "courtel" } }] as never);
  mockPushLogCreate.mockResolvedValue({});
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  process.env.COURTEL_API_URL = "https://courtel.example.com/api";
  process.env.COURTEL_CERTIFICATE = Buffer.from("-----BEGIN CERTIFICATE-----\ntest\n-----END CERTIFICATE-----").toString("base64");
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("sendThirdPartyPublications", () => {
  describe("when the push is skipped", () => {
    it("should return skipped without loading files if COURTEL_API_URL is not set", async () => {
      // Arrange
      delete process.env.COURTEL_API_URL;
      const loadFiles = vi.fn();

      // Act
      const outcome = await sendThirdPartyPublications({ ...BASE_PARAMS, jsonData: JSON_DATA, loadFiles });

      // Assert
      expect(outcome).toBe("skipped");
      expect(loadFiles).not.toHaveBeenCalled();
      expect(pushWithRetry).not.toHaveBeenCalled();
    });

    it("should return skipped if COURTEL_CERTIFICATE is not set", async () => {
      // Arrange
      delete process.env.COURTEL_CERTIFICATE;

      // Act
      const outcome = await sendThirdPartyPublications({ ...BASE_PARAMS, jsonData: JSON_DATA });

      // Assert
      expect(outcome).toBe("skipped");
      expect(pushWithRetry).not.toHaveBeenCalled();
    });

    it("should return skipped without loading files if there are no subscribers for the list type", async () => {
      // Arrange
      vi.mocked(findSubscribersByListType).mockResolvedValue([]);
      const loadFiles = vi.fn();

      // Act
      const outcome = await sendThirdPartyPublications({ ...BASE_PARAMS, jsonData: JSON_DATA, loadFiles });

      // Assert
      expect(outcome).toBe("skipped");
      expect(loadFiles).not.toHaveBeenCalled();
      expect(pushWithRetry).not.toHaveBeenCalled();
    });

    it.each([
      {
        description: "COURTEL_API_URL is not set",
        arrange: () => {
          delete process.env.COURTEL_API_URL;
        }
      },
      { description: "there are no subscribers", arrange: () => vi.mocked(findSubscribersByListType).mockResolvedValue([]) }
    ])("should not read the artefact row when $description", async ({ arrange }) => {
      // Arrange
      arrange();
      const loadArtefactFields = vi.fn().mockResolvedValue(ARTEFACT_FIELDS);

      // Act
      const outcome = await sendThirdPartyPublications({ ...BASE_PARAMS, jsonData: JSON_DATA, loadArtefactFields });

      // Assert
      expect(outcome).toBe("skipped");
      expect(loadArtefactFields).not.toHaveBeenCalled();
    });
  });

  describe("when the artefact row is missing", () => {
    it("should return failed without loading files or sending anything", async () => {
      // Arrange
      const loadFiles = vi.fn();

      // Act
      const outcome = await sendThirdPartyPublications({
        ...BASE_PARAMS,
        jsonData: JSON_DATA,
        loadArtefactFields: () => Promise.resolve(null),
        loadFiles
      });

      // Assert
      expect(outcome).toBe("failed");
      expect(loadFiles).not.toHaveBeenCalled();
      expect(pushWithRetry).not.toHaveBeenCalled();
      expect(console.error).toHaveBeenCalledWith("[ThirdParty] Third-party push failed: artefact not found for artefactId artefact-1");
    });
  });

  describe("headers", () => {
    it("should build the headers from the params and the location", async () => {
      // Act
      await sendThirdPartyPublications({ ...BASE_PARAMS, jsonData: JSON_DATA });

      // Assert
      expect(getLocationWithDetails).toHaveBeenCalledWith(1);
      expect(mockBuildPushHeaders).toHaveBeenCalledWith({
        artefactId: "artefact-1",
        sourceArtefactId: "source-1",
        type: "LIST",
        listTypeId: 10,
        contentDate: BASE_PARAMS.contentDate,
        sensitivity: "PUBLIC",
        language: "ENGLISH",
        displayFrom: BASE_PARAMS.displayFrom,
        displayTo: BASE_PARAMS.displayTo,
        provenance: "MANUAL_UPLOAD",
        location: LOCATION
      });
    });

    it("should decode the certificate from base64", async () => {
      // Act
      await sendThirdPartyPublications({ ...BASE_PARAMS, jsonData: JSON_DATA });

      // Assert
      expect(pushCall(0).url).toBe("https://courtel.example.com/api");
      expect(pushCall(0).certPem).toContain("BEGIN CERTIFICATE");
    });
  });

  describe("JSON publication with a PDF (TS1)", () => {
    it("should send the JSON then a single-file PDF multipart, with CATH provenance only on the PDF", async () => {
      // Arrange
      const loadFiles = vi.fn().mockResolvedValue({ pdf: PDF });

      // Act
      const outcome = await sendThirdPartyPublications({ ...BASE_PARAMS, jsonData: JSON_DATA, loadFiles });

      // Assert
      expect(outcome).toBe("sent");
      expect(pushWithRetry).toHaveBeenCalledTimes(2);

      const jsonRequest = pushCall(0);
      expect(jsonRequest.headers).toEqual(BASE_HEADERS);
      expect(jsonRequest.body?.contentType).toBe("application/json");
      expect(jsonRequest.body?.buffer.toString("utf-8")).toBe(JSON.stringify(JSON_DATA));

      const pdfRequest = pushCall(1);
      expect(pdfRequest.headers).toEqual({ ...BASE_HEADERS, "x-provenance": "CATH" });
      expect(pdfRequest.body?.contentType).toMatch(/^multipart\/form-data; boundary=/);
      const pdfText = multipartText(pdfRequest.body);
      expect(pdfText).toContain('Content-Disposition: form-data; name="file"; filename="artefact-1.pdf"');
      expect(pdfText).toContain("Content-Type: application/octet-stream");
      expect(pdfText.match(/Content-Disposition/g)).toHaveLength(1);
      expect(pdfRequest.body?.buffer.includes(PDF)).toBe(true);
    });

    it.each([
      { isUpdate: false, expectedTypes: ["CREATE", "CREATE_PDF"] },
      { isUpdate: true, expectedTypes: ["UPDATE", "UPDATE_PDF"] }
    ])("should log one SUCCESS row per request with types $expectedTypes when isUpdate is $isUpdate", async ({ isUpdate, expectedTypes }) => {
      // Arrange
      const loadFiles = vi.fn().mockResolvedValue({ pdf: PDF });

      // Act
      await sendThirdPartyPublications({ ...BASE_PARAMS, isUpdate, jsonData: JSON_DATA, loadFiles });

      // Assert
      expect(loggedRows()).toEqual(expectedTypes.map((type) => ({ artefactId: "artefact-1", listTypeId: 10, type, status: "SUCCESS", statusCode: 201 })));
    });
  });

  describe("Welsh and bilingual publications (TS2, TS3)", () => {
    it.each([
      { language: "WELSH", description: "the Welsh rendering" },
      { language: "BILINGUAL", description: "CaTH's English rendering, a known gap until Welsh PDFs exist for bilingual lists" }
    ])("should send the single <artefactId>.pdf for a $language publication, which is $description", async ({ language }) => {
      // Arrange
      const pdf = Buffer.from(`%PDF-1.4 ${language} rendering`);
      const loadFiles = vi.fn().mockResolvedValue({ pdf });

      // Act
      const outcome = await sendThirdPartyPublications({ ...BASE_PARAMS, language, jsonData: JSON_DATA, loadFiles });

      // Assert
      expect(outcome).toBe("sent");
      expect(pushWithRetry).toHaveBeenCalledTimes(2);
      expect(mockBuildPushHeaders).toHaveBeenCalledWith(expect.objectContaining({ language }));
      expect(multipartText(pushCall(1).body)).toContain('filename="artefact-1.pdf"');
      expect(pushCall(1).body?.buffer.includes(pdf)).toBe(true);
    });
  });

  describe("JSON publication without a sendable PDF (TS4)", () => {
    it.each([
      { description: "no loadFiles callback", loadFiles: undefined },
      { description: "no PDF", loadFiles: () => Promise.resolve({}) },
      { description: "a zero-length PDF", loadFiles: () => Promise.resolve({ pdf: Buffer.alloc(0) }) },
      { description: "a PDF over the size cap", loadFiles: () => Promise.resolve({ pdf: Buffer.alloc(COURTEL_MAX_PDF_BYTES + 1) }) }
    ])("should send only the JSON request when there is $description", async ({ loadFiles }) => {
      // Act
      const outcome = await sendThirdPartyPublications({ ...BASE_PARAMS, jsonData: JSON_DATA, loadFiles });

      // Assert
      expect(outcome).toBe("sent");
      expect(pushWithRetry).toHaveBeenCalledTimes(1);
      expect(pushCall(0).body?.contentType).toBe("application/json");
      expect(loggedRows()).toEqual([expect.objectContaining({ type: "CREATE", status: "SUCCESS" })]);
    });

    it("should send a PDF of exactly the size cap", async () => {
      // Arrange
      const loadFiles = vi.fn().mockResolvedValue({ pdf: Buffer.alloc(COURTEL_MAX_PDF_BYTES) });

      // Act
      await sendThirdPartyPublications({ ...BASE_PARAMS, jsonData: JSON_DATA, loadFiles });

      // Assert
      expect(pushWithRetry).toHaveBeenCalledTimes(2);
    });

    it("should warn with the size when a PDF is over the size cap", async () => {
      // Arrange
      const loadFiles = vi.fn().mockResolvedValue({ pdf: Buffer.alloc(COURTEL_MAX_PDF_BYTES + 1) });

      // Act
      await sendThirdPartyPublications({ ...BASE_PARAMS, jsonData: JSON_DATA, loadFiles });

      // Assert
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("2000001 bytes exceeds limit 2000000"));
    });

    it("should warn when the PDF is empty", async () => {
      // Arrange
      const loadFiles = vi.fn().mockResolvedValue({ pdf: Buffer.alloc(0) });

      // Act
      await sendThirdPartyPublications({ ...BASE_PARAMS, jsonData: JSON_DATA, loadFiles });

      // Assert
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("Empty PDF not sent to third party for artefactId artefact-1"));
    });
  });

  describe("JSON request fails (TS5)", () => {
    it.each([{ statusCode: 400 }, { statusCode: 503 }])(
      "should not send the PDF and log one FAILED row when the JSON request returns $statusCode",
      async ({ statusCode }) => {
        // Arrange
        vi.mocked(pushWithRetry).mockResolvedValue({ statusCode, success: false });
        const loadFiles = vi.fn().mockResolvedValue({ pdf: PDF });

        // Act
        const outcome = await sendThirdPartyPublications({ ...BASE_PARAMS, jsonData: JSON_DATA, loadFiles });

        // Assert
        expect(outcome).toBe("failed");
        expect(pushWithRetry).toHaveBeenCalledTimes(1);
        expect(loggedRows()).toEqual([{ artefactId: "artefact-1", listTypeId: 10, type: "CREATE", status: "FAILED", statusCode }]);
      }
    );
  });

  describe("JSON succeeds but the PDF fails (TS6)", () => {
    it("should log a SUCCESS JSON row and a FAILED PDF row, return failed and name the PDF request in the error", async () => {
      // Arrange
      vi.mocked(pushWithRetry).mockResolvedValueOnce({ statusCode: 201, success: true }).mockResolvedValueOnce({ statusCode: 500, success: false });
      const loadFiles = vi.fn().mockResolvedValue({ pdf: PDF });

      // Act
      const outcome = await sendThirdPartyPublications({ ...BASE_PARAMS, jsonData: JSON_DATA, loadFiles });

      // Assert
      expect(outcome).toBe("failed");
      expect(loggedRows()).toEqual([
        { artefactId: "artefact-1", listTypeId: 10, type: "CREATE", status: "SUCCESS", statusCode: 201 },
        { artefactId: "artefact-1", listTypeId: 10, type: "CREATE_PDF", status: "FAILED", statusCode: 500 }
      ]);
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining("Third-party PDF request failed for artefactId artefact-1 (status 500)"));
    });
  });

  describe("flat-file publication (TS7)", () => {
    it.each([
      { sourceArtefactId: "hearing-list.xlsx", expectedFileName: "hearing-list.xlsx" },
      { sourceArtefactId: "ABC123", expectedFileName: "ABC123" },
      { sourceArtefactId: null, expectedFileName: "artefact-1" },
      { sourceArtefactId: "", expectedFileName: "artefact-1" }
    ])(
      "should send one file multipart named $expectedFileName when sourceArtefactId is '$sourceArtefactId'",
      async ({ sourceArtefactId, expectedFileName }) => {
        // Arrange
        const flatFile = Buffer.from("flat file bytes");
        const loadFiles = vi.fn().mockResolvedValue({ flatFile });

        // Act
        const outcome = await sendThirdPartyPublications({
          ...BASE_PARAMS,
          loadArtefactFields: () => Promise.resolve({ type: "LIST", sourceArtefactId }),
          loadFiles
        });

        // Assert
        expect(outcome).toBe("sent");
        expect(pushWithRetry).toHaveBeenCalledTimes(1);
        const request = pushCall(0);
        expect(request.headers).toEqual(BASE_HEADERS);
        const text = multipartText(request.body);
        expect(text).toContain(`Content-Disposition: form-data; name="file"; filename="${expectedFileName}"`);
        expect(text).toContain("Content-Type: application/octet-stream");
        expect(request.body?.buffer.includes(flatFile)).toBe(true);
        expect(loggedRows()).toEqual([{ artefactId: "artefact-1", listTypeId: 10, type: "CREATE", status: "SUCCESS", statusCode: 201 }]);
      }
    );

    it("should return failed when the flat-file request fails", async () => {
      // Arrange
      vi.mocked(pushWithRetry).mockResolvedValue({ statusCode: 400, success: false });
      const loadFiles = vi.fn().mockResolvedValue({ flatFile: Buffer.from("bytes") });

      // Act
      const outcome = await sendThirdPartyPublications({ ...BASE_PARAMS, isUpdate: true, loadFiles });

      // Assert
      expect(outcome).toBe("failed");
      expect(loggedRows()).toEqual([expect.objectContaining({ type: "UPDATE", status: "FAILED", statusCode: 400 })]);
    });
  });

  describe("bad input (TS10)", () => {
    it("should return failed without sending anything when a non-flat publication has no JSON", async () => {
      // Arrange
      const loadFiles = vi.fn().mockResolvedValue({ pdf: PDF });

      // Act
      const outcome = await sendThirdPartyPublications({ ...BASE_PARAMS, loadFiles });

      // Assert
      expect(outcome).toBe("failed");
      expect(pushWithRetry).not.toHaveBeenCalled();
      expect(mockPushLogCreate).not.toHaveBeenCalled();
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining("no JSON to send for artefactId artefact-1"));
    });

    it("should return failed without pushing or logging when loadFiles resolves null", async () => {
      // Act
      const outcome = await sendThirdPartyPublications({ ...BASE_PARAMS, jsonData: JSON_DATA, loadFiles: vi.fn().mockResolvedValue(null) });

      // Assert
      expect(outcome).toBe("failed");
      expect(pushWithRetry).not.toHaveBeenCalled();
      expect(mockPushLogCreate).not.toHaveBeenCalled();
      expect(console.error).toHaveBeenCalledWith(expect.stringContaining("publication file not found for artefactId artefact-1"));
    });

    it("should reject when loadFiles rejects", async () => {
      // Arrange
      const loadFiles = vi.fn().mockRejectedValue(new Error("Blob unavailable"));

      // Act
      const result = sendThirdPartyPublications({ ...BASE_PARAMS, jsonData: JSON_DATA, loadFiles });

      // Assert
      await expect(result).rejects.toThrow("Blob unavailable");
      expect(pushWithRetry).not.toHaveBeenCalled();
    });
  });

  it("should warn and keep the outcome when the push log write fails", async () => {
    // Arrange
    mockPushLogCreate.mockRejectedValue(new Error("DB write failed"));

    // Act
    const outcome = await sendThirdPartyPublications({ ...BASE_PARAMS, jsonData: JSON_DATA });
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Assert
    expect(outcome).toBe("sent");
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("Failed to write push log:"), "DB write failed");
  });
});

describe("sendThirdPartyDeletion (TS8)", () => {
  it("should return early if COURTEL_API_URL is not set", async () => {
    // Arrange
    delete process.env.COURTEL_API_URL;

    // Act
    await sendThirdPartyDeletion(DELETION_PARAMS);

    // Assert
    expect(pushWithRetry).not.toHaveBeenCalled();
  });

  it("should return early if there are no subscribers", async () => {
    // Arrange
    vi.mocked(findSubscribersByListType).mockResolvedValue([]);

    // Act
    await sendThirdPartyDeletion(DELETION_PARAMS);

    // Assert
    expect(pushWithRetry).not.toHaveBeenCalled();
  });

  it("should send one request with no body and headers built from the artefact's type and sourceArtefactId", async () => {
    // Arrange
    const params = { ...DELETION_PARAMS, type: "GENERAL_PUBLICATION", sourceArtefactId: "upload.csv" };

    // Act
    await sendThirdPartyDeletion(params);

    // Assert
    expect(pushWithRetry).toHaveBeenCalledTimes(1);
    expect(pushCall(0).headers).toEqual(BASE_HEADERS);
    expect(pushCall(0).body).toBeNull();
    expect(mockBuildPushHeaders).toHaveBeenCalledWith(expect.objectContaining({ type: "GENERAL_PUBLICATION", sourceArtefactId: "upload.csv" }));
  });

  it("should log the request as DELETION", async () => {
    // Act
    await sendThirdPartyDeletion(DELETION_PARAMS);

    // Assert
    expect(loggedRows()).toEqual([{ artefactId: "artefact-1", listTypeId: 10, type: "DELETION", status: "SUCCESS", statusCode: 201 }]);
  });

  it("should warn when the push log write fails", async () => {
    // Arrange
    mockPushLogCreate.mockRejectedValue(new Error("DB write failed"));

    // Act
    await sendThirdPartyDeletion(DELETION_PARAMS);
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Assert
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("Failed to write push log:"), "DB write failed");
  });
});
