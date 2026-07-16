import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./index.js";

vi.mock("@hmcts/auth", () => ({
  requireRole: () => (_req: Request, _res: Response, next: () => void) => next(),
  USER_ROLES: { SYSTEM_ADMIN: "SYSTEM_ADMIN" }
}));

describe("region-data page", () => {
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
    it("should render with two radio options", async () => {
      // Act
      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      const renderArgs = vi.mocked(res.render!).mock.calls[0][1] as any;
      expect(res.render).toHaveBeenCalledWith("region-data/index", expect.any(Object));
      expect(renderArgs.radioItems).toHaveLength(2);
      expect(renderArgs.radioItems[0].value).toBe("create");
      expect(renderArgs.radioItems[1].value).toBe("modify");
    });

    it("should render Welsh content when locale is cy", async () => {
      // Arrange
      res.locals = { locale: "cy" };

      // Act
      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      const renderArgs = vi.mocked(res.render!).mock.calls[0][1] as any;
      expect(renderArgs.radioItems[0].text).toBe("Creu rhanbarth newydd");
    });
  });

  describe("POST", () => {
    it("should redirect to region create page when create selected", async () => {
      // Arrange
      req.body = { action: "create" };

      // Act
      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      expect(res.redirect).toHaveBeenCalledWith("/region-data-create");
    });

    it("should redirect to region list page when modify selected", async () => {
      // Arrange
      req.body = { action: "modify" };

      // Act
      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      expect(res.redirect).toHaveBeenCalledWith("/region-data-list");
    });

    it("should re-render with error when no option selected", async () => {
      // Arrange
      req.body = {};

      // Act
      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      expect(res.render).toHaveBeenCalledWith(
        "region-data/index",
        expect.objectContaining({
          errors: [{ text: "Please select one option", href: "#action" }],
          radioError: { text: "Please select one option" }
        })
      );
    });
  });
});
