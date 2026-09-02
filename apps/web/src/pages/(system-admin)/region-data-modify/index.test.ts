import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./index.js";

vi.mock("@hmcts/auth", () => ({
  requireRole: () => (_req: Request, _res: Response, next: () => void) => next(),
  USER_ROLES: { SYSTEM_ADMIN: "SYSTEM_ADMIN" }
}));

vi.mock("@hmcts/system-admin-pages", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@hmcts/system-admin-pages")>();
  return { ...actual, findJurisdictionDataById: vi.fn() };
});

import { findJurisdictionDataById } from "@hmcts/system-admin-pages";

describe("region-data-modify page", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();
    req = { query: { id: "5" }, session: {} as any };
    res = { render: vi.fn(), redirect: vi.fn(), locals: { locale: "en" } };
  });

  describe("GET", () => {
    it("should render modify page with region record", async () => {
      // Arrange
      vi.mocked(findJurisdictionDataById).mockResolvedValue({ id: 5, name: "North", welshName: "Gogledd", type: "Region" } as any);

      // Act
      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      expect(findJurisdictionDataById).toHaveBeenCalledWith(5, "Region");
      expect(res.render).toHaveBeenCalledWith(
        "region-data-modify/index",
        expect.objectContaining({
          record: { name: "North", type: "Region" },
          updateHref: "/region-data-update",
          deleteHref: "/region-data-delete"
        })
      );
    });

    it("should store record in session", async () => {
      // Arrange
      vi.mocked(findJurisdictionDataById).mockResolvedValue({ id: 5, name: "North", welshName: "Gogledd", type: "Region" } as any);

      // Act
      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      expect((req.session as any).jurisdictionData).toEqual({ id: 5, type: "Region", name: "North", welshName: "Gogledd" });
    });

    it("should redirect to list when id is invalid", async () => {
      // Arrange
      req.query = { id: "notanumber" };

      // Act
      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      expect(res.redirect).toHaveBeenCalledWith("/region-data-list");
    });

    it("should redirect to list when record not found", async () => {
      // Arrange
      vi.mocked(findJurisdictionDataById).mockResolvedValue(null);

      // Act
      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      expect(res.redirect).toHaveBeenCalledWith("/region-data-list");
    });
  });
});
