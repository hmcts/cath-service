import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getHandler, postHandler } from "./index.js";

// Mock dependencies
vi.mock("@hmcts/location", () => ({
  getLocationWithDetails: vi.fn()
}));

vi.mock("../../delete-court/service.js", () => ({
  validateLocationForDeletion: vi.fn(),
  performLocationDeletion: vi.fn()
}));

vi.mock("../../delete-court/validation.js", () => ({
  validateRadioSelection: vi.fn()
}));

import { getLocationWithDetails } from "@hmcts/location";
import { performLocationDeletion, validateLocationForDeletion } from "../../delete-court/service.js";
import { validateRadioSelection } from "../../delete-court/validation.js";

describe("delete-court-confirm page", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();

    req = {
      query: {},
      body: {},
      session: {} as any
    };

    res = {
      render: vi.fn(),
      redirect: vi.fn()
    };
  });

  describe("getHandler", () => {
    it("should redirect to delete-court if no session data", async () => {
      req.session = {} as any;

      await getHandler(req as Request, res as Response);

      expect(res.redirect).toHaveBeenCalledWith("/delete-court");
    });

    it("should redirect to delete-court if location not found", async () => {
      req.session = { deleteCourt: { locationId: 123, name: "Test", welshName: "Prawf" } } as any;
      (getLocationWithDetails as any).mockResolvedValue(null);

      await getHandler(req as Request, res as Response);

      expect(res.redirect).toHaveBeenCalledWith("/delete-court");
      expect((req.session as any).deleteCourt).toBeUndefined();
    });

    it("should render confirmation page with location details", async () => {
      req.session = { deleteCourt: { locationId: 123, name: "Test", welshName: "Prawf" } } as any;
      (getLocationWithDetails as any).mockResolvedValue({
        locationId: 123,
        name: "Test Court",
        welshName: "Llys Prawf",
        regions: [{ name: "South East", welshName: "De Ddwyrain" }],
        subJurisdictions: [{ jurisdictionName: "Civil", jurisdictionWelshName: "Sifil" }]
      });

      await getHandler(req as Request, res as Response);

      expect(res.render).toHaveBeenCalledWith(
        "delete-court-confirm/index",
        expect.objectContaining({
          locationName: "Test Court",
          locationType: "Court",
          jurisdiction: "Civil",
          region: "South East",
          errors: undefined
        })
      );
    });

    it("should render confirmation page in Welsh", async () => {
      req.query = { lng: "cy" };
      req.session = { deleteCourt: { locationId: 123, name: "Test", welshName: "Prawf" } } as any;
      (getLocationWithDetails as any).mockResolvedValue({
        locationId: 123,
        name: "Test Court",
        welshName: "Llys Prawf",
        regions: [{ name: "South East", welshName: "De Ddwyrain" }],
        subJurisdictions: [{ jurisdictionName: "Civil", jurisdictionWelshName: "Sifil" }]
      });

      await getHandler(req as Request, res as Response);

      expect(res.render).toHaveBeenCalledWith(
        "delete-court-confirm/index",
        expect.objectContaining({
          locationName: "Llys Prawf",
          jurisdiction: "Sifil",
          region: "De Ddwyrain"
        })
      );
    });
  });

  describe("postHandler", () => {
    it("should redirect to delete-court if no session data", async () => {
      req.session = {} as any;

      await postHandler(req as Request, res as Response);

      expect(res.redirect).toHaveBeenCalledWith("/delete-court");
    });

    it("should show validation error when no radio selected", async () => {
      req.session = { deleteCourt: { locationId: 123, name: "Test", welshName: "Prawf" } } as any;
      req.body = { confirmDelete: undefined };
      (validateRadioSelection as any).mockReturnValue({ href: "#confirmDelete" });
      (getLocationWithDetails as any).mockResolvedValue({
        locationId: 123,
        name: "Test Court",
        welshName: "Llys Prawf",
        regions: [{ name: "South East", welshName: "De Ddwyrain" }],
        subJurisdictions: [{ jurisdictionName: "Civil", jurisdictionWelshName: "Sifil" }]
      });

      await postHandler(req as Request, res as Response);

      expect(res.render).toHaveBeenCalledWith(
        "delete-court-confirm/index",
        expect.objectContaining({
          errors: expect.arrayContaining([expect.objectContaining({ href: "#confirmDelete" })])
        })
      );
    });

    it("should redirect to dashboard when user selects no", async () => {
      req.session = { deleteCourt: { locationId: 123, name: "Test", welshName: "Prawf" } } as any;
      req.body = { confirmDelete: "no" };
      (validateRadioSelection as any).mockReturnValue(null);

      await postHandler(req as Request, res as Response);

      expect(res.redirect).toHaveBeenCalledWith("/system-admin-dashboard");
      expect((req.session as any).deleteCourt).toBeUndefined();
    });

    it("should show error when location has active subscriptions", async () => {
      req.session = { deleteCourt: { locationId: 123, name: "Test", welshName: "Prawf" } } as any;
      req.body = { confirmDelete: "yes" };
      (validateRadioSelection as any).mockReturnValue(null);
      (validateLocationForDeletion as any).mockResolvedValue({
        isValid: false,
        errorCode: "ACTIVE_SUBSCRIPTIONS",
        location: {
          locationId: 123,
          name: "Test Court",
          welshName: "Llys Prawf",
          regions: [{ name: "South East", welshName: "De Ddwyrain" }],
          subJurisdictions: [{ jurisdictionName: "Civil", jurisdictionWelshName: "Sifil" }]
        }
      });

      await postHandler(req as Request, res as Response);

      expect(res.render).toHaveBeenCalledWith(
        "delete-court-confirm/index",
        expect.objectContaining({
          errors: expect.arrayContaining([expect.objectContaining({ text: expect.any(String) })])
        })
      );
    });

    it("should show error when location has active artefacts", async () => {
      req.session = { deleteCourt: { locationId: 123, name: "Test", welshName: "Prawf" } } as any;
      req.body = { confirmDelete: "yes" };
      (validateRadioSelection as any).mockReturnValue(null);
      (validateLocationForDeletion as any).mockResolvedValue({
        isValid: false,
        errorCode: "ACTIVE_ARTEFACTS",
        location: {
          locationId: 123,
          name: "Test Court",
          welshName: "Llys Prawf",
          regions: [{ name: "South East", welshName: "De Ddwyrain" }],
          subJurisdictions: [{ jurisdictionName: "Civil", jurisdictionWelshName: "Sifil" }]
        }
      });

      await postHandler(req as Request, res as Response);

      expect(res.render).toHaveBeenCalledWith(
        "delete-court-confirm/index",
        expect.objectContaining({
          errors: expect.arrayContaining([expect.objectContaining({ text: expect.any(String) })])
        })
      );
    });

    it("should redirect to delete-court when location validation fails and location not found", async () => {
      req.session = { deleteCourt: { locationId: 123, name: "Test", welshName: "Prawf" } } as any;
      req.body = { confirmDelete: "yes" };
      (validateRadioSelection as any).mockReturnValue(null);
      (validateLocationForDeletion as any).mockResolvedValue({
        isValid: false,
        errorCode: "LOCATION_NOT_FOUND",
        location: null
      });

      await postHandler(req as Request, res as Response);

      expect(res.redirect).toHaveBeenCalledWith("/delete-court");
      expect((req.session as any).deleteCourt).toBeUndefined();
    });

    it("should perform deletion and redirect to success page", async () => {
      req.session = { deleteCourt: { locationId: 123, name: "Test", welshName: "Prawf" } } as any;
      req.body = { confirmDelete: "yes" };
      (validateRadioSelection as any).mockReturnValue(null);
      (validateLocationForDeletion as any).mockResolvedValue({
        isValid: true
      });
      (performLocationDeletion as any).mockResolvedValue(undefined);

      await postHandler(req as Request, res as Response);

      expect(performLocationDeletion).toHaveBeenCalledWith(123);
      expect(res.redirect).toHaveBeenCalledWith("/delete-court-success");
    });

    it("should perform deletion and redirect to success page in Welsh", async () => {
      req.query = { lng: "cy" };
      req.session = { deleteCourt: { locationId: 123, name: "Test", welshName: "Prawf" } } as any;
      req.body = { confirmDelete: "yes" };
      (validateRadioSelection as any).mockReturnValue(null);
      (validateLocationForDeletion as any).mockResolvedValue({
        isValid: true
      });
      (performLocationDeletion as any).mockResolvedValue(undefined);

      await postHandler(req as Request, res as Response);

      expect(res.redirect).toHaveBeenCalledWith("/delete-court-success?lng=cy");
    });
  });
});
