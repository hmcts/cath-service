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
  }))
}));

vi.mock("@hmcts/subscriptions", () => ({
  savePendingSubscriptions: vi.fn(),
  deletePendingSubscriptions: vi.fn(),
  savePendingCaseSubscriptions: vi.fn(),
  deletePendingCaseSubscriptions: vi.fn(),
  createCaseSubscription: vi.fn()
}));

vi.mock("@hmcts/postgres", () => ({
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

import { createCaseSubscription, deletePendingCaseSubscriptions, deletePendingSubscriptions, savePendingCaseSubscriptions } from "@hmcts/subscriptions";

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
  });

  describe("POST", () => {
    it("should remove location when action is remove", async () => {
      mockReq.body = { action: "remove", locationId: "456" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockReq.session?.emailSubscriptions?.pendingSubscriptions).toEqual(["789"]);
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
      expect(mockReq.session?.emailSubscriptions?.confirmedLocations).toEqual(["789"]);
      expect(mockRes.redirect).toHaveBeenCalledWith("/pending-subscriptions");
    });

    it("should show error when removing last location and no case subscriptions exist", async () => {
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

    it("should redirect when removing last location but case subscriptions still exist", async () => {
      mockReq.session = {
        emailSubscriptions: {
          pendingSubscriptions: ["456"],
          pendingCaseSubscriptions: [{ caseName: "Smith v Jones", caseNumber: "AB-123", searchType: "CASE_NAME" as const, searchValue: "Smith v Jones" }]
        }
      } as any;
      mockReq.body = { action: "remove", locationId: "456" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

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

    it("should remove case subscription by index when action is remove-case", async () => {
      const pendingCaseSubscriptions = [
        { caseName: "Adams v Jones", caseNumber: "AB-123", searchType: "CASE_NAME" as const, searchValue: "Adams v Jones" },
        { caseName: "Brown v Crown", caseNumber: "AB-456", searchType: "CASE_NAME" as const, searchValue: "Brown v Crown" }
      ];
      mockReq.session = {
        emailSubscriptions: {
          pendingSubscriptions: [],
          pendingCaseSubscriptions
        }
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
      const pendingCaseSubscriptions = [{ caseName: "Adams v Jones", caseNumber: "AB-123", searchType: "CASE_NAME" as const, searchValue: "Adams v Jones" }];
      mockReq.session = {
        emailSubscriptions: { pendingSubscriptions: [], pendingCaseSubscriptions }
      } as any;
      mockReq.body = { action: "remove-case", caseIndex: "0" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(deletePendingCaseSubscriptions).toHaveBeenCalledWith(mockReq.app?.locals.redisClient, "user123");
      expect(mockRes.redirect).toHaveBeenCalledWith("/pending-subscriptions");
    });

    it("should confirm subscriptions when action is confirm", async () => {
      mockReq.body = { action: "confirm" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockReq.session?.emailSubscriptions?.confirmedLocations).toEqual(["456", "789"]);
      expect(mockReq.session?.emailSubscriptions?.pendingSubscriptions).toBeUndefined();
      expect(mockRes.redirect).toHaveBeenCalledWith("/subscription-add-list");
    });

    it("should redirect when confirming with no pending subscriptions", async () => {
      mockReq.session = { emailSubscriptions: { pendingSubscriptions: [] } } as any;
      mockReq.body = { action: "confirm" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.redirect).toHaveBeenCalledWith("/location-name-search");
    });

    it("should create case subscriptions and redirect to subscription-confirmed when pendingCaseSubscriptions present", async () => {
      const pendingCaseSubscriptions = [
        {
          caseName: "Smith v Jones",
          caseNumber: "AB-123",
          searchType: "CASE_NAME" as const,
          searchValue: "Smith v Jones"
        },
        {
          caseName: "Brown v Crown",
          caseNumber: "AB-456",
          searchType: "CASE_NAME" as const,
          searchValue: "Brown v Crown"
        }
      ];
      mockReq.session = {
        emailSubscriptions: {
          pendingSubscriptions: [],
          pendingCaseSubscriptions
        }
      } as any;
      mockReq.body = { action: "confirm" };
      vi.mocked(createCaseSubscription).mockResolvedValue(undefined);

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(createCaseSubscription).toHaveBeenCalledTimes(2);
      expect(createCaseSubscription).toHaveBeenCalledWith("user123", "CASE_NAME", "Smith v Jones", "Smith v Jones", "AB-123");
      expect(createCaseSubscription).toHaveBeenCalledWith("user123", "CASE_NAME", "Brown v Crown", "Brown v Crown", "AB-456");
      expect(deletePendingCaseSubscriptions).toHaveBeenCalledWith(mockReq.app?.locals.redisClient, "user123");
      expect(mockReq.session?.emailSubscriptions?.pendingCaseSubscriptions).toBeUndefined();
      expect(mockReq.session?.emailSubscriptions?.confirmationComplete).toBe(true);
      expect(mockRes.redirect).toHaveBeenCalledWith("/subscription-confirmed");
    });

    it("should redirect to subscription-confirmed even when all subscriptions already exist (P2002)", async () => {
      const { Prisma } = await import("@hmcts/postgres");
      const pendingCaseSubscriptions = [
        {
          caseName: "Smith v Jones",
          caseNumber: "AB-123",
          searchType: "CASE_NAME" as const,
          searchValue: "Smith v Jones"
        }
      ];
      mockReq.session = {
        emailSubscriptions: {
          pendingSubscriptions: [],
          pendingCaseSubscriptions
        }
      } as any;
      mockReq.body = { action: "confirm" };
      vi.mocked(createCaseSubscription).mockRejectedValue(new Prisma.PrismaClientKnownRequestError("Unique constraint failed", { code: "P2002" }));

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.redirect).toHaveBeenCalledWith("/subscription-confirmed");
      expect(mockRes.render).not.toHaveBeenCalled();
    });

    it("should defer case subscriptions and redirect to /subscription-add-list when confirming with pending location subscriptions", async () => {
      const pendingCaseSubscriptions = [
        {
          caseName: "Smith v Jones",
          caseNumber: "AB-123",
          searchType: "CASE_NAME" as const,
          searchValue: "Smith v Jones"
        }
      ];
      mockReq.session = {
        emailSubscriptions: {
          pendingSubscriptions: ["456", "789"],
          pendingCaseSubscriptions
        }
      } as any;
      mockReq.body = { action: "confirm" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(createCaseSubscription).not.toHaveBeenCalled();
      expect(mockReq.session?.emailSubscriptions?.confirmedCaseSubscriptions).toEqual(pendingCaseSubscriptions);
      expect(mockReq.session?.emailSubscriptions?.pendingCaseSubscriptions).toBeUndefined();
      expect(deletePendingCaseSubscriptions).toHaveBeenCalledWith(mockReq.app?.locals.redisClient, "user123");
      expect(deletePendingSubscriptions).toHaveBeenCalledWith(mockReq.app?.locals.redisClient, "user123");
      expect(mockReq.session?.emailSubscriptions?.confirmedLocations).toEqual(["456", "789"]);
      expect(mockReq.session?.emailSubscriptions?.pendingSubscriptions).toBeUndefined();
      expect(mockRes.redirect).toHaveBeenCalledWith("/subscription-add-list");
    });
  });

  describe("GET with case subscription", () => {
    it("should render with 'Confirm subscriptions' button when only case subscriptions are pending", async () => {
      const pendingCaseSubscriptions = [
        {
          caseName: "Smith v Jones",
          caseNumber: "AB-123",
          searchType: "CASE_NAME" as const,
          searchValue: "Smith v Jones"
        }
      ];
      mockReq.session = {
        emailSubscriptions: {
          pendingSubscriptions: [],
          pendingCaseSubscriptions
        }
      } as any;

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "pending-subscriptions/index",
        expect.objectContaining({
          pendingCaseSubscriptions,
          confirmButton: "Confirm subscriptions"
        })
      );
    });

    it("should render with 'Continue' button when both case and location subscriptions are pending", async () => {
      const pendingCaseSubscriptions = [{ caseName: "Smith v Jones", caseNumber: "AB-123", searchType: "CASE_NAME" as const, searchValue: "Smith v Jones" }];
      mockReq.session = {
        emailSubscriptions: {
          pendingSubscriptions: ["456"],
          pendingCaseSubscriptions
        }
      } as any;

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "pending-subscriptions/index",
        expect.objectContaining({
          pendingCaseSubscriptions,
          confirmButton: "Continue"
        })
      );
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
          pendingCaseSubscriptions,
          confirmButton: "Continue"
        })
      );
    });

    it("should merge confirmedCaseSubscriptions into pending when returning after adding a new case subscription", async () => {
      const existingCase = { caseName: "Old Case", caseNumber: "AB-000", searchType: "CASE_NAME" as const, searchValue: "Old Case" };
      const newCase = { caseName: "New Case", caseNumber: "AB-999", searchType: "CASE_NAME" as const, searchValue: "New Case" };
      mockReq.session = {
        emailSubscriptions: {
          pendingSubscriptions: [],
          confirmedCaseSubscriptions: [existingCase],
          pendingCaseSubscriptions: [newCase]
        }
      } as any;

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "pending-subscriptions/index",
        expect.objectContaining({
          pendingCaseSubscriptions: [existingCase, newCase]
        })
      );
      expect(mockReq.session?.emailSubscriptions?.confirmedCaseSubscriptions).toBeUndefined();
    });

    it("should deduplicate case subscriptions when the same case is added again", async () => {
      const existingCase = { caseName: "Old Case", caseNumber: "AB-000", searchType: "CASE_NAME" as const, searchValue: "Old Case" };
      mockReq.session = {
        emailSubscriptions: {
          pendingSubscriptions: [],
          confirmedCaseSubscriptions: [existingCase],
          pendingCaseSubscriptions: [existingCase]
        }
      } as any;

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "pending-subscriptions/index",
        expect.objectContaining({
          pendingCaseSubscriptions: [existingCase]
        })
      );
    });

    it("should deduplicate case subscriptions when the same case is added via a different search type", async () => {
      const confirmedCase = { caseName: "Smith v Jones", caseNumber: "AB-000", searchType: "CASE_NUMBER" as const, searchValue: "AB-000" };
      const pendingCase = { caseName: "Smith v Jones", caseNumber: "AB-000", searchType: "CASE_NAME" as const, searchValue: "Smith v Jones" };
      mockReq.session = {
        emailSubscriptions: {
          pendingSubscriptions: [],
          confirmedCaseSubscriptions: [confirmedCase],
          pendingCaseSubscriptions: [pendingCase]
        }
      } as any;

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "pending-subscriptions/index",
        expect.objectContaining({
          pendingCaseSubscriptions: [confirmedCase]
        })
      );
    });

    it("should show confirmedCaseSubscriptions alongside new location subscription when returning after adding a location", async () => {
      const existingCase = { caseName: "Old Case", caseNumber: "AB-000", searchType: "CASE_NAME" as const, searchValue: "Old Case" };
      mockReq.session = {
        emailSubscriptions: {
          pendingSubscriptions: ["789"],
          confirmedLocations: ["456"],
          confirmedCaseSubscriptions: [existingCase]
        }
      } as any;

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "pending-subscriptions/index",
        expect.objectContaining({
          locations: expect.arrayContaining([expect.objectContaining({ locationId: "456" }), expect.objectContaining({ locationId: "789" })]),
          pendingCaseSubscriptions: [existingCase]
        })
      );
      expect(mockReq.session?.emailSubscriptions?.confirmedCaseSubscriptions).toBeUndefined();
    });
  });
});
