import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sendRequest } from "./http-client.js";

const mockFetch = vi.fn();

describe("sendRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", mockFetch);
    mockFetch.mockResolvedValue(new Response(null, { status: 200 }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("should send the method, URL, bearer token, content type and body", async () => {
    // Arrange
    const body = Buffer.from("multipart-body");

    // Act
    await sendRequest({
      method: "POST",
      url: "https://subscriber.example/publication",
      accessToken: "token-123",
      body,
      contentType: "multipart/form-data; boundary=abc"
    });

    // Assert
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe("https://subscriber.example/publication");
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({ Authorization: "Bearer token-123", "Content-Type": "multipart/form-data; boundary=abc" });
    expect(Buffer.from(init.body).equals(body)).toBe(true);
  });

  it("should not send an Authorization header when the token is null", async () => {
    // Act
    await sendRequest({ method: "PUT", url: "https://subscriber.example/publication/a", accessToken: null, body: Buffer.from("x"), contentType: "text/plain" });

    // Assert
    const [, init] = mockFetch.mock.calls[0];
    expect(init.headers).toEqual({ "Content-Type": "text/plain" });
  });

  it("should send DELETE without a body or content type", async () => {
    // Act
    await sendRequest({ method: "DELETE", url: "https://subscriber.example/publication/a", accessToken: "token-123" });

    // Assert
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe("https://subscriber.example/publication/a");
    expect(init.method).toBe("DELETE");
    expect(init.body).toBeUndefined();
    expect(init.headers).toEqual({ Authorization: "Bearer token-123" });
  });

  it("should not pass a timeout signal", async () => {
    // Act
    await sendRequest({ method: "DELETE", url: "https://subscriber.example/publication/a", accessToken: "token-123" });

    // Assert
    const [, init] = mockFetch.mock.calls[0];
    expect(init.signal).toBeUndefined();
  });

  it.each([400, 401, 404, 500, 503])("should throw with the status when the response is %i", async (status) => {
    // Arrange
    mockFetch.mockResolvedValue(new Response("error body", { status }));

    // Act
    const act = sendRequest({ method: "DELETE", url: "https://subscriber.example/publication/a", accessToken: "token-123" });

    // Assert
    await expect(act).rejects.toThrow(`Third-party API returned status ${status}`);
  });

  it("should propagate network errors", async () => {
    // Arrange
    mockFetch.mockRejectedValue(new Error("fetch failed"));

    // Act
    const act = sendRequest({ method: "DELETE", url: "https://subscriber.example/publication/a", accessToken: "token-123" });

    // Assert
    await expect(act).rejects.toThrow("fetch failed");
  });
});
