import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./index.js";

vi.mock("@hmcts/auth", () => ({
  requireRole: () => (_req: Request, _res: Response, next: () => void) => next(),
  USER_ROLES: { SYSTEM_ADMIN: "SYSTEM_ADMIN" }
}));

vi.mock("../../jurisdiction-management/jurisdiction-management-service.js", () => ({
  getLocationJurisdictionDetails: vi.fn(),
  updateLocationJurisdictionData: vi.fn()
}));

vi.mock("../../jurisdiction-management/jurisdiction-management-queries.js", () => ({
  listJurisdictionsWithSubJurisdictions: vi.fn(),
  listRegions: vi.fn()
}));

import { listJurisdictionsWithSubJurisdictions, listRegions } from "../../jurisdiction-management/jurisdiction-management-queries.js";
import { getLocationJurisdictionDetails, updateLocationJurisdictionData } from "../../jurisdiction-management/jurisdiction-management-service.js";

describe("location-jurisdiction-update page", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();
    req = {
      query: {},
      body: {},
      session: {
        locationJurisdiction: { locationId: 100, locationName: "Test Court", locationWelshName: "Llys Prawf" }
      } as any,
      user: { email: "admin@example.com" } as any
    };
    res = { render: vi.fn(), redirect: vi.fn() };
  });

  describe("GET", () => {
    it("should render update form with grouped jurisdiction data", async () => {
      // Arrange
      vi.mocked(listJurisdictionsWithSubJurisdictions).mockResolvedValue([
        {
          jurisdictionId: 1,
          name: "Civil",
          welshName: "Sifil",
          deletedAt: null,
          subJurisdictions: [{ subJurisdictionId: 10, name: "County Court", welshName: "Llys Sirol", jurisdictionId: 1, deletedAt: null }]
        }
      ] as any);
      vi.mocked(listRegions).mockResolvedValue([{ regionId: 5, name: "London", welshName: "Llundain", deletedAt: null }] as any);
      vi.mocked(getLocationJurisdictionDetails).mockResolvedValue({
        locationSubJurisdictions: [{ subJurisdiction: { subJurisdictionId: 10 } }],
        locationRegions: [{ region: { regionId: 5 } }]
      } as any);

      // Act
      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      expect(res.render).toHaveBeenCalledWith(
        "location-jurisdiction-update/index-dropdowns",
        expect.objectContaining({
          locationName: "Test Court",
          subJurisdictionGroups: [
            {
              heading: "Type of civil court",
              items: [{ value: "10", text: "County Court", checked: true }]
            }
          ],
          regionCheckboxes: [{ value: "5", text: "London", checked: true }]
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

  describe("POST", () => {
    it("should update and redirect to success", async () => {
      // Arrange
      req.body = { subJurisdictionIds: ["10", "11"], regionIds: "5" };
      vi.mocked(updateLocationJurisdictionData).mockResolvedValue();

      // Act
      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      expect(updateLocationJurisdictionData).toHaveBeenCalledWith(100, { subJurisdictionIds: [10, 11], regionIds: [5] }, "admin@example.com");
      expect(res.redirect).toHaveBeenCalledWith("/location-jurisdiction-update-success");
    });

    it("should redirect to search when no session data on POST", async () => {
      // Arrange
      req.session = {} as any;

      // Act
      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      // Assert
      expect(res.redirect).toHaveBeenCalledWith("/location-jurisdiction-search");
    });
  });
});
