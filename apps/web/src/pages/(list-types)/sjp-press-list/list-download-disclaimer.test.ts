import type { NextFunction, Request, RequestHandler, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./list-download-disclaimer.js";

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

import { prisma } from "@hmcts/postgres-prisma";

const middleware = GET[0] as RequestHandler;
const getHandler = GET[GET.length - 1] as RequestHandler;
const postHandler = POST[POST.length - 1] as RequestHandler;

describe("List Download Disclaimer Controller", () => {
  const mockRequest = (overrides?: Partial<Request>) =>
    ({
      query: {},
      body: {},
      path: "/sjp-press-list/list-download-disclaimer",
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

      expect(res.redirect).toHaveBeenCalledWith("/sjp-press-list/list-download-files?artefactId=12345678-1234-1234-1234-123456789abc");
    });

    it("should render 400 when artefactId is not a valid UUID", async () => {
      const req = mockRequest({
        body: { artefactId: "invalid", agreed: "yes" }
      });
      const res = mockResponse();

      await postHandler(req, res, () => {});

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.render).toHaveBeenCalledWith("errors/400", expect.any(Object));
    });
  });

  describe("requireVerifiedWithProvenance middleware", () => {
    const mockNext = vi.fn() as unknown as NextFunction;

    it("should redirect to sign-in when user is not verified", async () => {
      const req = mockRequest({
        query: { artefactId: "12345678-1234-1234-1234-123456789abc" },
        user: { role: "BASIC" },
        originalUrl: "/sjp-press-list/list-download-disclaimer?artefactId=12345678-1234-1234-1234-123456789abc",
        session: {}
      } as Partial<Request>);
      const res = mockResponse();

      await middleware(req, res, mockNext);

      expect(res.redirect).toHaveBeenCalledWith("/sign-in");
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should redirect to sign-in when user has no provenance", async () => {
      const req = mockRequest({
        query: { artefactId: "12345678-1234-1234-1234-123456789abc" },
        user: { role: "VERIFIED", provenance: undefined },
        originalUrl: "/sjp-press-list/list-download-disclaimer",
        session: {}
      } as Partial<Request>);
      const res = mockResponse();

      await middleware(req, res, mockNext);

      expect(res.redirect).toHaveBeenCalledWith("/sign-in");
    });

    it("should redirect to sign-in when artefactId is invalid", async () => {
      const req = mockRequest({
        query: { artefactId: "invalid" },
        user: { role: "VERIFIED", provenance: "PI_AAD" },
        originalUrl: "/sjp-press-list/list-download-disclaimer",
        session: {}
      } as Partial<Request>);
      const res = mockResponse();

      await middleware(req, res, mockNext);

      expect(res.redirect).toHaveBeenCalledWith("/sign-in");
    });

    it("should redirect to sign-in when artefact is not found", async () => {
      const req = mockRequest({
        query: { artefactId: "12345678-1234-1234-1234-123456789abc" },
        user: { role: "VERIFIED", provenance: "PI_AAD" },
        originalUrl: "/sjp-press-list/list-download-disclaimer",
        session: {}
      } as Partial<Request>);
      const res = mockResponse();

      vi.mocked(prisma.artefact.findUnique).mockResolvedValue(null);

      await middleware(req, res, mockNext);

      expect(res.redirect).toHaveBeenCalledWith("/sign-in");
    });

    it("should redirect to sign-in when provenance does not match", async () => {
      const req = mockRequest({
        query: { artefactId: "12345678-1234-1234-1234-123456789abc" },
        user: { role: "VERIFIED", provenance: "CRIME_IDAM" },
        originalUrl: "/sjp-press-list/list-download-disclaimer",
        session: {}
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
        user: { role: "VERIFIED", provenance: "PI_AAD" },
        originalUrl: "/sjp-press-list/list-download-disclaimer",
        session: {}
      } as Partial<Request>);
      const res = mockResponse();

      vi.mocked(prisma.artefact.findUnique).mockResolvedValue({ artefactId: "12345678-1234-1234-1234-123456789abc", listTypeId: 24 } as never);
      vi.mocked(prisma.listType.findUnique).mockResolvedValue({ id: 24, allowedProvenance: "PI_AAD" } as never);

      await middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(res.redirect).not.toHaveBeenCalled();
    });

    it("should use artefactId from body when not in query", async () => {
      const req = mockRequest({
        query: {},
        body: { artefactId: "12345678-1234-1234-1234-123456789abc" },
        user: { role: "VERIFIED", provenance: "PI_AAD" },
        originalUrl: "/sjp-press-list/list-download-disclaimer",
        session: {}
      } as Partial<Request>);
      const res = mockResponse();

      vi.mocked(prisma.artefact.findUnique).mockResolvedValue({ artefactId: "12345678-1234-1234-1234-123456789abc", listTypeId: 24 } as never);
      vi.mocked(prisma.listType.findUnique).mockResolvedValue({ id: 24, allowedProvenance: "PI_AAD" } as never);

      await middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });
});
