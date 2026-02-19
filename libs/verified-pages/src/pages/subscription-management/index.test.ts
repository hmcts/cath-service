import * as subscriptionService from "@hmcts/subscription";
import * as listTypeSubscriptionService from "@hmcts/subscription-list-types";
import type { Request, Response } from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./index.js";

vi.mock("@hmcts/auth", () => ({
  buildVerifiedUserNavigation: vi.fn(() => []),
  requireAuth: vi.fn(() => (_req: any, _res: any, next: any) => next()),
  blockUserAccess: vi.fn(() => (_req: any, _res: any, next: any) => next())
}));

vi.mock("@hmcts/subscription", () => ({
  getAllSubscriptionsByUserId: vi.fn(),
  getCaseSubscriptionsByUserId: vi.fn()
}));

vi.mock("@hmcts/subscription-list-types", () => ({
  getListTypeSubscriptionsByUserId: vi.fn()
}));

describe("subscription-management", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockReq = {
      user: { id: "user123" } as any,
      query: {},
      path: "/subscription-management",
      session: {} as any
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

  describe("GET", () => {
    it("should render page with subscriptions", async () => {
      // Arrange
      const mockSubscriptions = [
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

      vi.mocked(subscriptionService.getAllSubscriptionsByUserId).mockResolvedValue(mockSubscriptions);
      vi.mocked(subscriptionService.getCaseSubscriptionsByUserId).mockResolvedValue([]);

      // Act
      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      // Assert
      expect(subscriptionService.getAllSubscriptionsByUserId).toHaveBeenCalledWith("user123", "en");
      expect(mockRes.render).toHaveBeenCalledWith(
        "subscription-management/index",
        expect.objectContaining({
          courtCount: 2,
          totalCount: 2,
          courtSubscriptions: expect.arrayContaining([
            expect.objectContaining({ locationName: "Birmingham Crown Court" }),
            expect.objectContaining({ locationName: "Manchester Crown Court" })
          ])
        })
      );
    });

    it("should render page with no subscriptions", async () => {
      // Arrange
      vi.mocked(subscriptionService.getAllSubscriptionsByUserId).mockResolvedValue([]);
      vi.mocked(subscriptionService.getCaseSubscriptionsByUserId).mockResolvedValue([]);

      // Act
      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      // Assert
      expect(mockRes.render).toHaveBeenCalledWith(
        "subscription-management/index",
        expect.objectContaining({
          courtCount: 0,
          totalCount: 0
        })
      );
    });

    it("should redirect to sign-in when no user in request", async () => {
      // Arrange
      mockReq.user = undefined;

      // Act
      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      // Assert
      expect(mockRes.redirect).toHaveBeenCalledWith("/sign-in");
      expect(subscriptionService.getAllSubscriptionsByUserId).not.toHaveBeenCalled();
    });

    it("should clear list type subscription session data when accessing page", async () => {
      // Arrange
      (mockReq.session as any).listTypeSubscription = {
        selectedLocationIds: [1, 2, 3],
        selectedListTypeIds: [4, 5],
        language: "ENGLISH"
      };

      vi.mocked(subscriptionService.getAllSubscriptionsByUserId).mockResolvedValue([]);
      vi.mocked(subscriptionService.getCaseSubscriptionsByUserId).mockResolvedValue([]);

      // Act
      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      // Assert
      expect((mockReq.session as any).listTypeSubscription).toBeUndefined();
    });
  });

  describe("POST", () => {
    it("should seed session with existing list type subscriptions and redirect", async () => {
      // Arrange
      const mockListTypeSubscriptions = [
        { listTypeSubscriptionId: "lts1", userId: "user123", listTypeId: 1, language: ["ENGLISH"], dateAdded: new Date() },
        { listTypeSubscriptionId: "lts2", userId: "user123", listTypeId: 3, language: ["ENGLISH"], dateAdded: new Date() }
      ];
      vi.mocked(listTypeSubscriptionService.getListTypeSubscriptionsByUserId).mockResolvedValue(mockListTypeSubscriptions);
      const sessionSave = vi.fn((cb) => cb(null));
      mockReq.session.save = sessionSave;

      // Act
      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      // Assert
      expect(listTypeSubscriptionService.getListTypeSubscriptionsByUserId).toHaveBeenCalledWith("user123");
      expect((mockReq.session as any).listTypeSubscription).toEqual({
        selectedListTypeIds: [1, 3],
        editMode: true
      });
      expect(mockRes.redirect).toHaveBeenCalledWith("/subscription-list-types");
    });

    it("should redirect to sign-in when no user in request", async () => {
      // Arrange
      mockReq.user = undefined;

      // Act
      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      // Assert
      expect(mockRes.redirect).toHaveBeenCalledWith("/sign-in");
      expect(listTypeSubscriptionService.getListTypeSubscriptionsByUserId).not.toHaveBeenCalled();
    });

    it("should seed empty list when user has no existing subscriptions", async () => {
      // Arrange
      vi.mocked(listTypeSubscriptionService.getListTypeSubscriptionsByUserId).mockResolvedValue([]);
      const sessionSave = vi.fn((cb) => cb(null));
      mockReq.session.save = sessionSave;

      // Act
      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      // Assert
      expect((mockReq.session as any).listTypeSubscription).toEqual({
        selectedListTypeIds: [],
        editMode: true
      });
      expect(mockRes.redirect).toHaveBeenCalledWith("/subscription-list-types");
    });
  });
});
