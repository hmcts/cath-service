import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { discardBody, readJsonBody, sendOutboundRequest } from "./outbound-request.js";

const fetchMock = vi.fn();

describe("outbound-request", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    fetchMock.mockReset();
  });

  describe("sendOutboundRequest", () => {
    it.each([
      "ftp://example.com/file",
      "data:text/plain,ok",
      "javascript:alert(1)",
      "not a url",
      "",
      "https://user:pass@example.com/path",
      "https://user@example.com"
    ])("should reject %s without calling fetch", async (url) => {
      const result = await sendOutboundRequest(url, { method: "GET" });

      expect(result).toEqual({ kind: "invalid-url" });
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it.each(["http://example.com/path", "https://example.com/path"])("should accept %s", async (url) => {
      fetchMock.mockResolvedValue(new Response(null, { status: 200 }));

      const result = await sendOutboundRequest(url, { method: "GET" });

      expect(result.kind).toBe("response");
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("should apply a 30 second timeout signal and disable redirects", async () => {
      fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
      const timeoutSpy = vi.spyOn(AbortSignal, "timeout");

      await sendOutboundRequest("https://example.com/path", { method: "GET", headers: { Authorization: "Bearer abc" } });

      expect(timeoutSpy).toHaveBeenCalledWith(30000);
      const init = fetchMock.mock.calls[0][1];
      expect(init.redirect).toBe("manual");
      expect(init.signal).toBeInstanceOf(AbortSignal);
      expect(init.method).toBe("GET");
      expect(init.headers).toEqual({ Authorization: "Bearer abc" });
    });

    it.each([200, 204, 302, 401, 500])("should pass through status %s", async (status) => {
      fetchMock.mockResolvedValue(new Response(null, { status }));

      const result = await sendOutboundRequest("https://example.com", { method: "GET" });

      expect(result).toMatchObject({ kind: "response", status });
    });

    it("should map a TimeoutError to timeout", async () => {
      fetchMock.mockRejectedValue(new DOMException("The operation was aborted due to timeout", "TimeoutError"));

      const result = await sendOutboundRequest("https://example.com", { method: "GET" });

      expect(result).toEqual({ kind: "timeout" });
    });

    it("should map any other rejection to network-error with a safe code", async () => {
      const error = new TypeError("fetch failed", { cause: Object.assign(new Error("connect ECONNREFUSED 10.0.0.1:443"), { code: "ECONNREFUSED" }) });
      fetchMock.mockRejectedValue(error);

      const result = await sendOutboundRequest("https://example.com", { method: "GET" });

      expect(result).toEqual({ kind: "network-error", code: "ECONNREFUSED" });
    });

    it("should never return error message or cause text", async () => {
      const cause = Object.assign(new Error("secret-in-cause https://user:s3cr3t@host"), { code: "contains secret-in-code" });
      fetchMock.mockRejectedValue(new TypeError("secret-in-message s3cr3t", { cause }));

      const result = await sendOutboundRequest("https://example.com", { method: "GET" });

      expect(result).toEqual({ kind: "network-error", code: undefined });
      expect(JSON.stringify(result)).not.toContain("s3cr3t");
      expect(JSON.stringify(result)).not.toContain("secret-in");
    });

    it("should handle a non-Error rejection", async () => {
      fetchMock.mockRejectedValue("boom s3cr3t");

      const result = await sendOutboundRequest("https://example.com", { method: "GET" });

      expect(result).toEqual({ kind: "network-error", code: undefined });
    });
  });

  describe("readJsonBody", () => {
    it("should return parsed JSON", async () => {
      const result = await readJsonBody(new Response(JSON.stringify({ a: 1 })));

      expect(result).toEqual({ kind: "json", body: { a: 1 } });
    });

    it("should return invalid-body for non-JSON", async () => {
      const result = await readJsonBody(new Response("<html>nope</html>"));

      expect(result).toEqual({ kind: "invalid-body" });
    });

    it("should return timeout when the body read times out", async () => {
      const response = { json: vi.fn().mockRejectedValue(new DOMException("timeout", "TimeoutError")) } as unknown as Response;

      const result = await readJsonBody(response);

      expect(result).toEqual({ kind: "timeout" });
    });
  });

  describe("discardBody", () => {
    it("should cancel the body stream", async () => {
      const response = new Response("payload");
      const cancelSpy = vi.spyOn(response.body as ReadableStream, "cancel");

      await discardBody(response);

      expect(cancelSpy).toHaveBeenCalled();
    });

    it("should tolerate a missing body", async () => {
      await expect(discardBody(new Response(null, { status: 204 }))).resolves.toBeUndefined();
    });

    it("should swallow a cancel failure", async () => {
      const response = { body: { cancel: vi.fn().mockRejectedValue(new Error("fail")) } } as unknown as Response;

      await expect(discardBody(response)).resolves.toBeUndefined();
    });
  });
});
