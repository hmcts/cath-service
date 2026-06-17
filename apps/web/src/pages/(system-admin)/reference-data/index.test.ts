import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./index.js";

vi.mock("@hmcts/auth", () => ({
  requireRole: () => (_req: Request, _res: Response, next: () => void) => next(),
  USER_ROLES: { SYSTEM_ADMIN: "SYSTEM_ADMIN" }
}));

describe("reference-data landing page", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();
    req = { query: {}, body: {} };
    res = {
      render: vi.fn(),
      redirect: vi.fn(),
      locals: { locale: "en" }
    };
  });

  describe("GET", () => {
    it("should render tiles template in English", async () => {
      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(res.render).toHaveBeenCalledWith(
        "reference-data/index-tiles",
        expect.objectContaining({
          t: expect.objectContaining({ title: "What do you want to do?" }),
          radioItems: expect.arrayContaining([expect.objectContaining({ value: "upload-reference-data" })])
        })
      );
    });

    it("should render in Welsh when locale is cy", async () => {
      res.locals = { locale: "cy" };

      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(res.render).toHaveBeenCalledWith(
        "reference-data/index-tiles",
        expect.objectContaining({
          t: expect.objectContaining({ title: "Beth yr ydych eisiau ei wneud?" })
        })
      );
    });
  });

  describe("POST", () => {
    it("should redirect to upload page when upload-reference-data selected", async () => {
      req.body = { action: "upload-reference-data" };

      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(res.redirect).toHaveBeenCalledWith("/reference-data-upload");
    });

    it("should redirect to jurisdiction data when manage-jurisdiction-data selected", async () => {
      req.body = { action: "manage-jurisdiction-data" };

      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(res.redirect).toHaveBeenCalledWith("/jurisdiction-data");
    });

    it("should redirect to location jurisdiction search when manage-location-jurisdiction-data selected", async () => {
      req.body = { action: "manage-location-jurisdiction-data" };

      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(res.redirect).toHaveBeenCalledWith("/location-jurisdiction-search");
    });

    it("should redirect to location metadata search when manage-location-metadata selected", async () => {
      req.body = { action: "manage-location-metadata" };

      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(res.redirect).toHaveBeenCalledWith("/location-metadata-search");
    });

    it("should re-render with error when no selection made", async () => {
      req.body = {};

      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(res.render).toHaveBeenCalledWith(
        "reference-data/index-radios",
        expect.objectContaining({
          errors: [{ text: "Please select one option", href: "#action" }],
          radioError: { text: "Please select one option" }
        })
      );
    });
  });
});
