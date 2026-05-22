import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./download.js";

vi.mock("node:fs/promises", () => ({
  default: {
    readFile: vi.fn()
  }
}));

vi.mock("@hmcts/publication", () => ({
  getContentTypeFromExtension: vi.fn().mockReturnValue("application/pdf")
}));

import fs from "node:fs/promises";

describe("Download Route", () => {
  const mockRequest = (overrides?: Partial<Request>) =>
    ({
      query: {},
      ...overrides
    }) as unknown as Request;

  const mockResponse = () => {
    const res = {} as Response;
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    res.setHeader = vi.fn().mockReturnValue(res);
    res.send = vi.fn().mockReturnValue(res);
    return res;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 400 when artefactId is missing", async () => {
    const req = mockRequest({ query: {} });
    const res = mockResponse();

    await GET(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid request" });
  });

  it("should return 400 when artefactId is not a valid UUID", async () => {
    const req = mockRequest({ query: { artefactId: "not-valid", type: "pdf" } });
    const res = mockResponse();

    await GET(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid request" });
  });

  it("should return 400 when type is not allowed", async () => {
    const req = mockRequest({ query: { artefactId: "12345678-1234-1234-1234-123456789abc", type: "exe" } });
    const res = mockResponse();

    await GET(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid request" });
  });

  it("should return file with correct headers when file exists", async () => {
    const req = mockRequest({ query: { artefactId: "12345678-1234-1234-1234-123456789abc", type: "pdf" } });
    const res = mockResponse();
    const mockBuffer = Buffer.from("pdf content");

    vi.mocked(fs.readFile).mockResolvedValue(mockBuffer);

    await GET(req, res);

    expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "application/pdf");
    expect(res.setHeader).toHaveBeenCalledWith("Content-Disposition", 'attachment; filename="12345678-1234-1234-1234-123456789abc.pdf"');
    expect(res.send).toHaveBeenCalledWith(mockBuffer);
  });

  it("should return 404 when file does not exist", async () => {
    const req = mockRequest({ query: { artefactId: "12345678-1234-1234-1234-123456789abc", type: "pdf" } });
    const res = mockResponse();

    vi.mocked(fs.readFile).mockRejectedValue(new Error("ENOENT"));

    await GET(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "File not found" });
  });
});
