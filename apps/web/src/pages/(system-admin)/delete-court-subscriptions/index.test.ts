import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET as _GET, POST as _POST } from "./index.js";

const getHandler = _GET[_GET.length - 1];
const postHandler = _POST[_POST.length - 1];

vi.mock("@hmcts/location", () => ({
  getLocationWithDetails: vi.fn()
}));

vi.mock("@hmcts/system-admin-pages", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@hmcts/system-admin-pages")>();
  return {
    ...actual,
    AuditLogAction: {
      DELETE_COURT_SUBSCRIPTIONS: "Delete court subscriptions"
    },
    performLocationSubscriptionsDeletion: vi.fn(),
    validateDeleteCourtRadioSelection: vi.fn()
  };
});

import { getLocationWithDetails } from "@hmcts/location";
import { performLocationSubscriptionsDeletion, validateDeleteCourtRadioSelection } from "@hmcts/system-admin-pages";

const mockLocation = {
  locationId: 123,
  name: "Test Court",
  welshName: "Llys Prawf",
  regions: [{ name: "South East", welshName: "De Ddwyrain" }],
  subJurisdictions: [{ jurisdictionName: "Civil", jurisdictionWelshName: "Sifil" }]
};

describe("delete-court-subscriptions page", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();
    req = { query: {}, body: {}, session: {} as any };
    res = { render: vi.fn(), redirect: vi.fn() };
  });

  describe("getHandler", () => {
    it("should redirect to delete-court if no session data", async () => {
      req.session = {} as any;

      await getHandler(req as Request, res as Response);

      expect(res.redirect).toHaveBeenCalledWith("/delete-court");
    });

    it("should render the confirmation page with location details", async () => {
      req.session = { deleteCourt: { locationId: 123, name: "Test", welshName: "Prawf" } } as any;
      (getLocationWithDetails as any).mockResolvedValue(mockLocation);

      await getHandler(req as Request, res as Response);

      expect(res.render).toHaveBeenCalledWith(
        "delete-court-subscriptions/index",
        expect.objectContaining({ locationName: "Test Court", jurisdiction: "Civil", region: "South East" })
      );
    });
  });

  describe("postHandler", () => {
    it("should redirect to delete-court when user selects no", async () => {
      req.session = { deleteCourt: { locationId: 123, name: "Test", welshName: "Prawf" } } as any;
      req.body = { confirmDelete: "no" };
      (validateDeleteCourtRadioSelection as any).mockReturnValue(null);

      await postHandler(req as Request, res as Response);

      expect(res.redirect).toHaveBeenCalledWith("/delete-court");
      expect(performLocationSubscriptionsDeletion).not.toHaveBeenCalled();
    });

    it("should delete subscriptions and redirect to the success page when user selects yes", async () => {
      req.session = { deleteCourt: { locationId: 123, name: "Test", welshName: "Prawf" } } as any;
      req.body = { confirmDelete: "yes" };
      req.user = { email: "requester@example.com" } as any;
      (validateDeleteCourtRadioSelection as any).mockReturnValue(null);
      (performLocationSubscriptionsDeletion as any).mockResolvedValue(undefined);

      await postHandler(req as Request, res as Response);

      expect(performLocationSubscriptionsDeletion).toHaveBeenCalledWith(123, "Test", "requester@example.com");
      expect(req.auditMetadata).toEqual(expect.objectContaining({ shouldLog: true, action: "Delete court subscriptions" }));
      expect(res.redirect).toHaveBeenCalledWith("/delete-court-subscriptions-success");
    });

    it("should re-render with validation error when no radio selected", async () => {
      req.session = { deleteCourt: { locationId: 123, name: "Test", welshName: "Prawf" } } as any;
      req.body = {};
      (validateDeleteCourtRadioSelection as any).mockReturnValue({ href: "#confirm-delete" });
      (getLocationWithDetails as any).mockResolvedValue(mockLocation);

      await postHandler(req as Request, res as Response);

      expect(res.render).toHaveBeenCalledWith(
        "delete-court-subscriptions/index",
        expect.objectContaining({ errors: expect.arrayContaining([expect.objectContaining({ href: "#confirm-delete" })]) })
      );
    });
  });
});
