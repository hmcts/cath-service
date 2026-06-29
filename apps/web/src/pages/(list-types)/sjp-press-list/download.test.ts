import type { NextFunction, Request, RequestHandler, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./download.js";

vi.mock("@hmcts/azure-blob", () => ({
  downloadBlob: vi.fn()
}));
vi.mock("@hmcts/postgres-prisma", () => ({
  prisma: {
    artefact: {
      findUnique: vi.fn()
    },
    listType: {
      findUnique: vi.fn()
    }
  }
}));
vi.mock("@hmcts/publication", () => ({
  getContentType: vi.fn((ext) => {
    if (ext === ".pdf") return "application/pdf";
    if (ext === ".xlsx") return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    return "application/octet-stream";
  })
}));

import { downloadBlob } from "@hmcts/azure-blob";
import { prisma } from "@hmcts/postgres-prisma";

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

  it("should set correct content type for xlsx files", async () => {
    const req = mockRequest({ query: { artefactId: "12345678-1234-1234-1234-123456789abc", type: "xlsx" } });
    const res = mockResponse();
    const mockBuffer = Buffer.from("xlsx content");

    vi.mocked(downloadBlob).mockResolvedValue(mockBuffer);

    await handler(req, res, () => {});

    expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    expect(res.setHeader).toHaveBeenCalledWith("Content-Disposition", 'attachment; filename="12345678-1234-1234-1234-123456789abc.xlsx"');
    expect(res.setHeader).toHaveBeenCalledWith("Cache-Control", "private, max-age=0, no-cache, no-store, must-revalidate");
    expect(res.send).toHaveBeenCalledWith(mockBuffer);
  });
});

describe("Download requireVerifiedWithProvenance middleware", () => {
  const mockNext = vi.fn() as unknown as NextFunction;

  const mockRequest = (overrides?: Partial<Request>) =>
    ({
      query: {},
      body: {},
      originalUrl: "/sjp-press-list/download",
      session: {},
      ...overrides
    }) as unknown as Request;

  const mockResponse = () => {
    const res = {} as Response;
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    res.redirect = vi.fn().mockReturnValue(res);
    return res;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should redirect to sign-in when user is not verified", async () => {
    const req = mockRequest({
      query: { artefactId: "12345678-1234-1234-1234-123456789abc" },
      user: { role: "BASIC" }
    } as Partial<Request>);
    const res = mockResponse();

    await middleware(req, res, mockNext);

    expect(res.redirect).toHaveBeenCalledWith("/sign-in");
    expect(mockNext).not.toHaveBeenCalled();
  });

  it("should redirect to sign-in when user has no provenance", async () => {
    const req = mockRequest({
      query: { artefactId: "12345678-1234-1234-1234-123456789abc" },
      user: { role: "VERIFIED", provenance: undefined }
    } as Partial<Request>);
    const res = mockResponse();

    await middleware(req, res, mockNext);

    expect(res.redirect).toHaveBeenCalledWith("/sign-in");
  });

  it("should redirect to sign-in when artefactId is missing", async () => {
    const req = mockRequest({
      query: {},
      user: { role: "VERIFIED", provenance: "PI_AAD" }
    } as Partial<Request>);
    const res = mockResponse();

    await middleware(req, res, mockNext);

    expect(res.redirect).toHaveBeenCalledWith("/sign-in");
  });

  it("should redirect to sign-in when artefactId is not a valid UUID", async () => {
    const req = mockRequest({
      query: { artefactId: "invalid" },
      user: { role: "VERIFIED", provenance: "PI_AAD" }
    } as Partial<Request>);
    const res = mockResponse();

    await middleware(req, res, mockNext);

    expect(res.redirect).toHaveBeenCalledWith("/sign-in");
  });

  it("should redirect to sign-in when artefact is not found", async () => {
    const req = mockRequest({
      query: { artefactId: "12345678-1234-1234-1234-123456789abc" },
      user: { role: "VERIFIED", provenance: "PI_AAD" }
    } as Partial<Request>);
    const res = mockResponse();

    vi.mocked(prisma.artefact.findUnique).mockResolvedValue(null);

    await middleware(req, res, mockNext);

    expect(res.redirect).toHaveBeenCalledWith("/sign-in");
  });

  it("should redirect to sign-in when list type provenance does not match", async () => {
    const req = mockRequest({
      query: { artefactId: "12345678-1234-1234-1234-123456789abc" },
      user: { role: "VERIFIED", provenance: "CRIME_IDAM" }
    } as Partial<Request>);
    const res = mockResponse();

    vi.mocked(prisma.artefact.findUnique).mockResolvedValue({ artefactId: "12345678-1234-1234-1234-123456789abc", listTypeId: 24 } as never);
    vi.mocked(prisma.listType.findUnique).mockResolvedValue({ id: 24, allowedProvenance: "PI_AAD" } as never);

    await middleware(req, res, mockNext);

    expect(res.redirect).toHaveBeenCalledWith("/sign-in");
  });

  it("should call next when provenance matches", async () => {
    const req = mockRequest({
      query: { artefactId: "12345678-1234-1234-1234-123456789abc" },
      user: { role: "VERIFIED", provenance: "PI_AAD" }
    } as Partial<Request>);
    const res = mockResponse();

    vi.mocked(prisma.artefact.findUnique).mockResolvedValue({ artefactId: "12345678-1234-1234-1234-123456789abc", listTypeId: 24 } as never);
    vi.mocked(prisma.listType.findUnique).mockResolvedValue({ id: 24, allowedProvenance: "PI_AAD" } as never);

    await middleware(req, res, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(res.redirect).not.toHaveBeenCalled();
  });
});
