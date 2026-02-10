import * as subscriptionService from "@hmcts/subscriptions";
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

vi.mock("@hmcts/subscriptions", () => ({
  getSubscriptionDetailsForConfirmation: vi.fn(),
  deleteSubscriptionsByIds: vi.fn()
}));

describe("confirm-bulk-unsubscribe", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockReq = {
      user: { id: "user123" } as any,
      path: "/confirm-bulk-unsubscribe",
      body: {},
      session: {
        bulkUnsubscribe: {
          selectedIds: ["sub-1", "sub-2"]
        },
        save: vi.fn((callback: (err?: any) => void) => callback())
      } as any,
      csrfToken: vi.fn(() => "mock-csrf-token")
    };
    mockRes = {
      render: vi.fn(),
      redirect: vi.fn(),
      locals: { locale: "en", navigation: {} }
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("translations", () => {
    describe("en", () => {
      it("should have all required translation keys", () => {
        expect(en.confirmTitle).toBeDefined();
        expect(en.confirmHeading).toBeDefined();
        expect(en.tabSubscriptionsByCase).toBeDefined();
        expect(en.tabSubscriptionsByCourt).toBeDefined();
        expect(en.tableHeaderCaseName).toBeDefined();
        expect(en.tableHeaderPartyName).toBeDefined();
        expect(en.tableHeaderReferenceNumber).toBeDefined();
        expect(en.tableHeaderDateAdded).toBeDefined();
        expect(en.tableHeaderCourtName).toBeDefined();
        expect(en.notAvailable).toBeDefined();
        expect(en.radioYes).toBeDefined();
        expect(en.radioNo).toBeDefined();
        expect(en.continueButton).toBeDefined();
        expect(en.errorSummaryTitle).toBeDefined();
        expect(en.errorNoRadioMessage).toBeDefined();
        expect(en.errorNoRadioHref).toBeDefined();
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
    it("should render confirmation page with court subscriptions only", async () => {
      const mockSubscriptions = [
        {
          subscriptionId: "sub-1",
          type: "court" as const,
          courtOrTribunalName: "Birmingham Crown Court",
          locationId: 1,
          dateAdded: new Date("2024-01-01")
        },
        {
          subscriptionId: "sub-2",
          type: "court" as const,
          courtOrTribunalName: "Manchester Crown Court",
          locationId: 2,
          dateAdded: new Date("2024-01-02")
        }
      ];

      vi.mocked(subscriptionService.getSubscriptionDetailsForConfirmation).mockResolvedValue(mockSubscriptions);

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(subscriptionService.getSubscriptionDetailsForConfirmation).toHaveBeenCalledWith(["sub-1", "sub-2"], "user123", "en");
      expect(mockRes.render).toHaveBeenCalledWith(
        "confirm-bulk-unsubscribe/index",
        expect.objectContaining({
          courtSubscriptions: mockSubscriptions,
          caseSubscriptions: [],
          hasCourtSubscriptions: true,
          hasCaseSubscriptions: false
        })
      );
    });

    it("should render confirmation page with mixed case and court subscriptions", async () => {
      const mockSubscriptions = [
        {
          subscriptionId: "sub-1",
          type: "case" as const,
          courtOrTribunalName: "Case ABC123",
          locationId: 1,
          dateAdded: new Date("2024-01-01")
        },
        {
          subscriptionId: "sub-2",
          type: "court" as const,
          courtOrTribunalName: "Manchester Crown Court",
          locationId: 2,
          dateAdded: new Date("2024-01-02")
        }
      ];

      vi.mocked(subscriptionService.getSubscriptionDetailsForConfirmation).mockResolvedValue(mockSubscriptions);

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "confirm-bulk-unsubscribe/index",
        expect.objectContaining({
          courtSubscriptions: [mockSubscriptions[1]],
          caseSubscriptions: [mockSubscriptions[0]],
          hasCourtSubscriptions: true,
          hasCaseSubscriptions: true
        })
      );
    });

    it("should redirect to bulk-unsubscribe when no subscriptions in session", async () => {
      mockReq.session = {} as any;

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.redirect).toHaveBeenCalledWith("/bulk-unsubscribe");
    });

    it("should redirect to bulk-unsubscribe when selectedIds is empty", async () => {
      mockReq.session = {
        bulkUnsubscribe: {
          selectedIds: []
        }
      } as any;

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.redirect).toHaveBeenCalledWith("/bulk-unsubscribe");
    });

    it("should redirect to sign-in when user is not authenticated", async () => {
      mockReq.user = undefined;

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.redirect).toHaveBeenCalledWith("/sign-in");
    });

    it("should handle errors gracefully and redirect", async () => {
      vi.mocked(subscriptionService.getSubscriptionDetailsForConfirmation).mockRejectedValue(new Error("Database error"));

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.redirect).toHaveBeenCalledWith("/bulk-unsubscribe");
    });

    it("should render page with Welsh translations when locale is cy", async () => {
      mockRes.locals = { locale: "cy" };
      const mockSubscriptions = [
        {
          subscriptionId: "sub-1",
          type: "court" as const,
          courtOrTribunalName: "Birmingham Crown Court",
          locationId: 1,
          dateAdded: new Date()
        }
      ];

      vi.mocked(subscriptionService.getSubscriptionDetailsForConfirmation).mockResolvedValue(mockSubscriptions);

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "confirm-bulk-unsubscribe/index",
        expect.objectContaining({
          confirmTitle: cy.confirmTitle,
          confirmHeading: cy.confirmHeading
        })
      );
    });

    it("should set navigation items", async () => {
      const mockSubscriptions = [
        {
          subscriptionId: "sub-1",
          type: "court" as const,
          courtOrTribunalName: "Birmingham Crown Court",
          locationId: 1,
          dateAdded: new Date()
        }
      ];

      vi.mocked(subscriptionService.getSubscriptionDetailsForConfirmation).mockResolvedValue(mockSubscriptions);

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.locals?.navigation).toBeDefined();
      expect(mockRes.locals?.navigation?.verifiedItems).toBeDefined();
    });

    it("should include CSRF token in render data", async () => {
      const mockSubscriptions = [
        {
          subscriptionId: "sub-1",
          type: "court" as const,
          courtOrTribunalName: "Birmingham Crown Court",
          locationId: 1,
          dateAdded: new Date()
        }
      ];

      vi.mocked(subscriptionService.getSubscriptionDetailsForConfirmation).mockResolvedValue(mockSubscriptions);

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "confirm-bulk-unsubscribe/index",
        expect.objectContaining({
          csrfToken: "mock-csrf-token"
        })
      );
    });

    it("should pass locale to getSubscriptionDetailsForConfirmation", async () => {
      mockRes.locals = { locale: "cy" };
      const mockSubscriptions = [
        {
          subscriptionId: "sub-1",
          type: "court" as const,
          courtOrTribunalName: "Birmingham Crown Court",
          locationId: 1,
          dateAdded: new Date()
        }
      ];

      vi.mocked(subscriptionService.getSubscriptionDetailsForConfirmation).mockResolvedValue(mockSubscriptions);

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(subscriptionService.getSubscriptionDetailsForConfirmation).toHaveBeenCalledWith(["sub-1", "sub-2"], "user123", "cy");
    });

    it("should render page with case subscriptions only", async () => {
      const mockSubscriptions = [
        {
          subscriptionId: "sub-1",
          type: "case" as const,
          caseName: "Test Case",
          partyName: "John Doe",
          referenceNumber: "REF123",
          dateAdded: new Date("2024-01-01")
        }
      ];

      vi.mocked(subscriptionService.getSubscriptionDetailsForConfirmation).mockResolvedValue(mockSubscriptions);

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "confirm-bulk-unsubscribe/index",
        expect.objectContaining({
          caseSubscriptions: mockSubscriptions,
          courtSubscriptions: [],
          hasCaseSubscriptions: true,
          hasCourtSubscriptions: false
        })
      );
    });
  });

  describe("POST", () => {
    it("should delete subscriptions and redirect to success page when confirmed", async () => {
      mockReq.body = { confirm: "yes" };
      vi.mocked(subscriptionService.deleteSubscriptionsByIds).mockResolvedValue(2);

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(subscriptionService.deleteSubscriptionsByIds).toHaveBeenCalledWith(["sub-1", "sub-2"], "user123");
      expect(mockReq.session.bulkUnsubscribe).toEqual({});
      expect(mockRes.redirect).toHaveBeenCalledWith("/bulk-unsubscribe-success");
    });

    it("should redirect to subscription-management when user selects no", async () => {
      mockReq.body = { confirm: "no" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockReq.session.bulkUnsubscribe).toEqual({});
      expect(mockRes.redirect).toHaveBeenCalledWith("/subscription-management");
    });

    it("should render error when confirm not provided", async () => {
      mockReq.body = {};
      vi.mocked(subscriptionService.getSubscriptionDetailsForConfirmation).mockResolvedValue([
        {
          subscriptionId: "sub-1",
          type: "court" as const,
          courtOrTribunalName: "Birmingham Crown Court",
          locationId: 1,
          dateAdded: new Date()
        }
      ]);

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "confirm-bulk-unsubscribe/index",
        expect.objectContaining({
          errors: expect.any(Array),
          courtSubscriptions: expect.any(Array),
          caseSubscriptions: expect.any(Array)
        })
      );
    });

    it("should filter case and court subscriptions correctly when confirm not provided", async () => {
      mockReq.body = {};
      const mockSubscriptions = [
        {
          subscriptionId: "sub-1",
          type: "case" as const,
          courtOrTribunalName: "Case XYZ789",
          locationId: 1,
          dateAdded: new Date()
        },
        {
          subscriptionId: "sub-2",
          type: "court" as const,
          courtOrTribunalName: "Leeds Crown Court",
          locationId: 2,
          dateAdded: new Date()
        }
      ];
      vi.mocked(subscriptionService.getSubscriptionDetailsForConfirmation).mockResolvedValue(mockSubscriptions);

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "confirm-bulk-unsubscribe/index",
        expect.objectContaining({
          caseSubscriptions: [mockSubscriptions[0]],
          courtSubscriptions: [mockSubscriptions[1]],
          hasCaseSubscriptions: true,
          hasCourtSubscriptions: true
        })
      );
    });

    it("should redirect to bulk-unsubscribe when no subscriptions in session without calling deleteSubscriptionsByIds", async () => {
      mockReq.session = {} as any;
      mockReq.body = { confirm: "yes" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(subscriptionService.deleteSubscriptionsByIds).not.toHaveBeenCalled();
      expect(mockRes.redirect).toHaveBeenCalledWith("/bulk-unsubscribe");
    });

    it("should redirect to bulk-unsubscribe when selectedIds is empty without calling deleteSubscriptionsByIds", async () => {
      mockReq.session = {
        bulkUnsubscribe: {
          selectedIds: []
        }
      } as any;
      mockReq.body = { confirm: "yes" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(subscriptionService.deleteSubscriptionsByIds).not.toHaveBeenCalled();
      expect(mockRes.redirect).toHaveBeenCalledWith("/bulk-unsubscribe");
    });

    it("should redirect to sign-in when user is not authenticated", async () => {
      mockReq.user = undefined;
      mockReq.body = { confirm: "yes" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.redirect).toHaveBeenCalledWith("/sign-in");
    });

    it("should handle deletion errors and redirect to bulk-unsubscribe", async () => {
      mockReq.body = { confirm: "yes" };
      vi.mocked(subscriptionService.deleteSubscriptionsByIds).mockRejectedValue(new Error("Unauthorized: User does not own all selected subscriptions"));

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.redirect).toHaveBeenCalledWith("/bulk-unsubscribe");
    });

    it("should redirect to confirm-bulk-unsubscribe on session save error when confirm is yes", async () => {
      mockReq.body = { confirm: "yes" };
      mockReq.session.save = vi.fn((callback: (err?: any) => void) => callback(new Error("Session save error")));
      vi.mocked(subscriptionService.deleteSubscriptionsByIds).mockResolvedValue(2);

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.redirect).toHaveBeenCalledWith("/confirm-bulk-unsubscribe");
    });

    it("should redirect to confirm-bulk-unsubscribe on session save error when confirm is no", async () => {
      mockReq.body = { confirm: "no" };
      mockReq.session.save = vi.fn((callback: (err?: any) => void) => callback(new Error("Session save error")));

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.redirect).toHaveBeenCalledWith("/confirm-bulk-unsubscribe");
    });

    it("should show Welsh validation error when locale is cy and confirm not provided", async () => {
      mockRes.locals = { locale: "cy" };
      mockReq.body = {};
      const mockSubscriptions = [
        {
          subscriptionId: "sub-1",
          type: "court" as const,
          courtOrTribunalName: "Birmingham Crown Court",
          locationId: 1,
          dateAdded: new Date()
        }
      ];

      vi.mocked(subscriptionService.getSubscriptionDetailsForConfirmation).mockResolvedValue(mockSubscriptions);

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "confirm-bulk-unsubscribe/index",
        expect.objectContaining({
          errors: expect.arrayContaining([
            expect.objectContaining({
              text: cy.errorNoRadioMessage,
              href: cy.errorNoRadioHref
            })
          ])
        })
      );
    });

    it("should set navigation items when rendering validation error", async () => {
      mockReq.body = {};
      const mockSubscriptions = [
        {
          subscriptionId: "sub-1",
          type: "court" as const,
          courtOrTribunalName: "Birmingham Crown Court",
          locationId: 1,
          dateAdded: new Date()
        }
      ];

      vi.mocked(subscriptionService.getSubscriptionDetailsForConfirmation).mockResolvedValue(mockSubscriptions);

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.locals?.navigation).toBeDefined();
      expect(mockRes.locals?.navigation?.verifiedItems).toBeDefined();
    });

    it("should include CSRF token in validation error render", async () => {
      mockReq.body = {};
      const mockSubscriptions = [
        {
          subscriptionId: "sub-1",
          type: "court" as const,
          courtOrTribunalName: "Birmingham Crown Court",
          locationId: 1,
          dateAdded: new Date()
        }
      ];

      vi.mocked(subscriptionService.getSubscriptionDetailsForConfirmation).mockResolvedValue(mockSubscriptions);

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "confirm-bulk-unsubscribe/index",
        expect.objectContaining({
          csrfToken: "mock-csrf-token"
        })
      );
    });

    it("should redirect to bulk-unsubscribe on error during validation error rendering", async () => {
      mockReq.body = {};
      vi.mocked(subscriptionService.getSubscriptionDetailsForConfirmation).mockRejectedValue(new Error("Database error"));

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.redirect).toHaveBeenCalledWith("/bulk-unsubscribe");
    });

    it("should redirect to bulk-unsubscribe when confirm has invalid value", async () => {
      mockReq.body = { confirm: "invalid" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.redirect).toHaveBeenCalledWith("/bulk-unsubscribe");
    });

    it("should clear session bulkUnsubscribe after successful deletion", async () => {
      mockReq.body = { confirm: "yes" };
      vi.mocked(subscriptionService.deleteSubscriptionsByIds).mockResolvedValue(2);

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockReq.session.bulkUnsubscribe).toEqual({});
    });

    it("should clear session bulkUnsubscribe when user selects no", async () => {
      mockReq.body = { confirm: "no" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockReq.session.bulkUnsubscribe).toEqual({});
    });
  });
});
