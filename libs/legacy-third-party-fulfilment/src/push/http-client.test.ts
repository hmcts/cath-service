import { beforeEach, describe, expect, it, vi } from "vitest";
import { executePush } from "./http-client.js";

const mockHttpsRequest = vi.hoisted(() => vi.fn());
const MockHttpsAgent = vi.hoisted(() => vi.fn());
const mockReadFile = vi.hoisted(() => vi.fn());
const mockRandomBytes = vi.hoisted(() => vi.fn(() => Buffer.from("deadbeef", "hex")));

vi.mock("node:https", () => ({
  default: {
    Agent: MockHttpsAgent,
    request: mockHttpsRequest
  }
}));

vi.mock("node:fs/promises", () => ({
  default: { readFile: mockReadFile }
}));

vi.mock("node:crypto", () => ({
  default: { randomBytes: mockRandomBytes }
}));

const TEST_URL = "https://api.example.gov.uk/publications";
const TEST_CERT = "-----BEGIN CERTIFICATE-----\nMIItest\n-----END CERTIFICATE-----";
const TEST_HEADERS = { "x-provenance": "SNL", "x-type": "99" };
const TEST_BODY = JSON.stringify({ data: "publication content" });
const TEST_PDF_PATH = "/tmp/publication.pdf";
const TEST_PDF_BYTES = Buffer.from("%PDF-1.4 fake pdf content");

function makeRequestMock() {
  return {
    on: vi.fn(),
    write: vi.fn(),
    end: vi.fn()
  };
}

function setupResponseMock(statusCode: number) {
  const reqMock = makeRequestMock();

  mockHttpsRequest.mockImplementation((_options, callback) => {
    const resMock = {
      statusCode,
      resume: vi.fn(),
      on: vi.fn((event: string, handler: () => void) => {
        if (event === "end") handler();
      })
    };
    callback(resMock);
    return reqMock;
  });

  return reqMock;
}

describe("executePush", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReadFile.mockResolvedValue(TEST_PDF_BYTES);
  });

  it("returns statusCode 200 and success true for a successful POST", async () => {
    setupResponseMock(200);

    const result = await executePush(TEST_URL, TEST_CERT, TEST_HEADERS, TEST_BODY);

    expect(result).toEqual({ statusCode: 200, success: true });
  });

  it("returns success true for status 201", async () => {
    setupResponseMock(201);

    const result = await executePush(TEST_URL, TEST_CERT, TEST_HEADERS, TEST_BODY);

    expect(result).toEqual({ statusCode: 201, success: true });
  });

  it("returns success true for status 202", async () => {
    setupResponseMock(202);

    const result = await executePush(TEST_URL, TEST_CERT, TEST_HEADERS, TEST_BODY);

    expect(result).toEqual({ statusCode: 202, success: true });
  });

  it("returns success true for status 204", async () => {
    setupResponseMock(204);

    const result = await executePush(TEST_URL, TEST_CERT, TEST_HEADERS, TEST_BODY);

    expect(result).toEqual({ statusCode: 204, success: true });
  });

  it("returns success false for status 400", async () => {
    setupResponseMock(400);

    const result = await executePush(TEST_URL, TEST_CERT, TEST_HEADERS, TEST_BODY);

    expect(result).toEqual({ statusCode: 400, success: false });
  });

  it("returns success false for status 500", async () => {
    setupResponseMock(500);

    const result = await executePush(TEST_URL, TEST_CERT, TEST_HEADERS, TEST_BODY);

    expect(result).toEqual({ statusCode: 500, success: false });
  });

  it("sends Content-Type application/json and writes body when body is not null", async () => {
    const reqMock = setupResponseMock(200);

    await executePush(TEST_URL, TEST_CERT, TEST_HEADERS, TEST_BODY);

    const callArgs = mockHttpsRequest.mock.calls[0];
    const options = callArgs[0] as { headers: Record<string, string | number> };

    expect(options.headers["Content-Type"]).toBe("application/json");
    expect(reqMock.write).toHaveBeenCalledOnce();
  });

  it("does not set Content-Type and does not call req.write when body is null", async () => {
    const reqMock = setupResponseMock(204);

    await executePush(TEST_URL, TEST_CERT, TEST_HEADERS, null);

    const callArgs = mockHttpsRequest.mock.calls[0];
    const options = callArgs[0] as { headers: Record<string, string | number> };

    expect(options.headers["Content-Type"]).toBeUndefined();
    expect(reqMock.write).not.toHaveBeenCalled();
  });

  it("rejects when the request emits an error", async () => {
    const reqMock = makeRequestMock();
    const networkError = new Error("ECONNREFUSED");

    mockHttpsRequest.mockImplementation(() => {
      // Trigger the error event synchronously after returning the mock
      process.nextTick(() => {
        const errorHandler = reqMock.on.mock.calls.find(([event]) => event === "error")?.[1];
        errorHandler?.(networkError);
      });
      return reqMock;
    });

    await expect(executePush(TEST_URL, TEST_CERT, TEST_HEADERS, TEST_BODY)).rejects.toThrow("ECONNREFUSED");
  });

  it("configures the https agent with the certificate as a CA trust store", async () => {
    setupResponseMock(200);

    await executePush(TEST_URL, TEST_CERT, TEST_HEADERS, TEST_BODY);

    expect(MockHttpsAgent).toHaveBeenCalledWith(expect.objectContaining({ ca: TEST_CERT, rejectUnauthorized: true }));
    expect(MockHttpsAgent).not.toHaveBeenCalledWith(expect.objectContaining({ cert: expect.anything() }));
    expect(MockHttpsAgent).not.toHaveBeenCalledWith(expect.objectContaining({ key: expect.anything() }));
  });

  it("sets a 30 second timeout on the request", async () => {
    setupResponseMock(200);

    await executePush(TEST_URL, TEST_CERT, TEST_HEADERS, TEST_BODY);

    const options = mockHttpsRequest.mock.calls[0][0] as { timeout: number };
    expect(options.timeout).toBe(30_000);
  });

  it("destroys the request when the timeout event fires", async () => {
    const reqMock = { ...makeRequestMock(), destroy: vi.fn() };

    mockHttpsRequest.mockImplementation(() => {
      process.nextTick(() => {
        const timeoutHandler = reqMock.on.mock.calls.find(([event]) => event === "timeout")?.[1];
        timeoutHandler?.();

        // Simulate Node's behaviour: req.destroy(err) causes the 'error' event to emit
        const destroyError = reqMock.destroy.mock.calls[0]?.[0];
        if (destroyError) {
          const errorHandler = reqMock.on.mock.calls.find(([event]) => event === "error")?.[1];
          errorHandler?.(destroyError);
        }
      });
      return reqMock;
    });

    await expect(executePush(TEST_URL, TEST_CERT, TEST_HEADERS, TEST_BODY)).rejects.toThrow("timed out");
    expect(reqMock.destroy).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining("timed out") }));
  });

  describe("multipart/form-data with pdfPath", () => {
    it("sets Content-Type to multipart/form-data when pdfPath is provided", async () => {
      setupResponseMock(200);

      await executePush(TEST_URL, TEST_CERT, TEST_HEADERS, TEST_BODY, TEST_PDF_PATH);

      const options = mockHttpsRequest.mock.calls[0][0] as { headers: Record<string, string | number> };
      expect(options.headers["Content-Type"]).toMatch(/^multipart\/form-data; boundary=/);
    });

    it("reads the PDF file from the given path", async () => {
      setupResponseMock(200);

      await executePush(TEST_URL, TEST_CERT, TEST_HEADERS, TEST_BODY, TEST_PDF_PATH);

      expect(mockReadFile).toHaveBeenCalledWith(TEST_PDF_PATH);
    });

    it("includes the JSON part and PDF part in the multipart body", async () => {
      const reqMock = setupResponseMock(200);

      await executePush(TEST_URL, TEST_CERT, TEST_HEADERS, TEST_BODY, TEST_PDF_PATH);

      expect(reqMock.write).toHaveBeenCalledOnce();
      const writtenBuffer: Buffer = reqMock.write.mock.calls[0][0];
      const bodyStr = writtenBuffer.toString("binary");

      expect(bodyStr).toContain('name="json"');
      expect(bodyStr).toContain("application/json");
      expect(bodyStr).toContain(TEST_BODY);
      expect(bodyStr).toContain('name="pdf"');
      expect(bodyStr).toContain("application/pdf");
    });

    it("includes only the PDF part when body is null", async () => {
      const reqMock = setupResponseMock(200);

      await executePush(TEST_URL, TEST_CERT, TEST_HEADERS, null, TEST_PDF_PATH);

      expect(reqMock.write).toHaveBeenCalledOnce();
      const writtenBuffer: Buffer = reqMock.write.mock.calls[0][0];
      const bodyStr = writtenBuffer.toString("binary");

      expect(bodyStr).not.toContain('name="json"');
      expect(bodyStr).toContain('name="pdf"');
      expect(bodyStr).toContain("application/pdf");
    });

    it("does not set Content-Type application/json when pdfPath is provided", async () => {
      setupResponseMock(200);

      await executePush(TEST_URL, TEST_CERT, TEST_HEADERS, TEST_BODY, TEST_PDF_PATH);

      const options = mockHttpsRequest.mock.calls[0][0] as { headers: Record<string, string | number> };
      expect(options.headers["Content-Type"]).not.toBe("application/json");
    });
  });

  describe("multipart/form-data with flatFilePath", () => {
    const TEST_FLAT_FILE_PATH = "/tmp/artefact-1.xlsx";
    const TEST_FLAT_FILE_BYTES = Buffer.from("fake excel content");

    beforeEach(() => {
      mockReadFile.mockResolvedValue(TEST_FLAT_FILE_BYTES);
    });

    it("sets Content-Type to multipart/form-data when flatFilePath is provided", async () => {
      setupResponseMock(200);

      await executePush(TEST_URL, TEST_CERT, TEST_HEADERS, null, undefined, TEST_FLAT_FILE_PATH);

      const options = mockHttpsRequest.mock.calls[0][0] as { headers: Record<string, string | number> };
      expect(options.headers["Content-Type"]).toMatch(/^multipart\/form-data; boundary=/);
    });

    it("reads the flat file from the given path", async () => {
      setupResponseMock(200);

      await executePush(TEST_URL, TEST_CERT, TEST_HEADERS, null, undefined, TEST_FLAT_FILE_PATH);

      expect(mockReadFile).toHaveBeenCalledWith(TEST_FLAT_FILE_PATH);
    });

    it("includes only the file part with correct content type for xlsx", async () => {
      const reqMock = setupResponseMock(200);

      await executePush(TEST_URL, TEST_CERT, TEST_HEADERS, null, undefined, TEST_FLAT_FILE_PATH);

      expect(reqMock.write).toHaveBeenCalledOnce();
      const writtenBuffer: Buffer = reqMock.write.mock.calls[0][0];
      const bodyStr = writtenBuffer.toString("binary");

      expect(bodyStr).toContain('name="file"');
      expect(bodyStr).toContain('filename="artefact-1.xlsx"');
      expect(bodyStr).toContain("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      expect(bodyStr).not.toContain('name="json"');
      expect(bodyStr).not.toContain('name="pdf"');
    });

    it("uses application/octet-stream for unknown file extensions", async () => {
      const reqMock = setupResponseMock(200);

      await executePush(TEST_URL, TEST_CERT, TEST_HEADERS, null, undefined, "/tmp/artefact-1.dat");

      const writtenBuffer: Buffer = reqMock.write.mock.calls[0][0];
      const bodyStr = writtenBuffer.toString("binary");

      expect(bodyStr).toContain("application/octet-stream");
    });

    it("takes priority over pdfPath when both are provided", async () => {
      const reqMock = setupResponseMock(200);

      await executePush(TEST_URL, TEST_CERT, TEST_HEADERS, TEST_BODY, TEST_PDF_PATH, TEST_FLAT_FILE_PATH);

      const writtenBuffer: Buffer = reqMock.write.mock.calls[0][0];
      const bodyStr = writtenBuffer.toString("binary");

      expect(bodyStr).toContain('name="file"');
      expect(bodyStr).not.toContain('name="pdf"');
      expect(bodyStr).not.toContain('name="json"');
    });
  });
});
