import * as subscriptionService from "@hmcts/subscription";
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

vi.mock("@hmcts/subscription", () => ({
  getAllSubscriptionsByUserId: vi.fn(),
  getCaseSubscriptionsByUserId: vi.fn()
}));

describe("subscription-management", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockReq = {
      user: { id: "user123" } as any,
      path: "/subscription-management",
      query: {},
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
        expect(en.noSubscriptions).toBeDefined();
        expect(en.noCaseSubscriptions).toBeDefined();
        expect(en.noCourtSubscriptions).toBeDefined();
        expect(en.addButton).toBeDefined();
        expect(en.bulkUnsubscribeButton).toBeDefined();
        expect(en.tableHeaderLocation).toBeDefined();
        expect(en.tableHeaderCaseName).toBeDefined();
        expect(en.tableHeaderCaseNumber).toBeDefined();
        expect(en.tableHeaderDate).toBeDefined();
        expect(en.tableHeaderActions).toBeDefined();
        expect(en.removeLink).toBeDefined();
        expect(en.tabAllLabel).toBeDefined();
        expect(en.tabCaseLabel).toBeDefined();
        expect(en.tabCourtLabel).toBeDefined();
        expect(en.courtSubscriptionsHeading).toBeDefined();
        expect(en.caseSubscriptionsHeading).toBeDefined();
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
    it("should render page with court subscriptions", async () => {
      const mockCourtSubscriptions = [
        {
          subscriptionId: "sub1",
          type: "court" as const,
          courtOrTribunalName: "Birmingham Crown Court",
          locationId: 456,
          dateAdded: new Date()
        },
        {
          subscriptionId: "sub2",
          type: "court" as const,
          courtOrTribunalName: "Manchester Crown Court",
          locationId: 789,
          dateAdded: new Date()
        }
      ];

      vi.mocked(subscriptionService.getAllSubscriptionsByUserId).mockResolvedValue(mockCourtSubscriptions);
      vi.mocked(subscriptionService.getCaseSubscriptionsByUserId).mockResolvedValue([]);

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(subscriptionService.getAllSubscriptionsByUserId).toHaveBeenCalledWith("user123", "en");
      expect(subscriptionService.getCaseSubscriptionsByUserId).toHaveBeenCalledWith("user123");
      expect(mockRes.render).toHaveBeenCalledWith(
        "subscription-management/index",
        expect.objectContaining({
          courtCount: 2,
          caseCount: 0,
          totalCount: 2,
          courtSubscriptions: expect.arrayContaining([
            expect.objectContaining({ locationName: "Birmingham Crown Court" }),
            expect.objectContaining({ locationName: "Manchester Crown Court" })
          ])
        })
      );
    });

    it("should render page with no subscriptions", async () => {
      vi.mocked(subscriptionService.getAllSubscriptionsByUserId).mockResolvedValue([]);
      vi.mocked(subscriptionService.getCaseSubscriptionsByUserId).mockResolvedValue([]);

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "subscription-management/index",
        expect.objectContaining({
          courtCount: 0,
          caseCount: 0,
          totalCount: 0
        })
      );
    });

    it("should redirect to sign-in when no user in request", async () => {
      mockReq.user = undefined;

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.redirect).toHaveBeenCalledWith("/sign-in");
      expect(subscriptionService.getAllSubscriptionsByUserId).not.toHaveBeenCalled();
      expect(subscriptionService.getCaseSubscriptionsByUserId).not.toHaveBeenCalled();
    });

    it("should render page with case subscriptions", async () => {
      const mockCaseSubscriptions = [
        {
          subscriptionId: "sub1",
          type: "case" as const,
          caseName: "Test Case",
          partyName: "John Doe",
          referenceNumber: "REF123",
          dateAdded: new Date()
        }
      ];

      vi.mocked(subscriptionService.getAllSubscriptionsByUserId).mockResolvedValue([]);
      vi.mocked(subscriptionService.getCaseSubscriptionsByUserId).mockResolvedValue(mockCaseSubscriptions);

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "subscription-management/index",
        expect.objectContaining({
          courtCount: 0,
          caseCount: 1,
          totalCount: 1,
          caseSubscriptions: expect.arrayContaining([expect.objectContaining({ caseName: "Test Case" })])
        })
      );
    });

    it("should render page with both court and case subscriptions", async () => {
      const mockCourtSubscriptions = [
        {
          subscriptionId: "sub1",
          type: "court" as const,
          courtOrTribunalName: "Birmingham Crown Court",
          locationId: 456,
          dateAdded: new Date()
        }
      ];
      const mockCaseSubscriptions = [
        {
          subscriptionId: "sub2",
          type: "case" as const,
          caseName: "Test Case",
          partyName: "John Doe",
          referenceNumber: "REF123",
          dateAdded: new Date()
        }
      ];

      vi.mocked(subscriptionService.getAllSubscriptionsByUserId).mockResolvedValue(mockCourtSubscriptions);
      vi.mocked(subscriptionService.getCaseSubscriptionsByUserId).mockResolvedValue(mockCaseSubscriptions);

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "subscription-management/index",
        expect.objectContaining({
          courtCount: 1,
          caseCount: 1,
          totalCount: 2
        })
      );
    });

    it("should render page with Welsh translations when locale is cy", async () => {
      mockRes.locals = { locale: "cy" };
      vi.mocked(subscriptionService.getAllSubscriptionsByUserId).mockResolvedValue([]);
      vi.mocked(subscriptionService.getCaseSubscriptionsByUserId).mockResolvedValue([]);

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(subscriptionService.getAllSubscriptionsByUserId).toHaveBeenCalledWith("user123", "cy");
      expect(mockRes.render).toHaveBeenCalledWith(
        "subscription-management/index",
        expect.objectContaining({
          title: cy.title,
          heading: cy.heading
        })
      );
    });

    it("should set navigation items", async () => {
      vi.mocked(subscriptionService.getAllSubscriptionsByUserId).mockResolvedValue([]);
      vi.mocked(subscriptionService.getCaseSubscriptionsByUserId).mockResolvedValue([]);

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.locals?.navigation).toBeDefined();
      expect(mockRes.locals?.navigation?.verifiedItems).toBeDefined();
    });

    it("should include CSRF token in render data", async () => {
      vi.mocked(subscriptionService.getAllSubscriptionsByUserId).mockResolvedValue([]);
      vi.mocked(subscriptionService.getCaseSubscriptionsByUserId).mockResolvedValue([]);

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "subscription-management/index",
        expect.objectContaining({
          csrfToken: "mock-csrf-token"
        })
      );
    });

    it("should handle view parameter", async () => {
      mockReq.query = { view: "case" };
      vi.mocked(subscriptionService.getAllSubscriptionsByUserId).mockResolvedValue([]);
      vi.mocked(subscriptionService.getCaseSubscriptionsByUserId).mockResolvedValue([]);

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "subscription-management/index",
        expect.objectContaining({
          currentView: "case"
        })
      );
    });

    it("should default to 'all' view when no view parameter provided", async () => {
      vi.mocked(subscriptionService.getAllSubscriptionsByUserId).mockResolvedValue([]);
      vi.mocked(subscriptionService.getCaseSubscriptionsByUserId).mockResolvedValue([]);

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "subscription-management/index",
        expect.objectContaining({
          currentView: "all"
        })
      );
    });

    it("should sort court subscriptions alphabetically by location name", async () => {
      const mockCourtSubscriptions = [
        {
          subscriptionId: "sub1",
          type: "court" as const,
          courtOrTribunalName: "Zebra Court",
          locationId: 456,
          dateAdded: new Date()
        },
        {
          subscriptionId: "sub2",
          type: "court" as const,
          courtOrTribunalName: "Alpha Court",
          locationId: 789,
          dateAdded: new Date()
        }
      ];

      vi.mocked(subscriptionService.getAllSubscriptionsByUserId).mockResolvedValue(mockCourtSubscriptions);
      vi.mocked(subscriptionService.getCaseSubscriptionsByUserId).mockResolvedValue([]);

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      const renderCall = vi.mocked(mockRes.render).mock.calls[0];
      const courtSubscriptions = renderCall[1].courtSubscriptions;
      expect(courtSubscriptions[0].locationName).toBe("Alpha Court");
      expect(courtSubscriptions[1].locationName).toBe("Zebra Court");
    });

    it("should sort case subscriptions alphabetically by case name", async () => {
      const mockCaseSubscriptions = [
        {
          subscriptionId: "sub1",
          type: "case" as const,
          caseName: "Zebra Case",
          partyName: "Party A",
          referenceNumber: "REF1",
          dateAdded: new Date()
        },
        {
          subscriptionId: "sub2",
          type: "case" as const,
          caseName: "Alpha Case",
          partyName: "Party B",
          referenceNumber: "REF2",
          dateAdded: new Date()
        }
      ];

      vi.mocked(subscriptionService.getAllSubscriptionsByUserId).mockResolvedValue([]);
      vi.mocked(subscriptionService.getCaseSubscriptionsByUserId).mockResolvedValue(mockCaseSubscriptions);

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      const renderCall = vi.mocked(mockRes.render).mock.calls[0];
      const caseSubscriptions = renderCall[1].caseSubscriptions;
      expect(caseSubscriptions[0].caseName).toBe("Alpha Case");
      expect(caseSubscriptions[1].caseName).toBe("Zebra Case");
    });

    it("should handle errors gracefully", async () => {
      vi.mocked(subscriptionService.getAllSubscriptionsByUserId).mockRejectedValue(new Error("Database error"));
      vi.mocked(subscriptionService.getCaseSubscriptionsByUserId).mockResolvedValue([]);

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "subscription-management/index",
        expect.objectContaining({
          courtSubscriptions: [],
          caseSubscriptions: [],
          courtCount: 0,
          caseCount: 0,
          totalCount: 0
        })
      );
    });

    it("should set navigation items when error occurs", async () => {
      vi.mocked(subscriptionService.getAllSubscriptionsByUserId).mockRejectedValue(new Error("Database error"));
      vi.mocked(subscriptionService.getCaseSubscriptionsByUserId).mockResolvedValue([]);

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.locals?.navigation).toBeDefined();
      expect(mockRes.locals?.navigation?.verifiedItems).toBeDefined();
    });
  });
});
