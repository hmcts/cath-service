import * as locationService from "@hmcts/location";
import type { Request, Response } from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";
import { GET } from "./index.js";

vi.mock("@hmcts/auth", () => ({
  buildVerifiedUserNavigation: vi.fn(() => []),
  requireAuth: vi.fn(() => (_req: any, _res: any, next: any) => next()),
  blockUserAccess: vi.fn(() => (_req: any, _res: any, next: any) => next())
}));

vi.mock("@hmcts/location", () => ({
  getLocationById: vi.fn((id) => ({
    locationId: id,
    name: `Location ${id}`,
    welshName: `Lleoliad ${id}`
  }))
}));

describe("subscription-confirmed", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockReq = {
      session: {
        emailSubscriptions: {
          confirmationComplete: true,
          confirmedLocations: ["456", "789"]
        }
      } as any,
      path: "/subscription-confirmed"
    };
    mockRes = {
      render: vi.fn(),
      redirect: vi.fn(),
      locals: { locale: "en" }
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("translations", () => {
    describe("en", () => {
      it("should have all required translation keys", () => {
        expect(en.title).toBeDefined();
        expect(en.panelTitle).toBeDefined();
        expect(en.panelTitlePlural).toBeDefined();
        expect(en.continueText).toBeDefined();
        expect(en.yourAccountLink).toBeDefined();
        expect(en.inOrderTo).toBeDefined();
        expect(en.addNewSubscriptionLink).toBeDefined();
        expect(en.manageSubscriptionsLink).toBeDefined();
        expect(en.findCourtLink).toBeDefined();
      });
    });

    describe("cy", () => {
      it("should have all required translation keys matching en", () => {
        const enKeys = Object.keys(en);
        const cyKeys = Object.keys(cy);

        expect(cyKeys).toEqual(enKeys);
      });
    });
  });

  describe("GET", () => {
    it("should render page with confirmed locations", async () => {
      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "subscription-confirmed/index",
        expect.objectContaining({
          locations: expect.arrayContaining(["Location 456", "Location 789"]),
          isPlural: true
        })
      );
      expect(mockReq.session?.emailSubscriptions?.confirmationComplete).toBeUndefined();
      expect(mockReq.session?.emailSubscriptions?.confirmedLocations).toBeUndefined();
    });

    it("should redirect if confirmation not complete", async () => {
      mockReq.session = { emailSubscriptions: {} } as any;

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.redirect).toHaveBeenCalledWith("/subscription-management");
    });

    it("should handle single confirmed location", async () => {
      mockReq.session = {
        emailSubscriptions: {
          confirmationComplete: true,
          confirmedLocations: ["456"]
        }
      } as any;

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "subscription-confirmed/index",
        expect.objectContaining({
          isPlural: false
        })
      );
    });

    it("should handle empty confirmed locations", async () => {
      mockReq.session = {
        emailSubscriptions: {
          confirmationComplete: true,
          confirmedLocations: []
        }
      } as any;

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "subscription-confirmed/index",
        expect.objectContaining({
          locations: []
        })
      );
    });

    it("should render page with Welsh translations when locale is cy", async () => {
      mockRes.locals = { locale: "cy" };

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "subscription-confirmed/index",
        expect.objectContaining({
          title: cy.title,
          panelTitle: cy.panelTitlePlural
        })
      );
    });

    it("should use Welsh location names when locale is cy", async () => {
      mockRes.locals = { locale: "cy" };

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "subscription-confirmed/index",
        expect.objectContaining({
          locations: expect.arrayContaining(["Lleoliad 456", "Lleoliad 789"])
        })
      );
    });

    it("should set navigation items", async () => {
      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.locals?.navigation).toBeDefined();
      expect(mockRes.locals?.navigation?.verifiedItems).toBeDefined();
    });

    it("should use singular panel title when only one subscription", async () => {
      mockReq.session = {
        emailSubscriptions: {
          confirmationComplete: true,
          confirmedLocations: ["456"]
        }
      } as any;

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "subscription-confirmed/index",
        expect.objectContaining({
          panelTitle: en.panelTitle,
          isPlural: false
        })
      );
    });

    it("should handle confirmed cases", async () => {
      mockReq.session = {
        emailSubscriptions: {
          confirmationComplete: true,
          confirmedLocations: [],
          confirmedCases: [{ id: "case1", caseName: "Case A", caseNumber: "REF123" }]
        }
      } as any;

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "subscription-confirmed/index",
        expect.objectContaining({
          cases: expect.arrayContaining([expect.objectContaining({ caseName: "Case A" })]),
          isPlural: false
        })
      );
    });

    it("should handle both confirmed locations and cases", async () => {
      mockReq.session = {
        emailSubscriptions: {
          confirmationComplete: true,
          confirmedLocations: ["456"],
          confirmedCases: [{ id: "case1", caseName: "Case A", caseNumber: "REF123" }]
        }
      } as any;

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "subscription-confirmed/index",
        expect.objectContaining({
          locations: expect.any(Array),
          cases: expect.any(Array),
          isPlural: true
        })
      );
    });

    it("should clear confirmation data from session after rendering", async () => {
      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockReq.session?.emailSubscriptions?.confirmationComplete).toBeUndefined();
      expect(mockReq.session?.emailSubscriptions?.confirmedLocations).toBeUndefined();
      expect(mockReq.session?.emailSubscriptions?.confirmedCases).toBeUndefined();
    });

    it("should filter out null locations when getLocationById returns null", async () => {
      vi.mocked(locationService.getLocationById).mockImplementation((id: number) =>
        id === 456 ? null : { locationId: id, name: `Location ${id}`, welshName: `Lleoliad ${id}` }
      );

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "subscription-confirmed/index",
        expect.objectContaining({
          locations: ["Location 789"]
        })
      );
    });

    it("should redirect to subscription-management when no confirmationComplete flag", async () => {
      mockReq.session = { emailSubscriptions: {} } as any;

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.redirect).toHaveBeenCalledWith("/subscription-management");
      expect(mockRes.render).not.toHaveBeenCalled();
    });

    it("should redirect to subscription-management when confirmationComplete is false", async () => {
      mockReq.session = {
        emailSubscriptions: {
          confirmationComplete: false,
          confirmedLocations: ["456"]
        }
      } as any;

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.redirect).toHaveBeenCalledWith("/subscription-management");
      expect(mockRes.render).not.toHaveBeenCalled();
    });
  });
});
