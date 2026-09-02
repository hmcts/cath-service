import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./index.js";

vi.mock("@hmcts/auth", () => ({
  requireRole: () => (_req: Request, _res: Response, next: () => void) => next(),
  USER_ROLES: { SYSTEM_ADMIN: "SYSTEM_ADMIN" }
}));

vi.mock("@hmcts/system-admin-pages", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@hmcts/system-admin-pages")>();
  return {
    ...actual,
    getLocationJurisdictionDetails: vi.fn()
  };
});

import { getLocationJurisdictionDetails } from "@hmcts/system-admin-pages";

describe("location-jurisdiction-manage page", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();
    req = {
      query: {},
      session: {
        locationJurisdiction: { locationId: 100, locationName: "Test Court", locationWelshName: "Llys Prawf" }
      } as any
    };
    res = {
      render: vi.fn(),
      redirect: vi.fn(),
      locals: { locale: "en" }
    };
  });

  describe("GET", () => {
    it("should render manage page with jurisdiction data", async () => {
      // Arrange
      vi.mocked(getLocationJurisdictionDetails).mockResolvedValue({
        locationId: 100,
        name: "Test Court",
        locationSubJurisdictions: [{ subJurisdiction: { name: "County Court", jurisdiction: { name: "Civil" } } }],
        locationRegions: []
      } as any);

      // Act
      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      expect(res.render).toHaveBeenCalledWith(
        "location-jurisdiction-manage/index",
        expect.objectContaining({
          locationName: "Test Court",
          tableRows: [[{ text: "Test Court" }, { text: "Civil" }, { text: "County Court" }]]
        })
      );
    });

    it("should redirect to search when no session data", async () => {
      // Arrange
      req.session = {} as any;

      // Act
      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      expect(res.redirect).toHaveBeenCalledWith("/location-jurisdiction-search");
    });
  });
});
