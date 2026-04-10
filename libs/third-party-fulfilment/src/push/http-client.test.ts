import { beforeEach, describe, expect, it, vi } from "vitest";
import { executePush } from "./http-client.js";

const mockHttpsRequest = vi.hoisted(() => vi.fn());
const MockHttpsAgent = vi.hoisted(() => vi.fn());

vi.mock("node:https", () => ({
  default: {
    Agent: MockHttpsAgent,
    request: mockHttpsRequest
  }
}));

const TEST_URL = "https://api.example.gov.uk/publications";
const TEST_CERT = "-----BEGIN CERTIFICATE-----\nMIItest\n-----END CERTIFICATE-----";
const TEST_HEADERS = { "x-provenance": "SNL", "x-type": "99" };
const TEST_BODY = JSON.stringify({ data: "publication content" });

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
});
