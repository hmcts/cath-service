import type { Request, Response } from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./index.js";

vi.mock("@hmcts/auth", () => ({
  buildVerifiedUserNavigation: vi.fn(() => []),
  requireAuth: vi.fn(() => (_req: any, _res: any, next: any) => next()),
  blockUserAccess: vi.fn(() => (_req: any, _res: any, next: any) => next())
}));

vi.mock("@hmcts/location", () => ({
  getLocationById: vi.fn()
}));

vi.mock("@hmcts/postgres", () => ({
  prisma: {
    listType: {
      findMany: vi.fn()
    }
  }
}));

vi.mock("@hmcts/subscriptions", () => ({
  getAllSubscriptionsByUserId: vi.fn(),
  getSubscriptionListTypesByUserId: vi.fn()
}));

const mockLocationSubscriptions = [{ subscriptionId: "sub-1", locationId: 100, courtOrTribunalName: "Test Court", type: "court", dateAdded: new Date() }];

const mockLocation = {
  locationId: 100,
  name: "Test Court",
  welshName: "Llys Prawf",
  subJurisdictions: [1, 2]
};

const mockListTypeRecords = [
  {
    id: 1,
    name: "Civil List",
    friendlyName: "Civil List",
    welshFriendlyName: null,
    shortenedFriendlyName: null,
    url: null,
    defaultSensitivity: null,
    allowedProvenance: "MANUAL",
    isNonStrategic: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null
  },
  {
    id: 2,
    name: "Family List",
    friendlyName: "Family List",
    welshFriendlyName: null,
    shortenedFriendlyName: null,
    url: null,
    defaultSensitivity: null,
    allowedProvenance: "MANUAL",
    isNonStrategic: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null
  }
];

describe("subscription-configure-list", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(async () => {
    mockReq = {
      body: {},
      path: "/subscription-configure-list",
      user: { id: "user-123" } as any,
      session: { emailSubscriptions: {} } as any
    };
    mockRes = {
      render: vi.fn(),
      redirect: vi.fn(),
      locals: {}
    };

    const { getAllSubscriptionsByUserId, getSubscriptionListTypesByUserId } = await import("@hmcts/subscriptions");
    const { getLocationById } = await import("@hmcts/location");
    const { prisma } = await import("@hmcts/postgres");

    vi.mocked(getAllSubscriptionsByUserId).mockResolvedValue(mockLocationSubscriptions as any);
    vi.mocked(getLocationById).mockResolvedValue(mockLocation as any);
    vi.mocked(prisma.listType.findMany).mockResolvedValue(mockListTypeRecords as any);
    vi.mocked(getSubscriptionListTypesByUserId).mockResolvedValue(null as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("GET", () => {
    it("should redirect to sign-in when user is not authenticated", async () => {
      mockReq.user = undefined;

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.redirect).toHaveBeenCalledWith("/sign-in");
    });

    it("should render only list types relevant to the user's subscribed locations", async () => {
      const { getSubscriptionListTypesByUserId } = await import("@hmcts/subscriptions");

      vi.mocked(getSubscriptionListTypesByUserId).mockResolvedValue({
        subscriptionListTypeId: "sub-1",
        listTypeIds: [1],
        listTypeNames: ["Civil List"],
        listLanguage: ["ENGLISH"],
        dateAdded: new Date()
      } as any);

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "subscription-configure-list/index",
        expect.objectContaining({
          listTypeGroups: expect.arrayContaining([
            expect.objectContaining({
              letter: "C",
              items: expect.arrayContaining([expect.objectContaining({ listTypeId: 1, checked: true })])
            }),
            expect.objectContaining({
              letter: "F",
              items: expect.arrayContaining([expect.objectContaining({ listTypeId: 2, checked: false })])
            })
          ])
        })
      );
    });

    it("should render list types with none pre-checked when user has no list type subscriptions", async () => {
      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "subscription-configure-list/index",
        expect.objectContaining({
          listTypeGroups: expect.arrayContaining([
            expect.objectContaining({
              letter: "C",
              items: expect.arrayContaining([expect.objectContaining({ listTypeId: 1, checked: false })])
            }),
            expect.objectContaining({
              letter: "F",
              items: expect.arrayContaining([expect.objectContaining({ listTypeId: 2, checked: false })])
            })
          ])
        })
      );
    });

    it("should render empty list when user has no location subscriptions", async () => {
      const { getAllSubscriptionsByUserId } = await import("@hmcts/subscriptions");

      vi.mocked(getAllSubscriptionsByUserId).mockResolvedValue([]);

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith("subscription-configure-list/index", expect.objectContaining({ listTypeGroups: [] }));
    });

    it("should filter list types using sub-jurisdictions from the user's subscribed locations", async () => {
      const { getLocationById } = await import("@hmcts/location");
      const { prisma } = await import("@hmcts/postgres");

      vi.mocked(getLocationById).mockResolvedValue({ ...mockLocation, subJurisdictions: [1] } as any);

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(prisma.listType.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            subJurisdictions: { some: { subJurisdictionId: { in: [1] } } }
          })
        })
      );
    });

    it("should render empty list when location has no sub-jurisdictions", async () => {
      const { getLocationById } = await import("@hmcts/location");

      vi.mocked(getLocationById).mockResolvedValue({ ...mockLocation, subJurisdictions: [] } as any);

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith("subscription-configure-list/index", expect.objectContaining({ listTypeGroups: [] }));
    });
  });

  describe("POST", () => {
    it("should store selected list type IDs in session and redirect", async () => {
      mockReq.body = { selectedListTypes: ["1", "2"] };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockReq.session?.emailSubscriptions?.pendingListTypeIds).toEqual([1, 2]);
      expect(mockRes.redirect).toHaveBeenCalledWith("/subscription-configure-list-language");
    });

    it("should store a single list type ID as an array in session", async () => {
      mockReq.body = { selectedListTypes: "1" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockReq.session?.emailSubscriptions?.pendingListTypeIds).toEqual([1]);
      expect(mockRes.redirect).toHaveBeenCalledWith("/subscription-configure-list-language");
    });

    it("should show validation error when no list type selected", async () => {
      mockReq.body = {};

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "subscription-configure-list/index",
        expect.objectContaining({
          errors: expect.objectContaining({
            errorList: expect.arrayContaining([expect.objectContaining({ text: "Please select a list type to continue" })])
          })
        })
      );
    });

    it("should redirect to sign-in when no user and validation fails", async () => {
      mockReq.user = undefined;
      mockReq.body = {};

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.redirect).toHaveBeenCalledWith("/sign-in");
    });

    it("should initialize emailSubscriptions in session when it does not exist", async () => {
      mockReq.session = {} as any;
      mockReq.body = { selectedListTypes: ["1", "2"] };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockReq.session?.emailSubscriptions?.pendingListTypeIds).toEqual([1, 2]);
      expect(mockRes.redirect).toHaveBeenCalledWith("/subscription-configure-list-language");
    });
  });
});
