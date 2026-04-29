import * as subscriptionsService from "@hmcts/subscriptions";
import type { Request, Response } from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./index.js";

vi.mock("@hmcts/auth", () => ({
  buildVerifiedUserNavigation: vi.fn(() => []),
  requireAuth: vi.fn(() => (_req: any, _res: any, next: any) => next()),
  blockUserAccess: vi.fn(() => (_req: any, _res: any, next: any) => next())
}));

vi.mock("@hmcts/location", () => ({
  getLocationById: vi.fn((id: number) => ({
    locationId: id,
    name: `Location ${id}`,
    welshName: `Lleoliad ${id}`,
    subJurisdictions: [],
    regions: []
  }))
}));

vi.mock("@hmcts/postgres-prisma", () => ({
  prisma: {
    listType: {
      findMany: vi.fn()
    }
  }
}));

vi.mock("@hmcts/subscriptions", () => ({
  createSubscriptionListTypes: vi.fn(),
  getAllSubscriptionsByUserId: vi.fn(),
  getAllowedListTypeIdsForLocations: vi.fn(),
  replaceUserSubscriptions: vi.fn()
}));

describe("subscription-confirmation-preview", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    mockReq = {
      user: { id: "user123" } as any,
      body: {},
      path: "/subscription-confirmation-preview",
      session: {
        emailSubscriptions: {
          confirmedLocations: ["100"],
          pendingListTypeIds: [1, 2],
          pendingLanguage: "ENGLISH"
        }
      } as any
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
    it("should render page with resolved location and list type names", async () => {
      const { prisma } = await import("@hmcts/postgres-prisma");
      vi.mocked(prisma.listType.findMany).mockResolvedValue([
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
      ] as any);

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "subscription-confirmation-preview/index",
        expect.objectContaining({
          locationRows: [expect.objectContaining({ locationId: "100", name: "Location 100" })],
          listTypes: expect.arrayContaining([expect.objectContaining({ listTypeId: 1, name: "Civil List" })]),
          languageDisplay: "English"
        })
      );
    });

    it("should display Welsh language label for WELSH language", async () => {
      mockReq.session = {
        emailSubscriptions: {
          confirmedLocations: ["100"],
          pendingListTypeIds: [],
          pendingLanguage: "WELSH"
        }
      } as any;
      const { prisma } = await import("@hmcts/postgres-prisma");
      vi.mocked(prisma.listType.findMany).mockResolvedValue([]);

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith("subscription-confirmation-preview/index", expect.objectContaining({ languageDisplay: "Welsh" }));
    });

    it("should render error when no locations are confirmed", async () => {
      mockReq.session = {
        emailSubscriptions: {
          confirmedLocations: [],
          pendingListTypeIds: [],
          pendingLanguage: undefined
        }
      } as any;

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "subscription-confirmation-preview/index",
        expect.objectContaining({
          locationRows: [],
          listTypes: [],
          errors: expect.objectContaining({
            errorList: expect.arrayContaining([expect.objectContaining({ text: "At least one subscription is needed.", href: "#" })])
          })
        })
      );
    });

    it("should render error when no list types are pending", async () => {
      const { prisma } = await import("@hmcts/postgres-prisma");
      vi.mocked(prisma.listType.findMany).mockResolvedValue([]);
      mockReq.session = {
        emailSubscriptions: {
          confirmedLocations: ["100"],
          pendingListTypeIds: [],
          pendingLanguage: "ENGLISH"
        }
      } as any;

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "subscription-confirmation-preview/index",
        expect.objectContaining({
          locationRows: [expect.objectContaining({ locationId: "100" })],
          listTypes: [],
          errors: expect.objectContaining({
            errorList: expect.arrayContaining([expect.objectContaining({ text: "Please select a list type to continue.", href: "#select-list-types-link" })])
          })
        })
      );
    });
  });

  describe("POST", () => {
    it("should confirm subscriptions, clear session data and redirect", async () => {
      mockReq.body = { action: "confirm" };
      vi.mocked(subscriptionsService.getAllSubscriptionsByUserId).mockResolvedValue([]);
      vi.mocked(subscriptionsService.getAllowedListTypeIdsForLocations).mockResolvedValue([1, 2]);
      vi.mocked(subscriptionsService.replaceUserSubscriptions).mockResolvedValue({ added: 1, removed: 0 });
      vi.mocked(subscriptionsService.createSubscriptionListTypes).mockResolvedValue(undefined);

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(subscriptionsService.replaceUserSubscriptions).toHaveBeenCalledWith("user123", ["100"]);
      expect(subscriptionsService.createSubscriptionListTypes).toHaveBeenCalledWith("user123", [1, 2], "ENGLISH");
      expect(mockReq.session?.emailSubscriptions?.confirmationComplete).toBe(true);
      expect(mockReq.session?.emailSubscriptions?.pendingListTypeIds).toBeUndefined();
      expect(mockReq.session?.emailSubscriptions?.pendingLanguage).toBeUndefined();
      expect(mockRes.redirect).toHaveBeenCalledWith("/subscription-confirmed");
    });

    it("should clear list types and language when last location is removed", async () => {
      mockReq.body = { action: "remove-location", locationId: "100" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockReq.session?.emailSubscriptions?.confirmedLocations).toEqual([]);
      expect(mockReq.session?.emailSubscriptions?.pendingListTypeIds).toBeUndefined();
      expect(mockReq.session?.emailSubscriptions?.pendingLanguage).toBeUndefined();
      expect(mockRes.redirect).toHaveBeenCalledWith("/subscription-confirmation-preview");
    });

    it("should remove a location and keep list types when locations remain", async () => {
      mockReq.session = {
        emailSubscriptions: {
          confirmedLocations: ["100", "200"],
          pendingListTypeIds: [1, 2],
          pendingLanguage: "ENGLISH"
        }
      } as any;
      mockReq.body = { action: "remove-location", locationId: "100" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockReq.session?.emailSubscriptions?.confirmedLocations).toEqual(["200"]);
      expect(mockReq.session?.emailSubscriptions?.pendingListTypeIds).toEqual([1, 2]);
      expect(mockReq.session?.emailSubscriptions?.pendingLanguage).toBe("ENGLISH");
      expect(mockRes.redirect).toHaveBeenCalledWith("/subscription-confirmation-preview");
    });

    it("should remove a list type from session and redirect back", async () => {
      mockReq.body = { action: "remove-list-type", listTypeId: "1" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockReq.session?.emailSubscriptions?.pendingListTypeIds).toEqual([2]);
      expect(mockRes.redirect).toHaveBeenCalledWith("/subscription-confirmation-preview");
    });

    it("should redirect to subscription-add-list-language when action is change-version", async () => {
      mockReq.body = { action: "change-version" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.redirect).toHaveBeenCalledWith("/subscription-add-list-language");
    });

    it("should redirect to sign-in when no user in request", async () => {
      mockReq.user = undefined;
      mockReq.body = { action: "confirm" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.redirect).toHaveBeenCalledWith("/sign-in");
    });
  });
});
