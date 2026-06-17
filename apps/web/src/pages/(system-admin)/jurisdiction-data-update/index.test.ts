import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./index.js";

vi.mock("@hmcts/auth", () => ({
  requireRole: () => (_req: Request, _res: Response, next: () => void) => next(),
  USER_ROLES: { SYSTEM_ADMIN: "SYSTEM_ADMIN" }
}));

vi.mock("../../jurisdiction-management/jurisdiction-management-service.js", () => ({
  updateJurisdictionData: vi.fn()
}));

import { updateJurisdictionData } from "../../jurisdiction-management/jurisdiction-management-service.js";

describe("jurisdiction-data-update page", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();
    req = {
      query: {},
      body: {},
      session: {
        jurisdictionData: { id: 1, type: "Jurisdiction", name: "Civil", welshName: "Sifil" }
      } as any
    };
    res = {
      render: vi.fn(),
      redirect: vi.fn()
    };
  });

  describe("GET", () => {
    it("should render form pre-populated with session data", async () => {
      // Act
      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      expect(res.render).toHaveBeenCalledWith(
        "jurisdiction-data-update/index",
        expect.objectContaining({
          data: { name: "Civil", welshName: "Sifil" },
          errors: undefined
        })
      );
    });

    it("should redirect to list when no session data", async () => {
      // Arrange
      req.session = {} as any;

      // Act
      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      expect(res.redirect).toHaveBeenCalledWith("/jurisdiction-data-list");
    });
  });

  describe("POST", () => {
    it("should redirect to success when validation passes", async () => {
      // Arrange
      req.body = { name: "Updated", welshName: "Diweddarwyd" };
      vi.mocked(updateJurisdictionData).mockResolvedValue([]);

      // Act
      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      expect(updateJurisdictionData).toHaveBeenCalledWith(1, "Jurisdiction", { name: "Updated", welshName: "Diweddarwyd" });
      expect(res.redirect).toHaveBeenCalledWith("/jurisdiction-data-update-success");
    });

    it("should re-render with errors when validation fails", async () => {
      // Arrange
      req.body = { name: "", welshName: "Sifil" };
      vi.mocked(updateJurisdictionData).mockResolvedValue([{ text: "Enter the name in English", href: "#name" }]);

      // Act
      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      expect(res.render).toHaveBeenCalledWith(
        "jurisdiction-data-update/index",
        expect.objectContaining({
          errors: [{ text: "Enter the name in English", href: "#name" }],
          data: { name: "", welshName: "Sifil" }
        })
      );
    });

    it("should redirect to list when no session data on POST", async () => {
      // Arrange
      req.session = {} as any;

      // Act
      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      expect(res.redirect).toHaveBeenCalledWith("/jurisdiction-data-list");
    });
  });
});
