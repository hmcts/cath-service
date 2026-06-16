import type { Request, RequestHandler, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./list-download-disclaimer.js";

const getHandler = GET[GET.length - 1] as RequestHandler;
const postHandler = POST[POST.length - 1] as RequestHandler;

describe("List Download Disclaimer Controller", () => {
  const mockRequest = (overrides?: Partial<Request>) =>
    ({
      query: {},
      body: {},
      path: "/sjp-public-list/list-download-disclaimer",
      ...overrides
    }) as unknown as Request;

  const mockResponse = () => {
    const res = {} as Response;
    res.status = vi.fn().mockReturnValue(res);
    res.render = vi.fn().mockReturnValue(res);
    res.redirect = vi.fn().mockReturnValue(res);
    res.locals = { locale: "en" };
    return res;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET", () => {
    it("should render 400 when artefactId is missing", async () => {
      const req = mockRequest({ query: {} });
      const res = mockResponse();

      await getHandler(req, res, () => {});

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.render).toHaveBeenCalledWith("errors/400", expect.any(Object));
    });

    it("should render 400 when artefactId is not a valid UUID", async () => {
      const req = mockRequest({ query: { artefactId: "not-a-uuid" } });
      const res = mockResponse();

      await getHandler(req, res, () => {});

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.render).toHaveBeenCalledWith("errors/400", expect.any(Object));
    });

    it("should render disclaimer page with valid artefactId", async () => {
      const req = mockRequest({ query: { artefactId: "12345678-1234-1234-1234-123456789abc" } });
      const res = mockResponse();

      await getHandler(req, res, () => {});

      expect(res.render).toHaveBeenCalledWith(
        "list-download-disclaimer",
        expect.objectContaining({
          artefactId: "12345678-1234-1234-1234-123456789abc",
          errors: null
        })
      );
    });

    it("should use Welsh translations when locale is cy", async () => {
      const req = mockRequest({ query: { artefactId: "12345678-1234-1234-1234-123456789abc" } });
      const res = mockResponse();
      res.locals.locale = "cy";

      await getHandler(req, res, () => {});

      expect(res.render).toHaveBeenCalledWith(
        "list-download-disclaimer",
        expect.objectContaining({
          pageTitle: "Telerau ac amodau",
          locale: "cy"
        })
      );
    });
  });

  describe("POST", () => {
    it("should render 400 when artefactId is missing", async () => {
      const req = mockRequest({ body: {} });
      const res = mockResponse();

      await postHandler(req, res, () => {});

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("should render error when checkbox is not ticked", async () => {
      const req = mockRequest({
        body: { artefactId: "12345678-1234-1234-1234-123456789abc" }
      });
      const res = mockResponse();

      await postHandler(req, res, () => {});

      expect(res.render).toHaveBeenCalledWith(
        "list-download-disclaimer",
        expect.objectContaining({
          artefactId: "12345678-1234-1234-1234-123456789abc",
          errors: [{ text: "You must agree to the terms and conditions", href: "#agreed" }]
        })
      );
    });

    it("should redirect to files page when checkbox is ticked", async () => {
      const req = mockRequest({
        body: { artefactId: "12345678-1234-1234-1234-123456789abc", agreed: "yes" }
      });
      const res = mockResponse();

      await postHandler(req, res, () => {});

      expect(res.redirect).toHaveBeenCalledWith("/sjp-public-list/list-download-files?artefactId=12345678-1234-1234-1234-123456789abc");
    });
  });
});
