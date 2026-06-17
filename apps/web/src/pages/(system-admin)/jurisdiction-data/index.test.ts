import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./index.js";

vi.mock("@hmcts/auth", () => ({
  requireRole: () => (_req: Request, _res: Response, next: () => void) => next(),
  USER_ROLES: { SYSTEM_ADMIN: "SYSTEM_ADMIN" }
}));

describe("jurisdiction-data landing page", () => {
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
    it("should render the page with radio options", async () => {
      // Act
      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      expect(res.render).toHaveBeenCalledWith(
        "jurisdiction-data/index",
        expect.objectContaining({
          title: "What do you want to do?",
          radioItems: expect.arrayContaining([expect.objectContaining({ value: "create" }), expect.objectContaining({ value: "modify" })])
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
        "jurisdiction-data/index",
        expect.objectContaining({
          title: "Beth yr ydych eisiau ei wneud?"
        })
      );
    });
  });

  describe("POST", () => {
    it("should redirect to create page when create selected", async () => {
      // Arrange
      req.body = { action: "create" };

      // Act
      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      expect(res.redirect).toHaveBeenCalledWith("/jurisdiction-data-create");
    });

    it("should redirect to list page when modify selected", async () => {
      // Arrange
      req.body = { action: "modify" };

      // Act
      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      expect(res.redirect).toHaveBeenCalledWith("/jurisdiction-data-list");
    });

    it("should re-render with error when no selection made", async () => {
      // Arrange
      req.body = {};

      // Act
      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      expect(res.render).toHaveBeenCalledWith(
        "jurisdiction-data/index",
        expect.objectContaining({
          errors: [{ text: "Please select one option", href: "#action" }],
          radioError: { text: "Please select one option" }
        })
      );
    });

    it("should append lng=cy to redirect when in Welsh", async () => {
      // Arrange
      req.query = { lng: "cy" };
      req.body = { action: "create" };

      // Act
      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      expect(res.redirect).toHaveBeenCalledWith("/jurisdiction-data-create?lng=cy");
    });
  });
});
