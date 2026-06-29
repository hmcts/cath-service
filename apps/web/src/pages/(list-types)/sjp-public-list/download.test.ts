import type { NextFunction, Request, RequestHandler, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./download.js";

vi.mock("@hmcts/azure-blob", () => ({
  downloadBlob: vi.fn()
}));
vi.mock("@hmcts/publication", () => ({
  getContentType: vi.fn((ext) => {
    if (ext === ".pdf") return "application/pdf";
    if (ext === ".xlsx") return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    return "application/octet-stream";
  })
}));

import { downloadBlob } from "@hmcts/azure-blob";

const middleware = GET[0] as RequestHandler;
const handler = GET[GET.length - 1] as RequestHandler;

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

    await handler(req, res, () => {});

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid request" });
  });

  it("should return 400 when artefactId is not a valid UUID", async () => {
    const req = mockRequest({ query: { artefactId: "not-valid", type: "pdf" } });
    const res = mockResponse();

    await handler(req, res, () => {});

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid request" });
  });

  it("should return 400 when type is not allowed", async () => {
    const req = mockRequest({ query: { artefactId: "12345678-1234-1234-1234-123456789abc", type: "exe" } });
    const res = mockResponse();

    await handler(req, res, () => {});

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid request" });
  });

  it("should return file with correct headers when file exists", async () => {
    const req = mockRequest({ query: { artefactId: "12345678-1234-1234-1234-123456789abc", type: "pdf" } });
    const res = mockResponse();
    const mockBuffer = Buffer.from("pdf content");

    vi.mocked(downloadBlob).mockResolvedValue(mockBuffer);

    await handler(req, res, () => {});

    expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "application/pdf");
    expect(res.setHeader).toHaveBeenCalledWith("Content-Disposition", 'attachment; filename="12345678-1234-1234-1234-123456789abc.pdf"');
    expect(res.send).toHaveBeenCalledWith(mockBuffer);
  });

  it("should return 404 when file does not exist", async () => {
    const req = mockRequest({ query: { artefactId: "12345678-1234-1234-1234-123456789abc", type: "pdf" } });
    const res = mockResponse();

    vi.mocked(downloadBlob).mockResolvedValue(null);

    await handler(req, res, () => {});

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: "File not found" });
  });
});

describe("Download requireVerified middleware", () => {
  const mockNext = vi.fn() as unknown as NextFunction;

  const mockRequest = (overrides?: Partial<Request>) =>
    ({
      query: {},
      originalUrl: "/sjp-public-list/download",
      session: {},
      ...overrides
    }) as unknown as Request;

  const mockResponse = () => {
    const res = {} as Response;
    res.redirect = vi.fn().mockReturnValue(res);
    res.locals = { locale: "en" };
    return res;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should call next when user is verified", async () => {
    const req = mockRequest({ user: { role: "VERIFIED" } } as Partial<Request>);
    const res = mockResponse();

    await middleware(req, res, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(res.redirect).not.toHaveBeenCalled();
  });

  it("should redirect to sign-in when user is not verified", async () => {
    const req = mockRequest({ user: { role: "BASIC" } } as Partial<Request>);
    const res = mockResponse();

    await middleware(req, res, mockNext);

    expect(res.redirect).toHaveBeenCalledWith("/sign-in");
    expect(mockNext).not.toHaveBeenCalled();
  });
});
