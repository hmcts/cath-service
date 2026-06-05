import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./index.js";

vi.mock("@hmcts/auth", () => ({
  requireRole: () => (_req: Request, _res: Response, next: () => void) => next(),
  USER_ROLES: { SYSTEM_ADMIN: "SYSTEM_ADMIN" }
}));

vi.mock("@hmcts/location", () => ({
  getLocationWithDetails: vi.fn()
}));

import { getLocationWithDetails } from "@hmcts/location";

describe("location-jurisdiction-search page", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();
    req = { query: {}, body: {}, session: {} as any };
    res = { render: vi.fn(), redirect: vi.fn() };
  });

  describe("GET", () => {
    it("should render search page", async () => {
      // Act
      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      expect(res.render).toHaveBeenCalledWith(
        "location-jurisdiction-search/index",
        expect.objectContaining({ heading: "Find the Jurisdiction data to manage" })
      );
    });
  });

  describe("POST", () => {
    it("should store location in session and redirect when valid", async () => {
      // Arrange
      req.body = { locationId: "100" };
      vi.mocked(getLocationWithDetails).mockResolvedValue({
        locationId: 100,
        name: "Test Court",
        welshName: "Llys Prawf"
      } as any);

      // Act
      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      expect((req.session as any).locationJurisdiction).toEqual({
        locationId: 100,
        locationName: "Test Court",
        locationWelshName: "Llys Prawf"
      });
      expect(res.redirect).toHaveBeenCalledWith("/location-jurisdiction-manage");
    });

    it("should redirect with error when no location selected", async () => {
      // Arrange
      req.body = {};

      // Act
      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      expect((req.session as any).locationJurisdictionSearchErrors).toEqual([
        { text: "Court or tribunal name must be 3 characters or more", href: "#location-search" }
      ]);
      expect(res.redirect).toHaveBeenCalledWith("/location-jurisdiction-search");
    });

    it("should redirect with error when location not found", async () => {
      // Arrange
      req.body = { locationId: "999" };
      vi.mocked(getLocationWithDetails).mockResolvedValue(null as any);

      // Act
      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      expect((req.session as any).locationJurisdictionSearchErrors).toEqual([{ text: "There are no matching results", href: "#location-search" }]);
    });

    it("should redirect with error when user typed but did not select", async () => {
      // Arrange
      req.body = { "location-search-display": "Blackburn", locationId: "" };

      // Act
      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      expect((req.session as any).locationJurisdictionSearchErrors).toEqual([{ text: "There are no matching results", href: "#location-search" }]);
    });
  });
});
