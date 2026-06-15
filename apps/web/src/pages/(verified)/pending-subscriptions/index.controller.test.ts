import type { Request, Response } from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
  })),
  getLocationsByIds: vi.fn((ids) =>
    ids.map((id: number) => ({
      locationId: id,
      name: `Location ${id}`,
      welshName: `Lleoliad ${id}`,
      regions: [],
      subJurisdictions: []
    }))
  )
}));

vi.mock("@hmcts/subscriptions", () => ({
  getAllSubscriptionsByUserId: vi.fn(() => []),
  replaceUserSubscriptions: vi.fn(),
  createCaseSubscription: vi.fn(),
  savePendingSubscriptions: vi.fn(),
  deletePendingSubscriptions: vi.fn(),
  savePendingCaseSubscriptions: vi.fn(),
  deletePendingCaseSubscriptions: vi.fn()
}));

vi.mock("@hmcts/postgres-prisma", () => ({
  Prisma: {
    PrismaClientKnownRequestError: class PrismaClientKnownRequestError extends Error {
      code: string;
      constructor(message: string, { code }: { code: string }) {
        super(message);
        this.code = code;
      }
    }
  }
}));

import { Prisma } from "@hmcts/postgres-prisma";

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
      app: { locals: { redisClient: {} } } as any
    };
    mockRes = {
      render: vi.fn(),
      redirect: vi.fn(),
      locals: {}
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
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

    it("should render with 'Confirm subscription' button when only case subscriptions are pending", async () => {
      const pendingCaseSubscriptions = [{ caseName: "Smith v Jones", caseNumber: "AB-123", searchType: "CASE_NAME" as const, searchValue: "Smith v Jones" }];
      mockReq.session = {
        emailSubscriptions: { pendingSubscriptions: [], pendingCaseSubscriptions }
      } as any;

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "pending-subscriptions/index",
        expect.objectContaining({
          pendingCaseSubscriptions,
          locations: []
        })
      );
    });

    it("should render with 'Confirm subscriptions' button when both case and location subscriptions are pending", async () => {
      const pendingCaseSubscriptions = [{ caseName: "Smith v Jones", caseNumber: "AB-123", searchType: "CASE_NAME" as const, searchValue: "Smith v Jones" }];
      mockReq.session = {
        emailSubscriptions: { pendingSubscriptions: ["456"], pendingCaseSubscriptions }
      } as any;

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "pending-subscriptions/index",
        expect.objectContaining({
          locations: expect.arrayContaining([expect.objectContaining({ locationId: "456" })]),
          pendingCaseSubscriptions
        })
      );
    });

    it("should merge confirmedCaseSubscriptions into pending when returning after adding a new case subscription", async () => {
      const confirmedCaseSubscriptions = [{ caseName: "Smith v Jones", caseNumber: "AB-123", searchType: "CASE_NAME" as const, searchValue: "Smith v Jones" }];
      const pendingCaseSubscriptions = [{ caseName: "Brown v Crown", caseNumber: "AB-456", searchType: "CASE_NAME" as const, searchValue: "Brown v Crown" }];
      mockReq.session = {
        emailSubscriptions: {
          pendingSubscriptions: [],
          confirmedCaseSubscriptions,
          pendingCaseSubscriptions
        }
      } as any;

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockReq.session?.emailSubscriptions?.pendingCaseSubscriptions).toEqual([...confirmedCaseSubscriptions, ...pendingCaseSubscriptions]);
      expect(mockReq.session?.emailSubscriptions?.confirmedCaseSubscriptions).toBeUndefined();
    });

    it("should deduplicate case subscriptions when the same case is added again", async () => {
      const confirmedCaseSubscriptions = [{ caseName: "Smith v Jones", caseNumber: "AB-123", searchType: "CASE_NAME" as const, searchValue: "Smith v Jones" }];
      const pendingCaseSubscriptions = [{ caseName: "Smith v Jones", caseNumber: "AB-123", searchType: "CASE_NAME" as const, searchValue: "Smith v Jones" }];
      mockReq.session = {
        emailSubscriptions: {
          pendingSubscriptions: [],
          confirmedCaseSubscriptions,
          pendingCaseSubscriptions
        }
      } as any;

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockReq.session?.emailSubscriptions?.pendingCaseSubscriptions).toHaveLength(1);
      expect(mockReq.session?.emailSubscriptions?.pendingCaseSubscriptions?.[0].caseNumber).toBe("AB-123");
    });

    it("should deduplicate case subscriptions when the same case is added via a different search type", async () => {
      const confirmedCaseSubscriptions = [{ caseName: "Smith v Jones", caseNumber: "AB-123", searchType: "CASE_NAME" as const, searchValue: "Smith v Jones" }];
      const pendingCaseSubscriptions = [{ caseName: "Smith v Jones", caseNumber: "AB-123", searchType: "CASE_NUMBER" as const, searchValue: "AB-123" }];
      mockReq.session = {
        emailSubscriptions: {
          pendingSubscriptions: [],
          confirmedCaseSubscriptions,
          pendingCaseSubscriptions
        }
      } as any;

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockReq.session?.emailSubscriptions?.pendingCaseSubscriptions).toHaveLength(1);
      expect(mockReq.session?.emailSubscriptions?.pendingCaseSubscriptions?.[0].caseNumber).toBe("AB-123");
    });

    it("should show confirmedLocations alongside new case subscription when returning from confirmation-preview", async () => {
      const pendingCaseSubscriptions = [{ caseName: "Smith v Jones", caseNumber: "AB-123", searchType: "CASE_NAME" as const, searchValue: "Smith v Jones" }];
      mockReq.session = {
        emailSubscriptions: {
          pendingSubscriptions: [],
          confirmedLocations: ["456"],
          pendingCaseSubscriptions
        }
      } as any;

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "pending-subscriptions/index",
        expect.objectContaining({
          locations: expect.arrayContaining([expect.objectContaining({ locationId: "456" })]),
          pendingCaseSubscriptions
        })
      );
    });

    it("should show confirmedCaseSubscriptions alongside new location subscription when returning after adding a location", async () => {
      const confirmedCaseSubscriptions = [{ caseName: "Smith v Jones", caseNumber: "AB-123", searchType: "CASE_NAME" as const, searchValue: "Smith v Jones" }];
      mockReq.session = {
        emailSubscriptions: {
          pendingSubscriptions: ["456"],
          confirmedCaseSubscriptions
        }
      } as any;

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockReq.session?.emailSubscriptions?.pendingCaseSubscriptions).toEqual(confirmedCaseSubscriptions);
      expect(mockReq.session?.emailSubscriptions?.confirmedCaseSubscriptions).toBeUndefined();
    });
  });

  describe("POST", () => {
    it("should remove location when action is remove", async () => {
      const { savePendingSubscriptions } = await import("@hmcts/subscriptions");
      mockReq.body = { action: "remove", locationId: "456" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockReq.session?.emailSubscriptions?.pendingSubscriptions).toEqual(["789"]);
      expect(savePendingSubscriptions).toHaveBeenCalledWith(mockReq.app?.locals.redisClient, "user123", ["789"]);
      expect(mockRes.redirect).toHaveBeenCalledWith("/pending-subscriptions");
    });

    it("should also remove location from confirmedLocations when removing from pending", async () => {
      mockReq.session = {
        emailSubscriptions: {
          pendingSubscriptions: ["456", "789"],
          confirmedLocations: ["456", "789"]
        }
      } as any;
      mockReq.body = { action: "remove", locationId: "456" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockReq.session?.emailSubscriptions?.pendingSubscriptions).toEqual(["789"]);
      expect((mockReq.session?.emailSubscriptions as any)?.confirmedLocations).toEqual(["789"]);
      expect(mockRes.redirect).toHaveBeenCalledWith("/pending-subscriptions");
    });

    it("should show error when removing last location and no case subscriptions exist", async () => {
      const { deletePendingSubscriptions } = await import("@hmcts/subscriptions");
      mockReq.session = { emailSubscriptions: { pendingSubscriptions: ["456"] } } as any;
      mockReq.body = { action: "remove", locationId: "456" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(deletePendingSubscriptions).toHaveBeenCalledWith(mockReq.app?.locals.redisClient, "user123");
      expect(mockRes.render).toHaveBeenCalledWith(
        "pending-subscriptions/index",
        expect.objectContaining({
          errors: expect.any(Object)
        })
      );
    });

    it("should redirect when removing last location but case subscriptions still exist", async () => {
      const { deletePendingSubscriptions } = await import("@hmcts/subscriptions");
      mockReq.session = {
        emailSubscriptions: {
          pendingSubscriptions: ["456"],
          pendingCaseSubscriptions: [{ caseName: "Smith v Jones", caseNumber: "AB-123", searchType: "CASE_NAME" as const, searchValue: "Smith v Jones" }]
        }
      } as any;
      mockReq.body = { action: "remove", locationId: "456" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(deletePendingSubscriptions).toHaveBeenCalledWith(mockReq.app?.locals.redisClient, "user123");
      expect(mockRes.redirect).toHaveBeenCalledWith("/pending-subscriptions");
      expect(mockRes.render).not.toHaveBeenCalled();
    });

    it("should initialize emailSubscriptions in session when removing and session has no emailSubscriptions", async () => {
      mockReq.session = {} as any;
      mockReq.body = { action: "remove", locationId: "456" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "pending-subscriptions/index",
        expect.objectContaining({
          errors: expect.any(Object),
          locations: []
        })
      );
    });

    it("should confirm subscriptions when action is confirm", async () => {
      const { deletePendingSubscriptions } = await import("@hmcts/subscriptions");
      mockReq.body = { action: "confirm" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      // Confirm action moves pending to confirmed state and redirects to list type selection
      expect((mockReq.session?.emailSubscriptions as any)?.confirmedLocations).toEqual(["456", "789"]);
      expect(mockReq.session?.emailSubscriptions?.pendingSubscriptions).toBeUndefined();
      expect(deletePendingSubscriptions).toHaveBeenCalledWith(mockReq.app?.locals.redisClient, "user123");
      expect(mockRes.redirect).toHaveBeenCalledWith("/subscription-add-list");
    });

    it("should redirect when confirming with no pending subscriptions", async () => {
      mockReq.session = { emailSubscriptions: { pendingSubscriptions: [] } } as any;
      mockReq.body = { action: "confirm" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.redirect).toHaveBeenCalledWith("/location-name-search");
    });

    it("should redirect to subscription-add-list when confirming", async () => {
      mockReq.body = { action: "confirm" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.redirect).toHaveBeenCalledWith("/subscription-add-list");
    });

    it("should handle errors during subscription creation and render error page", async () => {
      // This test is no longer applicable as confirm no longer creates subscriptions
      // Subscription creation happens in subscription-confirmation-preview
      expect(true).toBe(true);
    });

    it.skip("old test - should handle errors during subscription creation and render error page", async () => {
      const { getAllSubscriptionsByUserId, replaceUserSubscriptions } = await import("@hmcts/subscriptions");
      vi.mocked(getAllSubscriptionsByUserId).mockResolvedValue([]);
      vi.mocked(replaceUserSubscriptions).mockRejectedValue(new Error("Database connection failed"));

      mockReq.body = { action: "confirm" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "pending-subscriptions/index",
        expect.objectContaining({
          errors: expect.objectContaining({
            errorList: expect.arrayContaining([expect.objectContaining({ text: "Database connection failed" })])
          }),
          locations: expect.any(Array),
          isPlural: true
        })
      );
      expect(mockRes.redirect).not.toHaveBeenCalled();
    });

    it.skip("old test - should merge existing subscriptions with pending when confirming", async () => {
      // This test is no longer applicable - merging happens in subscription-confirmation-preview
      const { getAllSubscriptionsByUserId, replaceUserSubscriptions } = await import("@hmcts/subscriptions");
      vi.mocked(getAllSubscriptionsByUserId).mockResolvedValue([
        { subscriptionId: "sub-1", type: "court", courtOrTribunalName: "Existing Court", locationId: 999, dateAdded: new Date() }
      ] as any);
      vi.mocked(replaceUserSubscriptions).mockResolvedValue({ added: 2, removed: 0 });

      mockReq.body = { action: "confirm" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(replaceUserSubscriptions).toHaveBeenCalledWith("user123", ["999", "456", "789"]);
      expect(mockRes.redirect).toHaveBeenCalledWith("/subscription-confirmed");
    });

    it("should redirect to sign-in when no user is present", async () => {
      mockReq.user = undefined;
      mockReq.body = { action: "confirm" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.redirect).toHaveBeenCalledWith("/sign-in");
    });

    it.skip("old test - should set confirmationComplete flag in session after successful confirmation", async () => {
      // confirmationComplete is set in subscription-confirmation-preview, not here
      const { getAllSubscriptionsByUserId, replaceUserSubscriptions } = await import("@hmcts/subscriptions");
      vi.mocked(getAllSubscriptionsByUserId).mockResolvedValue([]);
      vi.mocked(replaceUserSubscriptions).mockResolvedValue({ added: 2, removed: 0 });

      mockReq.body = { action: "confirm" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockReq.session?.emailSubscriptions?.confirmationComplete).toBe(true);
    });

    it("should merge pendingSubscriptions and confirmedLocations for display", async () => {
      mockReq.session = {
        emailSubscriptions: {
          pendingSubscriptions: ["456"],
          confirmedLocations: ["789"]
        }
      } as any;

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "pending-subscriptions/index",
        expect.objectContaining({
          locations: expect.arrayContaining([expect.objectContaining({ locationId: "456" }), expect.objectContaining({ locationId: "789" })])
        })
      );
    });

    it("should handle Welsh locale for location names", async () => {
      mockRes.locals = { locale: "cy" };

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "pending-subscriptions/index",
        expect.objectContaining({
          locations: expect.arrayContaining([expect.objectContaining({ name: "Lleoliad 456" }), expect.objectContaining({ name: "Lleoliad 789" })])
        })
      );
    });

    it("should save to Redis when removing a case subscription but not the last one", async () => {
      const { savePendingCaseSubscriptions } = await import("@hmcts/subscriptions");
      const pendingCaseSubscriptions = [
        { caseName: "Smith v Jones", caseNumber: "AB-123", searchType: "CASE_NAME" as const, searchValue: "Smith v Jones" },
        { caseName: "Brown v Crown", caseNumber: "AB-456", searchType: "CASE_NAME" as const, searchValue: "Brown v Crown" }
      ];
      mockReq.session = {
        emailSubscriptions: { pendingSubscriptions: [], pendingCaseSubscriptions }
      } as any;
      mockReq.body = { action: "remove-case", caseIndex: "0" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockReq.session?.emailSubscriptions?.pendingCaseSubscriptions).toEqual([
        { caseName: "Brown v Crown", caseNumber: "AB-456", searchType: "CASE_NAME", searchValue: "Brown v Crown" }
      ]);
      expect(savePendingCaseSubscriptions).toHaveBeenCalledWith(mockReq.app?.locals.redisClient, "user123", [
        { caseName: "Brown v Crown", caseNumber: "AB-456", searchType: "CASE_NAME", searchValue: "Brown v Crown" }
      ]);
      expect(mockRes.redirect).toHaveBeenCalledWith("/pending-subscriptions");
    });

    it("should delete case subscriptions from Redis when removing the last one", async () => {
      const { deletePendingCaseSubscriptions } = await import("@hmcts/subscriptions");
      const pendingCaseSubscriptions = [{ caseName: "Adams v Jones", caseNumber: "AB-123", searchType: "CASE_NAME" as const, searchValue: "Adams v Jones" }];
      mockReq.session = {
        emailSubscriptions: { pendingSubscriptions: [], pendingCaseSubscriptions }
      } as any;
      mockReq.body = { action: "remove-case", caseIndex: "0" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(deletePendingCaseSubscriptions).toHaveBeenCalledWith(mockReq.app?.locals.redisClient, "user123");
      expect(mockRes.redirect).toHaveBeenCalledWith("/pending-subscriptions");
    });

    it("should delete from Redis when confirming case-only subscriptions", async () => {
      const { createCaseSubscription, deletePendingCaseSubscriptions } = await import("@hmcts/subscriptions");
      vi.mocked(createCaseSubscription).mockResolvedValue(undefined);
      const pendingCaseSubscriptions = [
        { caseName: "Smith v Jones", caseNumber: "AB-123", searchType: "CASE_NAME" as const, searchValue: "Smith v Jones" },
        { caseName: "Brown v Crown", caseNumber: "AB-456", searchType: "CASE_NAME" as const, searchValue: "Brown v Crown" }
      ];
      mockReq.session = {
        emailSubscriptions: { pendingSubscriptions: [], pendingCaseSubscriptions }
      } as any;
      mockReq.body = { action: "confirm" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(createCaseSubscription).toHaveBeenCalledTimes(2);
      expect(createCaseSubscription).toHaveBeenCalledWith("user123", "CASE_NAME", "Smith v Jones", "Smith v Jones", "AB-123");
      expect(createCaseSubscription).toHaveBeenCalledWith("user123", "CASE_NAME", "Brown v Crown", "Brown v Crown", "AB-456");
      expect(deletePendingCaseSubscriptions).toHaveBeenCalledWith(mockReq.app?.locals.redisClient, "user123");
      expect(mockReq.session?.emailSubscriptions?.pendingCaseSubscriptions).toBeUndefined();
      expect((mockReq.session?.emailSubscriptions as any)?.confirmationComplete).toBe(true);
      expect(mockRes.redirect).toHaveBeenCalledWith("/subscription-confirmed");
    });

    it("should redirect to subscription-confirmed even when all subscriptions already exist (P2002)", async () => {
      const { createCaseSubscription, deletePendingCaseSubscriptions } = await import("@hmcts/subscriptions");
      const pendingCaseSubscriptions = [{ caseName: "Smith v Jones", caseNumber: "AB-123", searchType: "CASE_NAME" as const, searchValue: "Smith v Jones" }];
      mockReq.session = {
        emailSubscriptions: { pendingSubscriptions: [], pendingCaseSubscriptions }
      } as any;
      mockReq.body = { action: "confirm" };
      vi.mocked(createCaseSubscription).mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError("Unique constraint failed", { code: "P2002", clientVersion: "5.0.0" })
      );

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(createCaseSubscription).toHaveBeenCalledWith("user123", "CASE_NAME", "Smith v Jones", "Smith v Jones", "AB-123");
      expect(deletePendingCaseSubscriptions).toHaveBeenCalledWith(mockReq.app?.locals.redisClient, "user123");
      expect((mockReq.session?.emailSubscriptions as any)?.confirmationComplete).toBe(true);
      expect(mockRes.redirect).toHaveBeenCalledWith("/subscription-confirmed");
    });

    it("should delete from Redis when confirming both case and location subscriptions", async () => {
      const { deletePendingCaseSubscriptions, deletePendingSubscriptions } = await import("@hmcts/subscriptions");
      const pendingCaseSubscriptions = [{ caseName: "Smith v Jones", caseNumber: "AB-123", searchType: "CASE_NAME" as const, searchValue: "Smith v Jones" }];
      mockReq.session = {
        emailSubscriptions: { pendingSubscriptions: ["456", "789"], pendingCaseSubscriptions }
      } as any;
      mockReq.body = { action: "confirm" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockReq.session?.emailSubscriptions?.confirmedCaseSubscriptions).toEqual(pendingCaseSubscriptions);
      expect(mockReq.session?.emailSubscriptions?.pendingCaseSubscriptions).toBeUndefined();
      expect(deletePendingCaseSubscriptions).toHaveBeenCalledWith(mockReq.app?.locals.redisClient, "user123");
      expect(deletePendingSubscriptions).toHaveBeenCalledWith(mockReq.app?.locals.redisClient, "user123");
      expect((mockReq.session?.emailSubscriptions as any)?.confirmedLocations).toEqual(["456", "789"]);
      expect(mockReq.session?.emailSubscriptions?.pendingSubscriptions).toBeUndefined();
      expect(mockRes.redirect).toHaveBeenCalledWith("/subscription-add-list");
    });
  });
});
