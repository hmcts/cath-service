import * as subscriptionService from "@hmcts/subscription";
import * as listTypeSubscriptionService from "@hmcts/subscription-list-types";
import type { Request, Response } from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

vi.mock("@hmcts/subscription-list-types", () => ({
  getListTypeSubscriptionsByUserId: vi.fn()
}));

vi.mock("@hmcts/list-types-common", () => ({
  mockListTypes: [
    { id: 1, name: "CIVIL_DAILY_CAUSE_LIST", englishFriendlyName: "Civil Daily Cause List", welshFriendlyName: "Civil Daily Cause List" },
    { id: 2, name: "FAMILY_DAILY_CAUSE_LIST", englishFriendlyName: "Family Daily Cause List", welshFriendlyName: "Family Daily Cause List" }
  ],
  convertExcelToJson: vi.fn(),
  validateDateFormat: vi.fn(),
  validateNoHtmlTags: vi.fn(),
  convertExcelForListType: vi.fn(),
  createConverter: vi.fn(),
  getConverterForListType: vi.fn(),
  hasConverterForListType: vi.fn(),
  registerConverter: vi.fn(),
  convertListTypeNameToKebabCase: vi.fn(),
  validateListTypeJson: vi.fn()
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

      const mockListTypeSubscriptions = [
        {
          listTypeSubscriptionId: "lts1",
          userId: "user123",
          listTypeId: 1,
          language: "ENGLISH",
          dateAdded: new Date()
        }
      ];

      vi.mocked(subscriptionService.getAllSubscriptionsByUserId).mockResolvedValue(mockSubscriptions);
      vi.mocked(subscriptionService.getCaseSubscriptionsByUserId).mockResolvedValue([]);
      vi.mocked(listTypeSubscriptionService.getListTypeSubscriptionsByUserId).mockResolvedValue(mockListTypeSubscriptions);

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(subscriptionService.getAllSubscriptionsByUserId).toHaveBeenCalledWith("user123", "en");
      expect(listTypeSubscriptionService.getListTypeSubscriptionsByUserId).toHaveBeenCalledWith("user123");
      expect(mockRes.render).toHaveBeenCalledWith(
        "subscription-management/index",
        expect.objectContaining({
          courtCount: 2,
          totalCount: 3,
          listTypeCount: 1,
          courtSubscriptions: expect.arrayContaining([
            expect.objectContaining({ locationName: "Birmingham Crown Court" }),
            expect.objectContaining({ locationName: "Manchester Crown Court" })
          ]),
          listTypeSubscriptions: expect.arrayContaining([expect.objectContaining({ listTypeName: "Civil Daily Cause List" })])
        })
      );
    });

    it("should render page with no subscriptions", async () => {
      vi.mocked(subscriptionService.getAllSubscriptionsByUserId).mockResolvedValue([]);
      vi.mocked(subscriptionService.getCaseSubscriptionsByUserId).mockResolvedValue([]);
      vi.mocked(listTypeSubscriptionService.getListTypeSubscriptionsByUserId).mockResolvedValue([]);

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "subscription-management/index",
        expect.objectContaining({
          courtCount: 0,
          totalCount: 0,
          listTypeCount: 0
        })
      );
    });

    it("should redirect to sign-in when no user in request", async () => {
      mockReq.user = undefined;

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

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
      vi.mocked(listTypeSubscriptionService.getListTypeSubscriptionsByUserId).mockResolvedValue([]);

      // Act
      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      // Assert
      expect((mockReq.session as any).listTypeSubscription).toBeUndefined();
    });
  });
});
