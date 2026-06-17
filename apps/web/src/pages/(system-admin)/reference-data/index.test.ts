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
      redirect: vi.fn()
    };
  });

  describe("GET", () => {
    it("should render tiles template in English", async () => {
      // Arrange / Act
      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      expect(res.render).toHaveBeenCalledWith(
        "reference-data/index-tiles",
        expect.objectContaining({
          title: "What do you want to do?",
          options: expect.arrayContaining([expect.objectContaining({ value: "upload-reference-data" })])
        })
      );
    });

    it("should render in Welsh when lng=cy", async () => {
      // Arrange
      req.query = { lng: "cy" };

      // Act
      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      expect(res.render).toHaveBeenCalledWith(
        "reference-data/index-tiles",
        expect.objectContaining({
          title: "Beth yr ydych eisiau ei wneud?"
        })
      );
    });
  });

  describe("POST", () => {
    it("should redirect to upload page when upload-reference-data selected", async () => {
      // Arrange
      req.body = { action: "upload-reference-data" };

      // Act
      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      expect(res.redirect).toHaveBeenCalledWith("/reference-data-upload");
    });

    it("should redirect to jurisdiction data when manage-jurisdiction-data selected", async () => {
      // Arrange
      req.body = { action: "manage-jurisdiction-data" };

      // Act
      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      expect(res.redirect).toHaveBeenCalledWith("/jurisdiction-data");
    });

    it("should redirect to location jurisdiction search when manage-location-jurisdiction-data selected", async () => {
      // Arrange
      req.body = { action: "manage-location-jurisdiction-data" };

      // Act
      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      expect(res.redirect).toHaveBeenCalledWith("/location-jurisdiction-search");
    });

    it("should redirect to location metadata search when manage-location-metadata selected", async () => {
      // Arrange
      req.body = { action: "manage-location-metadata" };

      // Act
      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      expect(res.redirect).toHaveBeenCalledWith("/location-metadata-search");
    });

    it("should re-render with error when no selection made", async () => {
      // Arrange
      req.body = {};

      // Act
      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      expect(res.render).toHaveBeenCalledWith(
        "reference-data/index-radios",
        expect.objectContaining({
          errors: [{ text: "Please select one option", href: "#action" }],
          radioError: { text: "Please select one option" }
        })
      );
    });

    it("should append lng=cy to redirect when in Welsh", async () => {
      // Arrange
      req.query = { lng: "cy" };
      req.body = { action: "upload-reference-data" };

      // Act
      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      expect(res.redirect).toHaveBeenCalledWith("/reference-data-upload?lng=cy");
    });
  });
});
