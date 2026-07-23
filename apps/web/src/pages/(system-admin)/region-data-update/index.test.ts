import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./index.js";

vi.mock("@hmcts/auth", () => ({
  requireRole: () => (_req: Request, _res: Response, next: () => void) => next(),
  USER_ROLES: { SYSTEM_ADMIN: "SYSTEM_ADMIN" }
}));

vi.mock("@hmcts/system-admin-pages", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@hmcts/system-admin-pages")>();
  return { ...actual, updateJurisdictionData: vi.fn() };
});

import { updateJurisdictionData } from "@hmcts/system-admin-pages";

describe("region-data-update page", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();
    req = {
      query: {},
      body: {},
      session: { jurisdictionData: { id: 5, type: "Region", name: "North", welshName: "Gogledd" } } as any
    };
    res = { render: vi.fn(), redirect: vi.fn(), locals: { locale: "en" } };
  });

  describe("GET", () => {
    it("should render update form with current data", async () => {
      // Act
      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      expect(res.render).toHaveBeenCalledWith(
        "region-data-update/index",
        expect.objectContaining({
          t: expect.objectContaining({ title: "Update Region Data" }),
          data: { name: "North", welshName: "Gogledd" },
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
      expect(res.redirect).toHaveBeenCalledWith("/region-data-list");
    });
  });

  describe("POST", () => {
    it("should redirect to success on valid update", async () => {
      // Arrange
      req.body = { name: "North East", welshName: "Gogledd Ddwyrain" };
      vi.mocked(updateJurisdictionData).mockResolvedValue([]);

      // Act
      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      expect(updateJurisdictionData).toHaveBeenCalledWith(5, "Region", { name: "North East", welshName: "Gogledd Ddwyrain" });
      expect(res.redirect).toHaveBeenCalledWith("/region-data-update-success");
    });

    it("should re-render with errors on validation failure", async () => {
      // Arrange
      req.body = { name: "", welshName: "Gogledd" };
      vi.mocked(updateJurisdictionData).mockResolvedValue([{ text: "Enter the name in English", href: "#name" }]);

      // Act
      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      expect(res.render).toHaveBeenCalledWith(
        "region-data-update/index",
        expect.objectContaining({
          errors: [{ text: "Enter the name in English", href: "#name" }],
          data: { name: "", welshName: "Gogledd" }
        })
      );
    });

    it("should redirect to list when no session data", async () => {
      // Arrange
      req.session = {} as any;

      // Act
      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      expect(res.redirect).toHaveBeenCalledWith("/region-data-list");
    });
  });
});
