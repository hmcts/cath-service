import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./index.js";

vi.mock("@hmcts/auth", () => ({
  requireRole: () => (_req: Request, _res: Response, next: () => void) => next(),
  USER_ROLES: { SYSTEM_ADMIN: "SYSTEM_ADMIN" }
}));

vi.mock("@hmcts/system-admin-pages", () => ({
  deleteJurisdictionData: vi.fn(),
  findLocationsByRegionId: vi.fn()
}));

import { deleteJurisdictionData, findLocationsByRegionId } from "@hmcts/system-admin-pages";

describe("region-data-delete page", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();
    req = {
      body: {},
      session: { jurisdictionData: { id: 5, type: "Region", name: "North", welshName: "Gogledd" } } as any
    };
    res = { render: vi.fn(), redirect: vi.fn(), locals: { locale: "en" } };
  });

  describe("GET", () => {
    it("should render delete confirmation page with region name only", async () => {
      // Act
      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      expect(res.render).toHaveBeenCalledWith(
        "region-data-delete/index",
        expect.objectContaining({
          record: { name: "North" },
          radioError: undefined,
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
    it("should redirect to success when yes selected and delete succeeds", async () => {
      // Arrange
      req.body = { confirmation: "yes" };
      vi.mocked(deleteJurisdictionData).mockResolvedValue([]);

      // Act
      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      expect(deleteJurisdictionData).toHaveBeenCalledWith(5, "Region", expect.objectContaining({ userEmail: expect.any(String) }));
      expect(res.redirect).toHaveBeenCalledWith("/region-data-delete-success");
    });

    it("should redirect to modify when no selected", async () => {
      // Arrange
      req.body = { confirmation: "no" };

      // Act
      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      expect(res.redirect).toHaveBeenCalledWith("/region-data-modify?id=5&type=Region");
    });

    it("should re-render with error when no selection made", async () => {
      // Arrange
      req.body = {};

      // Act
      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      expect(res.render).toHaveBeenCalledWith(
        "region-data-delete/index",
        expect.objectContaining({
          radioError: { text: "Please select one option" },
          errors: [{ text: "Please select one option", href: "#confirmation" }]
        })
      );
    });

    it("should re-render with errors and linked locations when delete fails due to dependencies", async () => {
      // Arrange
      req.body = { confirmation: "yes" };
      vi.mocked(deleteJurisdictionData).mockResolvedValue([{ text: "Cannot delete", href: "#" }]);
      vi.mocked(findLocationsByRegionId).mockResolvedValue([{ locationId: 3, name: "Oxford Combined Court Centre" } as any]);

      // Act
      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      expect(findLocationsByRegionId).toHaveBeenCalledWith(5);
      expect(res.render).toHaveBeenCalledWith(
        "region-data-delete/index",
        expect.objectContaining({
          errors: [{ text: "Cannot delete", href: "#" }],
          linkedLocations: [{ locationId: 3, name: "Oxford Combined Court Centre" }]
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
