import type { Request, RequestHandler, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./list-download-files.js";

vi.mock("@hmcts/azure-blob", () => ({
  getBlobProperties: vi.fn()
}));

import { getBlobProperties } from "@hmcts/azure-blob";

const handler = GET[GET.length - 1] as RequestHandler;

describe("List Download Files Controller", () => {
  const mockRequest = (overrides?: Partial<Request>) =>
    ({
      query: {},
      path: "/sjp-public-list/list-download-files",
      ...overrides
    }) as unknown as Request;

  const mockResponse = () => {
    const res = {} as Response;
    res.status = vi.fn().mockReturnValue(res);
    res.render = vi.fn().mockReturnValue(res);
    res.locals = { locale: "en" };
    return res;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getBlobProperties).mockResolvedValue(null);
  });

  it("should render 400 when artefactId is missing", async () => {
    const req = mockRequest({ query: {} });
    const res = mockResponse();

    await handler(req, res, () => {});

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.render).toHaveBeenCalledWith("errors/400", expect.any(Object));
  });

  it("should render 400 when artefactId is not a valid UUID", async () => {
    const req = mockRequest({ query: { artefactId: "invalid" } });
    const res = mockResponse();

    await handler(req, res, () => {});

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("should render 404 when no files are available", async () => {
    const req = mockRequest({ query: { artefactId: "12345678-1234-1234-1234-123456789abc" } });
    const res = mockResponse();

    await handler(req, res, () => {});

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.render).toHaveBeenCalledWith("errors/404", expect.any(Object));
  });

  it("should render files page with available PDF", async () => {
    const req = mockRequest({ query: { artefactId: "12345678-1234-1234-1234-123456789abc" } });
    const res = mockResponse();

    vi.mocked(getBlobProperties).mockImplementation((blobName) => {
      if (String(blobName).endsWith(".pdf")) return Promise.resolve({ size: 52400 });
      return Promise.resolve(null);
    });

    await handler(req, res, () => {});

    expect(res.render).toHaveBeenCalledWith(
      "list-download-files",
      expect.objectContaining({
        artefactId: "12345678-1234-1234-1234-123456789abc",
        files: [
          {
            type: "pdf",
            url: "/sjp-public-list/download?artefactId=12345678-1234-1234-1234-123456789abc&type=pdf",
            sizeLabel: "51.2KB"
          }
        ]
      })
    );
  });

  it("should render files page with both PDF and Excel", async () => {
    const req = mockRequest({ query: { artefactId: "12345678-1234-1234-1234-123456789abc" } });
    const res = mockResponse();

    vi.mocked(getBlobProperties).mockImplementation((blobName) => {
      if (String(blobName).endsWith(".pdf")) return Promise.resolve({ size: 102400 });
      if (String(blobName).endsWith(".xlsx")) return Promise.resolve({ size: 37683 });
      return Promise.resolve(null);
    });

    await handler(req, res, () => {});

    expect(res.render).toHaveBeenCalledWith(
      "list-download-files",
      expect.objectContaining({
        files: [
          {
            type: "pdf",
            url: "/sjp-public-list/download?artefactId=12345678-1234-1234-1234-123456789abc&type=pdf",
            sizeLabel: "100.0KB"
          },
          {
            type: "xlsx",
            url: "/sjp-public-list/download?artefactId=12345678-1234-1234-1234-123456789abc&type=xlsx",
            sizeLabel: "36.8KB"
          }
        ]
      })
    );
  });

  it("should use Welsh translations when locale is cy", async () => {
    const req = mockRequest({ query: { artefactId: "12345678-1234-1234-1234-123456789abc" } });
    const res = mockResponse();
    res.locals.locale = "cy";

    vi.mocked(getBlobProperties).mockResolvedValue({ size: 1024 });

    await handler(req, res, () => {});

    expect(res.render).toHaveBeenCalledWith(
      "list-download-files",
      expect.objectContaining({
        t: expect.objectContaining({ pageTitle: "Lawrlwytho eich ffeil" }),
        locale: "cy"
      })
    );
  });
});
