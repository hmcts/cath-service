import * as locationService from "@hmcts/location";
import * as subscriptionService from "@hmcts/subscription";
import type { Request, Response } from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cy } from "./cy.js";
import { en } from "./en.js";
import { GET, POST } from "./index.js";

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

vi.mock("@hmcts/subscription", () => ({
  getAllSubscriptionsByUserId: vi.fn(),
  replaceUserSubscriptions: vi.fn(),
  createCaseSubscription: vi.fn()
}));

describe("pending-subscriptions", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockReq = {
      user: { id: "user123" } as any,
      body: {},
      session: {
        emailSubscriptions: {
          pendingSubscriptions: ["456", "789"]
        }
      } as any,
      path: "/pending-subscriptions",
      csrfToken: vi.fn(() => "mock-csrf-token")
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
        expect(en.heading).toBeDefined();
        expect(en.confirmButton).toBeDefined();
        expect(en.confirmButtonPlural).toBeDefined();
        expect(en.removeLink).toBeDefined();
        expect(en.addAnotherSubscription).toBeDefined();
        expect(en.errorSummaryTitle).toBeDefined();
        expect(en.errorAtLeastOne).toBeDefined();
        expect(en.addSubscriptions).toBeDefined();
        expect(en.courtSubscriptionsHeading).toBeDefined();
        expect(en.caseSubscriptionsHeading).toBeDefined();
        expect(en.courtHeading).toBeDefined();
        expect(en.caseNameHeading).toBeDefined();
        expect(en.caseNumberHeading).toBeDefined();
        expect(en.actionsHeading).toBeDefined();
        expect(en.notAvailable).toBeDefined();
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
    it("should render page with pending subscriptions", async () => {
      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "pending-subscriptions/index",
        expect.objectContaining({
          locations: expect.arrayContaining([
            expect.objectContaining({ locationId: "456", name: "Location 456" }),
            expect.objectContaining({ locationId: "789", name: "Location 789" })
          ]),
          isPlural: true
        })
      );
    });

    it("should render error when no pending subscriptions", async () => {
      mockReq.session = { emailSubscriptions: { pendingSubscriptions: [] } } as any;

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "pending-subscriptions/index",
        expect.objectContaining({
          errors: expect.any(Object),
          locations: []
        })
      );
    });

    it("should handle single pending subscription", async () => {
      mockReq.session = { emailSubscriptions: { pendingSubscriptions: ["456"] } } as any;

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "pending-subscriptions/index",
        expect.objectContaining({
          isPlural: false
        })
      );
    });

    it("should render page with Welsh translations when locale is cy", async () => {
      mockRes.locals = { locale: "cy" };

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "pending-subscriptions/index",
        expect.objectContaining({
          title: cy.title,
          heading: cy.heading
        })
      );
    });

    it("should use Welsh location names when locale is cy", async () => {
      mockRes.locals = { locale: "cy" };

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "pending-subscriptions/index",
        expect.objectContaining({
          locations: expect.arrayContaining([expect.objectContaining({ name: "Lleoliad 456" }), expect.objectContaining({ name: "Lleoliad 789" })])
        })
      );
    });

    it("should set navigation items", async () => {
      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.locals?.navigation).toBeDefined();
      expect(mockRes.locals?.navigation?.verifiedItems).toBeDefined();
    });

    it("should include CSRF token in render data", async () => {
      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "pending-subscriptions/index",
        expect.objectContaining({
          csrfToken: "mock-csrf-token"
        })
      );
    });

    it("should render page with pending cases", async () => {
      mockReq.session = {
        emailSubscriptions: {
          pendingSubscriptions: [],
          pendingCaseSubscriptions: [{ id: "case1", caseName: "Test Case", caseNumber: "REF123" }]
        }
      } as any;

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "pending-subscriptions/index",
        expect.objectContaining({
          cases: expect.arrayContaining([expect.objectContaining({ caseName: "Test Case" })])
        })
      );
    });

    it("should render page with both pending locations and cases", async () => {
      mockReq.session = {
        emailSubscriptions: {
          pendingSubscriptions: ["456"],
          pendingCaseSubscriptions: [{ id: "case1", caseName: "Test Case", caseNumber: "REF123" }]
        }
      } as any;

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "pending-subscriptions/index",
        expect.objectContaining({
          isPlural: true,
          locations: expect.any(Array),
          cases: expect.any(Array)
        })
      );
    });

    it("should sort locations alphabetically by name", async () => {
      vi.mocked(locationService.getLocationById).mockImplementation((id: number) => ({
        locationId: id,
        name: id === 456 ? "Zebra Court" : "Alpha Court",
        welshName: id === 456 ? "Llys Zebra" : "Llys Alpha"
      }));

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      const renderCall = vi.mocked(mockRes.render).mock.calls[0];
      const locations = renderCall[1].locations;
      expect(locations[0].name).toBe("Alpha Court");
      expect(locations[1].name).toBe("Zebra Court");
    });

    it("should sort cases alphabetically by case name", async () => {
      mockReq.session = {
        emailSubscriptions: {
          pendingSubscriptions: [],
          pendingCaseSubscriptions: [
            { id: "case1", caseName: "Zebra Case", caseNumber: "REF123" },
            { id: "case2", caseName: "Alpha Case", caseNumber: "REF456" }
          ]
        }
      } as any;

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      const renderCall = vi.mocked(mockRes.render).mock.calls[0];
      const cases = renderCall[1].cases;
      expect(cases[0].caseName).toBe("Alpha Case");
      expect(cases[1].caseName).toBe("Zebra Case");
    });

    it("should filter out null locations when getLocationById fails", async () => {
      vi.mocked(locationService.getLocationById).mockImplementation((id: number) =>
        id === 456 ? null : { locationId: id, name: `Location ${id}`, welshName: `Lleoliad ${id}` }
      );

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "pending-subscriptions/index",
        expect.objectContaining({
          locations: expect.arrayContaining([expect.objectContaining({ locationId: "789" })])
        })
      );
    });
  });

  describe("POST", () => {
    it("should remove location when action is remove", async () => {
      mockReq.body = { action: "remove", locationId: "456" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockReq.session?.emailSubscriptions?.pendingSubscriptions).toEqual(["789"]);
      expect(mockRes.redirect).toHaveBeenCalledWith("/pending-subscriptions");
    });

    it("should show error when removing last location", async () => {
      mockReq.session = { emailSubscriptions: { pendingSubscriptions: ["456"] } } as any;
      mockReq.body = { action: "remove", locationId: "456" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "pending-subscriptions/index",
        expect.objectContaining({
          errors: expect.any(Object)
        })
      );
    });

    it("should confirm subscriptions when action is confirm", async () => {
      mockReq.body = { action: "confirm" };
      vi.mocked(subscriptionService.getAllSubscriptionsByUserId).mockResolvedValue([
        {
          subscriptionId: "sub1",
          type: "court" as const,
          courtOrTribunalName: "Test Court",
          locationId: 123,
          dateAdded: new Date()
        }
      ]);
      vi.mocked(subscriptionService.replaceUserSubscriptions).mockResolvedValue({
        added: 2,
        removed: 0
      });

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(subscriptionService.getAllSubscriptionsByUserId).toHaveBeenCalledWith("user123");
      expect(subscriptionService.replaceUserSubscriptions).toHaveBeenCalledWith("user123", ["123", "456", "789"]);
      expect(mockReq.session?.emailSubscriptions?.confirmationComplete).toBe(true);
      expect(mockRes.redirect).toHaveBeenCalledWith("/subscription-confirmed");
    });

    it("should redirect when confirming with no pending subscriptions", async () => {
      mockReq.session = { emailSubscriptions: { pendingSubscriptions: [], pendingCaseSubscriptions: [] } } as any;
      mockReq.body = { action: "confirm" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.redirect).toHaveBeenCalledWith("/subscription-add");
    });

    it("should handle error when confirming subscriptions", async () => {
      mockReq.body = { action: "confirm" };
      vi.mocked(subscriptionService.getAllSubscriptionsByUserId).mockResolvedValue([]);
      vi.mocked(subscriptionService.replaceUserSubscriptions).mockRejectedValue(new Error("Test error"));

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "pending-subscriptions/index",
        expect.objectContaining({
          errors: expect.objectContaining({
            errorList: expect.arrayContaining([expect.objectContaining({ text: "Test error" })])
          })
        })
      );
    });

    it("should preserve existing subscriptions when adding new ones", async () => {
      mockReq.body = { action: "confirm" };
      mockReq.session = { emailSubscriptions: { pendingSubscriptions: ["456", "789"], pendingCaseSubscriptions: [] } } as any;

      vi.mocked(subscriptionService.getAllSubscriptionsByUserId).mockResolvedValue([
        {
          subscriptionId: "sub1",
          type: "court" as const,
          courtOrTribunalName: "Test Court",
          locationId: 123,
          dateAdded: new Date()
        }
      ]);
      vi.mocked(subscriptionService.replaceUserSubscriptions).mockResolvedValue({
        added: 2,
        removed: 0
      });

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(subscriptionService.replaceUserSubscriptions).toHaveBeenCalledWith("user123", ["123", "456", "789"]);
      expect(mockRes.redirect).toHaveBeenCalledWith("/subscription-confirmed");
    });

    it("should remove case when action is removeCase", async () => {
      mockReq.session = {
        emailSubscriptions: {
          pendingSubscriptions: [],
          pendingCaseSubscriptions: [
            { id: "case1", caseName: "Case A", caseNumber: "REF1" },
            { id: "case2", caseName: "Case B", caseNumber: "REF2" }
          ]
        }
      } as any;
      mockReq.body = { action: "removeCase", caseId: "case1" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockReq.session?.emailSubscriptions?.pendingCaseSubscriptions).toEqual([{ id: "case2", caseName: "Case B", caseNumber: "REF2" }]);
      expect(mockRes.redirect).toHaveBeenCalledWith("/pending-subscriptions");
    });

    it("should show error when removing last case", async () => {
      mockReq.session = {
        emailSubscriptions: {
          pendingSubscriptions: [],
          pendingCaseSubscriptions: [{ id: "case1", caseName: "Case A", caseNumber: "REF1" }]
        }
      } as any;
      mockReq.body = { action: "removeCase", caseId: "case1" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "pending-subscriptions/index",
        expect.objectContaining({
          errors: expect.any(Object)
        })
      );
    });

    it("should redirect to sign-in when user is not authenticated", async () => {
      mockReq.user = undefined;
      mockReq.body = { action: "confirm" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.redirect).toHaveBeenCalledWith("/sign-in");
      expect(subscriptionService.getAllSubscriptionsByUserId).not.toHaveBeenCalled();
    });

    it("should confirm case subscriptions when action is confirm", async () => {
      mockReq.session = {
        emailSubscriptions: {
          pendingSubscriptions: [],
          pendingCaseSubscriptions: [{ id: "case1", caseName: "Case A", caseNumber: "REF1", searchType: "CASE_NUMBER" }]
        }
      } as any;
      mockReq.body = { action: "confirm" };
      vi.mocked(subscriptionService.getAllSubscriptionsByUserId).mockResolvedValue([]);
      vi.mocked(subscriptionService.createCaseSubscription).mockResolvedValue({
        subscriptionId: "sub1",
        userId: "user123",
        searchType: "CASE_NUMBER",
        searchValue: "REF1",
        caseNumber: "REF1",
        caseName: "Case A",
        dateAdded: new Date()
      });

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(subscriptionService.createCaseSubscription).toHaveBeenCalledWith("user123", "CASE_NUMBER", "REF1", "REF1", "Case A");
      expect(mockReq.session?.emailSubscriptions?.confirmationComplete).toBe(true);
      expect(mockRes.redirect).toHaveBeenCalledWith("/subscription-confirmed");
    });

    it("should default to CASE_NUMBER search type for backward compatibility", async () => {
      mockReq.session = {
        emailSubscriptions: {
          pendingSubscriptions: [],
          pendingCaseSubscriptions: [{ id: "case1", caseName: "Case A", caseNumber: "REF1" }]
        }
      } as any;
      mockReq.body = { action: "confirm" };
      vi.mocked(subscriptionService.getAllSubscriptionsByUserId).mockResolvedValue([]);
      vi.mocked(subscriptionService.createCaseSubscription).mockResolvedValue({
        subscriptionId: "sub1",
        userId: "user123",
        searchType: "CASE_NUMBER",
        searchValue: "REF1",
        caseNumber: "REF1",
        caseName: "Case A",
        dateAdded: new Date()
      });

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(subscriptionService.createCaseSubscription).toHaveBeenCalledWith("user123", "CASE_NUMBER", "REF1", "REF1", "Case A");
    });

    it("should use CASE_NAME search type when specified", async () => {
      mockReq.session = {
        emailSubscriptions: {
          pendingSubscriptions: [],
          pendingCaseSubscriptions: [{ id: "case1", caseName: "Case A", caseNumber: "REF1", searchType: "CASE_NAME" }]
        }
      } as any;
      mockReq.body = { action: "confirm" };
      vi.mocked(subscriptionService.getAllSubscriptionsByUserId).mockResolvedValue([]);
      vi.mocked(subscriptionService.createCaseSubscription).mockResolvedValue({
        subscriptionId: "sub1",
        userId: "user123",
        searchType: "CASE_NAME",
        searchValue: "Case A",
        caseNumber: "REF1",
        caseName: "Case A",
        dateAdded: new Date()
      });

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(subscriptionService.createCaseSubscription).toHaveBeenCalledWith("user123", "CASE_NAME", "Case A", "REF1", "Case A");
    });

    it("should confirm both locations and cases", async () => {
      mockReq.session = {
        emailSubscriptions: {
          pendingSubscriptions: ["456"],
          pendingCaseSubscriptions: [{ id: "case1", caseName: "Case A", caseNumber: "REF1", searchType: "CASE_NUMBER" }]
        }
      } as any;
      mockReq.body = { action: "confirm" };
      vi.mocked(subscriptionService.getAllSubscriptionsByUserId).mockResolvedValue([]);
      vi.mocked(subscriptionService.replaceUserSubscriptions).mockResolvedValue({ added: 1, removed: 0 });
      vi.mocked(subscriptionService.createCaseSubscription).mockResolvedValue({
        subscriptionId: "sub1",
        userId: "user123",
        searchType: "CASE_NUMBER",
        searchValue: "REF1",
        caseNumber: "REF1",
        caseName: "Case A",
        dateAdded: new Date()
      });

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(subscriptionService.replaceUserSubscriptions).toHaveBeenCalledWith("user123", ["456"]);
      expect(subscriptionService.createCaseSubscription).toHaveBeenCalledWith("user123", "CASE_NUMBER", "REF1", "REF1", "Case A");
      expect(mockRes.redirect).toHaveBeenCalledWith("/subscription-confirmed");
    });

    it("should set navigation items when rendering error", async () => {
      mockReq.session = { emailSubscriptions: { pendingSubscriptions: ["456"] } } as any;
      mockReq.body = { action: "remove", locationId: "456" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.locals?.navigation).toBeDefined();
      expect(mockRes.locals?.navigation?.verifiedItems).toBeDefined();
    });

    it("should clear pending subscriptions after successful confirmation", async () => {
      mockReq.body = { action: "confirm" };
      mockReq.session = { emailSubscriptions: { pendingSubscriptions: ["456"], pendingCaseSubscriptions: [] } } as any;
      vi.mocked(subscriptionService.getAllSubscriptionsByUserId).mockResolvedValue([]);
      vi.mocked(subscriptionService.replaceUserSubscriptions).mockResolvedValue({ added: 1, removed: 0 });

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockReq.session?.emailSubscriptions?.pendingSubscriptions).toBeUndefined();
      expect(mockReq.session?.emailSubscriptions?.pendingCaseSubscriptions).toBeUndefined();
    });

    it("should set confirmed locations and cases in session", async () => {
      mockReq.session = {
        emailSubscriptions: {
          pendingSubscriptions: ["456"],
          pendingCaseSubscriptions: [{ id: "case1", caseName: "Case A", caseNumber: "REF1" }]
        }
      } as any;
      mockReq.body = { action: "confirm" };
      vi.mocked(subscriptionService.getAllSubscriptionsByUserId).mockResolvedValue([]);
      vi.mocked(subscriptionService.replaceUserSubscriptions).mockResolvedValue({ added: 1, removed: 0 });
      vi.mocked(subscriptionService.createCaseSubscription).mockResolvedValue({
        subscriptionId: "sub1",
        userId: "user123",
        searchType: "CASE_NUMBER",
        searchValue: "REF1",
        caseNumber: "REF1",
        caseName: "Case A",
        dateAdded: new Date()
      });

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockReq.session?.emailSubscriptions?.confirmedLocations).toEqual(["456"]);
      expect(mockReq.session?.emailSubscriptions?.confirmedCases).toEqual([{ id: "case1", caseName: "Case A", caseNumber: "REF1" }]);
    });
  });
});
