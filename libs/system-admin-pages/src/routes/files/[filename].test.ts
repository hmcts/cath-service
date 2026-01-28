import fs from "node:fs/promises";
import path from "node:path";
import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("node:fs/promises", () => ({
  default: {
    access: vi.fn(),
    readFile: vi.fn()
  }
}));

const { GET } = await import("./[filename].js");

describe("files route", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRequest = {
      params: { filename: "test-artefact.pdf" }
    };

    mockResponse = {
      setHeader: vi.fn(),
      send: vi.fn(),
      status: vi.fn().mockReturnThis()
    };
  });

  it("should serve a PDF file with correct headers", async () => {
    vi.mocked(fs.access).mockResolvedValue(undefined);
    vi.mocked(fs.readFile).mockResolvedValue(Buffer.from("fake pdf content"));

    const handler = GET[1];
    await handler(mockRequest as Request, mockResponse as Response, vi.fn());

    expect(mockResponse.setHeader).toHaveBeenCalledWith("Content-Type", "application/pdf");
    expect(mockResponse.setHeader).toHaveBeenCalledWith("Content-Disposition", 'inline; filename="test-artefact.pdf"');
    expect(mockResponse.setHeader).toHaveBeenCalledWith("Cache-Control", "no-store, no-cache, must-revalidate, private");
    expect(mockResponse.setHeader).toHaveBeenCalledWith("X-Content-Type-Options", "nosniff");
    expect(mockResponse.send).toHaveBeenCalledWith(Buffer.from("fake pdf content"));
  });

  it("should serve a CSV file with correct content type", async () => {
    mockRequest.params = { filename: "data.csv" };

    vi.mocked(fs.access).mockResolvedValue(undefined);
    vi.mocked(fs.readFile).mockResolvedValue(Buffer.from("csv,content"));

    const handler = GET[1];
    await handler(mockRequest as Request, mockResponse as Response, vi.fn());

    expect(mockResponse.setHeader).toHaveBeenCalledWith("Content-Type", "text/csv");
    expect(mockResponse.send).toHaveBeenCalledWith(Buffer.from("csv,content"));
  });

  it("should serve a JSON file with correct content type", async () => {
    mockRequest.params = { filename: "data.json" };

    vi.mocked(fs.access).mockResolvedValue(undefined);
    vi.mocked(fs.readFile).mockResolvedValue(Buffer.from('{"key": "value"}'));

    const handler = GET[1];
    await handler(mockRequest as Request, mockResponse as Response, vi.fn());

    expect(mockResponse.setHeader).toHaveBeenCalledWith("Content-Type", "application/json");
    expect(mockResponse.send).toHaveBeenCalled();
  });

  it("should return 400 when filename is missing", async () => {
    mockRequest.params = {};

    const handler = GET[1];
    await handler(mockRequest as Request, mockResponse as Response, vi.fn());

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.send).toHaveBeenCalledWith("Filename is required");
  });

  it("should return 400 for invalid filename with path traversal", async () => {
    mockRequest.params = { filename: "../etc/passwd" };

    const handler = GET[1];
    await handler(mockRequest as Request, mockResponse as Response, vi.fn());

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.send).toHaveBeenCalledWith("Invalid filename");
  });

  it("should return 400 for filename with forward slash", async () => {
    mockRequest.params = { filename: "subdir/file.pdf" };

    const handler = GET[1];
    await handler(mockRequest as Request, mockResponse as Response, vi.fn());

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.send).toHaveBeenCalledWith("Invalid filename");
  });

  it("should return 400 for filename with backslash", async () => {
    mockRequest.params = { filename: "subdir\\file.pdf" };

    const handler = GET[1];
    await handler(mockRequest as Request, mockResponse as Response, vi.fn());

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.send).toHaveBeenCalledWith("Invalid filename");
  });

  it("should return 400 for filename without extension", async () => {
    mockRequest.params = { filename: "noextension" };

    const handler = GET[1];
    await handler(mockRequest as Request, mockResponse as Response, vi.fn());

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.send).toHaveBeenCalledWith("Invalid filename");
  });

  it("should return 404 when file does not exist", async () => {
    vi.mocked(fs.access).mockRejectedValue(new Error("ENOENT"));

    const handler = GET[1];
    await handler(mockRequest as Request, mockResponse as Response, vi.fn());

    expect(mockResponse.status).toHaveBeenCalledWith(404);
    expect(mockResponse.send).toHaveBeenCalledWith("File not found");
  });

  it("should use application/octet-stream for unknown file types", async () => {
    mockRequest.params = { filename: "file.xyz" };

    vi.mocked(fs.access).mockResolvedValue(undefined);
    vi.mocked(fs.readFile).mockResolvedValue(Buffer.from("content"));

    const handler = GET[1];
    await handler(mockRequest as Request, mockResponse as Response, vi.fn());

    expect(mockResponse.setHeader).toHaveBeenCalledWith("Content-Type", "application/octet-stream");
    expect(mockResponse.send).toHaveBeenCalled();
  });

  it("should serve HTML files with attachment disposition to prevent XSS", async () => {
    mockRequest.params = { filename: "document.html" };

    vi.mocked(fs.access).mockResolvedValue(undefined);
    vi.mocked(fs.readFile).mockResolvedValue(Buffer.from("<html><body>content</body></html>"));

    const handler = GET[1];
    await handler(mockRequest as Request, mockResponse as Response, vi.fn());

    expect(mockResponse.setHeader).toHaveBeenCalledWith("Content-Type", "text/html");
    expect(mockResponse.setHeader).toHaveBeenCalledWith("Content-Disposition", 'attachment; filename="document.html"');
    expect(mockResponse.setHeader).toHaveBeenCalledWith("Cache-Control", "no-store, no-cache, must-revalidate, private");
    expect(mockResponse.setHeader).toHaveBeenCalledWith("X-Content-Type-Options", "nosniff");
    expect(mockResponse.send).toHaveBeenCalledWith(Buffer.from("<html><body>content</body></html>"));
  });

  it("should set no-cache headers for all file types", async () => {
    mockRequest.params = { filename: "data.csv" };

    vi.mocked(fs.access).mockResolvedValue(undefined);
    vi.mocked(fs.readFile).mockResolvedValue(Buffer.from("csv,content"));

    const handler = GET[1];
    await handler(mockRequest as Request, mockResponse as Response, vi.fn());

    expect(mockResponse.setHeader).toHaveBeenCalledWith("Cache-Control", "no-store, no-cache, must-revalidate, private");
    expect(mockResponse.setHeader).toHaveBeenCalledWith("Pragma", "no-cache");
    expect(mockResponse.setHeader).toHaveBeenCalledWith("Expires", "0");
  });
});
