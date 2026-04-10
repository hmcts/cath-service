import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { pushWithRetry } from "./retry.js";

const mockExecutePush = vi.hoisted(() => vi.fn());

vi.mock("./http-client.js", () => ({
  executePush: mockExecutePush
}));

const TEST_URL = "https://api.example.gov.uk/publications";
const TEST_CERT = "-----BEGIN CERTIFICATE-----\ntest\n-----END CERTIFICATE-----";
const TEST_HEADERS = { "x-provenance": "SNL" };
const TEST_BODY = '{"data":"test"}';

describe("pushWithRetry", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns success immediately without retrying on first attempt", async () => {
    mockExecutePush.mockResolvedValue({ statusCode: 200, success: true });

    const result = await pushWithRetry(TEST_URL, TEST_CERT, TEST_HEADERS, TEST_BODY);

    expect(result).toEqual({ statusCode: 200, success: true });
    expect(mockExecutePush).toHaveBeenCalledTimes(1);
  });

  it("retries on 5xx and returns success on the second attempt", async () => {
    mockExecutePush.mockResolvedValueOnce({ statusCode: 503, success: false }).mockResolvedValueOnce({ statusCode: 200, success: true });

    const resultPromise = pushWithRetry(TEST_URL, TEST_CERT, TEST_HEADERS, TEST_BODY);
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(result).toEqual({ statusCode: 200, success: true });
    expect(mockExecutePush).toHaveBeenCalledTimes(2);
  });

  it("does not retry on 4xx (except 429) and returns the 4xx result", async () => {
    mockExecutePush.mockResolvedValue({ statusCode: 400, success: false });

    const result = await pushWithRetry(TEST_URL, TEST_CERT, TEST_HEADERS, TEST_BODY);

    expect(result).toEqual({ statusCode: 400, success: false });
    expect(mockExecutePush).toHaveBeenCalledTimes(1);
  });

  it("does not retry on 401", async () => {
    mockExecutePush.mockResolvedValue({ statusCode: 401, success: false });

    const result = await pushWithRetry(TEST_URL, TEST_CERT, TEST_HEADERS, TEST_BODY);

    expect(result).toEqual({ statusCode: 401, success: false });
    expect(mockExecutePush).toHaveBeenCalledTimes(1);
  });

  it("retries on 429 rate-limit response", async () => {
    mockExecutePush.mockResolvedValueOnce({ statusCode: 429, success: false }).mockResolvedValueOnce({ statusCode: 200, success: true });

    const resultPromise = pushWithRetry(TEST_URL, TEST_CERT, TEST_HEADERS, TEST_BODY);
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(result).toEqual({ statusCode: 200, success: true });
    expect(mockExecutePush).toHaveBeenCalledTimes(2);
  });

  it("exhausts all 3 attempts on repeated 5xx and returns the last result", async () => {
    mockExecutePush.mockResolvedValue({ statusCode: 502, success: false });

    const resultPromise = pushWithRetry(TEST_URL, TEST_CERT, TEST_HEADERS, TEST_BODY);
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(result).toEqual({ statusCode: 502, success: false });
    expect(mockExecutePush).toHaveBeenCalledTimes(3);
  });

  it("retries and succeeds on the third attempt", async () => {
    mockExecutePush
      .mockResolvedValueOnce({ statusCode: 500, success: false })
      .mockResolvedValueOnce({ statusCode: 500, success: false })
      .mockResolvedValueOnce({ statusCode: 201, success: true });

    const resultPromise = pushWithRetry(TEST_URL, TEST_CERT, TEST_HEADERS, TEST_BODY);
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(result).toEqual({ statusCode: 201, success: true });
    expect(mockExecutePush).toHaveBeenCalledTimes(3);
  });

  it("retries on network error (rejected promise) and returns success on second attempt", async () => {
    mockExecutePush.mockRejectedValueOnce(new Error("ECONNREFUSED")).mockResolvedValueOnce({ statusCode: 200, success: true });

    const resultPromise = pushWithRetry(TEST_URL, TEST_CERT, TEST_HEADERS, TEST_BODY);
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(result).toEqual({ statusCode: 200, success: true });
    expect(mockExecutePush).toHaveBeenCalledTimes(2);
  });

  it("passes through null body correctly", async () => {
    mockExecutePush.mockResolvedValue({ statusCode: 204, success: true });

    const result = await pushWithRetry(TEST_URL, TEST_CERT, TEST_HEADERS, null);

    expect(result).toEqual({ statusCode: 204, success: true });
    expect(mockExecutePush).toHaveBeenCalledWith(TEST_URL, TEST_CERT, TEST_HEADERS, null);
  });
});
