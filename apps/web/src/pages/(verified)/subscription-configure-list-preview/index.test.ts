import type { Request, Response } from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./index.js";

vi.mock("@hmcts/auth", () => ({
  buildVerifiedUserNavigation: vi.fn(() => []),
  requireAuth: vi.fn(() => (_req: any, _res: any, next: any) => next()),
  blockUserAccess: vi.fn(() => (_req: any, _res: any, next: any) => next())
}));

vi.mock("@hmcts/postgres-prisma", () => ({
  prisma: {
    listType: {
      findMany: vi.fn()
    }
  }
}));

vi.mock("@hmcts/subscriptions", () => ({
  replaceSubscriptionListTypes: vi.fn(),
  getAllSubscriptionsByUserId: vi.fn(),
  getAllowedListTypeIdsForLocations: vi.fn()
}));

describe("subscription-configure-list-preview", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(async () => {
    const { getAllSubscriptionsByUserId, getAllowedListTypeIdsForLocations } = await import("@hmcts/subscriptions");
    vi.mocked(getAllSubscriptionsByUserId).mockResolvedValue([{ locationId: 10 }, { caseNumber: "C1" }] as any);
    vi.mocked(getAllowedListTypeIdsForLocations).mockResolvedValue([1, 2]);

    mockReq = {
      body: {},
      path: "/subscription-configure-list-preview",
      user: { id: "user-123" } as any,
      session: {
        emailSubscriptions: {
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
    it("should render preview with resolved list type names and language", async () => {
      const { prisma } = await import("@hmcts/postgres-prisma");
      vi.mocked(prisma.listType.findMany).mockResolvedValue([
        { id: 1, friendlyName: "Civil List", welshFriendlyName: null, name: "civil_daily_list" } as any,
        { id: 2, friendlyName: "Family List", welshFriendlyName: null, name: "family_daily_list" } as any
      ]);

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "subscription-configure-list-preview/index",
        expect.objectContaining({
          listTypes: expect.arrayContaining([
            expect.objectContaining({ listTypeId: 1, name: "Civil List" }),
            expect.objectContaining({ listTypeId: 2, name: "Family List" })
          ]),
          languageDisplay: "English",
          pendingLanguage: "ENGLISH"
        })
      );
    });

    it("should resolve names only for visible list types", async () => {
      // Arrange
      const { prisma } = await import("@hmcts/postgres-prisma");
      vi.mocked(prisma.listType.findMany).mockResolvedValue([]);

      // Act
      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      // Assert
      expect(prisma.listType.findMany).toHaveBeenCalledWith({
        where: { id: { in: expect.any(Array) }, isHidden: false }
      });
    });

    it("should show noLanguageSelected and empty listTypes when session has no pending list types or language", async () => {
      const { prisma } = await import("@hmcts/postgres-prisma");
      vi.mocked(prisma.listType.findMany).mockResolvedValue([]);

      mockReq.session = { emailSubscriptions: { pendingListTypeIds: [] } } as any;

      await GET[GET.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.render).toHaveBeenCalledWith(
        "subscription-configure-list-preview/index",
        expect.objectContaining({
          listTypes: [],
          languageDisplay: "Not selected"
        })
      );
    });
  });

  describe("POST", () => {
    it("should call replaceSubscriptionListTypes and redirect to subscription-confirmed on confirm", async () => {
      const { getAllowedListTypeIdsForLocations, replaceSubscriptionListTypes } = await import("@hmcts/subscriptions");
      vi.mocked(replaceSubscriptionListTypes).mockResolvedValue(undefined);

      mockReq.body = { action: "confirm" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(getAllowedListTypeIdsForLocations).toHaveBeenCalledWith([10]);
      expect(replaceSubscriptionListTypes).toHaveBeenCalledWith("user-123", [1, 2], "ENGLISH");
      expect(mockReq.session?.emailSubscriptions?.pendingListTypeIds).toBeUndefined();
      expect(mockReq.session?.emailSubscriptions?.pendingLanguage).toBeUndefined();
      expect(mockReq.session?.emailSubscriptions?.listUpdateComplete).toBe(true);
      expect(mockRes.redirect).toHaveBeenCalledWith("/subscription-configure-list-confirmed");
    });

    it("should drop ids that are not allowed for the user's courts, such as hidden list types, before saving", async () => {
      // Arrange
      const { getAllowedListTypeIdsForLocations, replaceSubscriptionListTypes } = await import("@hmcts/subscriptions");
      vi.mocked(getAllowedListTypeIdsForLocations).mockResolvedValue([1]);
      mockReq.session = { emailSubscriptions: { pendingListTypeIds: [1, 99], pendingLanguage: "ENGLISH" } } as any;
      mockReq.body = { action: "confirm" };

      // Act
      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      // Assert
      expect(replaceSubscriptionListTypes).toHaveBeenCalledWith("user-123", [1], "ENGLISH");
      expect(mockRes.redirect).toHaveBeenCalledWith("/subscription-configure-list-confirmed");
    });

    it("should re-render without saving when none of the pending ids are allowed", async () => {
      // Arrange
      const { prisma } = await import("@hmcts/postgres-prisma");
      const { getAllowedListTypeIdsForLocations, replaceSubscriptionListTypes } = await import("@hmcts/subscriptions");
      vi.mocked(prisma.listType.findMany).mockResolvedValue([]);
      vi.mocked(getAllowedListTypeIdsForLocations).mockResolvedValue([]);
      mockReq.body = { action: "confirm" };

      // Act
      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      // Assert
      expect(replaceSubscriptionListTypes).not.toHaveBeenCalled();
      expect(mockRes.redirect).not.toHaveBeenCalledWith("/subscription-configure-list-confirmed");
      expect(mockRes.render).toHaveBeenCalledWith("subscription-configure-list-preview/index", expect.any(Object));
    });

    it("should remove a list type from session and redirect back to GET on remove-list-type", async () => {
      mockReq.body = { action: "remove-list-type", listTypeId: "1" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockReq.session?.emailSubscriptions?.pendingListTypeIds).toEqual([2]);
      expect(mockRes.redirect).toHaveBeenCalledWith("/subscription-configure-list-preview");
    });

    it("should initialize emailSubscriptions in session when removing a list type and session has no emailSubscriptions", async () => {
      mockReq.session = {} as any;
      mockReq.body = { action: "remove-list-type", listTypeId: "1" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockReq.session?.emailSubscriptions?.pendingListTypeIds).toEqual([]);
      expect(mockRes.redirect).toHaveBeenCalledWith("/subscription-configure-list-preview");
    });

    it("should redirect to subscription-configure-list-language on change-language", async () => {
      mockReq.body = { action: "change-language" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.redirect).toHaveBeenCalledWith("/subscription-configure-list-language");
    });

    it("should re-render the page with empty listTypes when confirm is submitted with no list types", async () => {
      const { prisma } = await import("@hmcts/postgres-prisma");
      const { replaceSubscriptionListTypes } = await import("@hmcts/subscriptions");
      vi.mocked(prisma.listType.findMany).mockResolvedValue([]);

      mockReq.session = { emailSubscriptions: { pendingListTypeIds: [], pendingLanguage: "ENGLISH" } } as any;
      mockReq.body = { action: "confirm" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(replaceSubscriptionListTypes).not.toHaveBeenCalled();
      expect(mockRes.redirect).not.toHaveBeenCalledWith("/subscription-configure-list-confirmed");
      expect(mockRes.render).toHaveBeenCalledWith("subscription-configure-list-preview/index", expect.objectContaining({ listTypes: [] }));
    });

    it("should redirect to sign-in when user is not authenticated on confirm", async () => {
      mockReq.user = undefined;
      mockReq.body = { action: "confirm" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.redirect).toHaveBeenCalledWith("/sign-in");
    });

    it("should redirect back to preview for unknown action", async () => {
      mockReq.body = { action: "unknown" };

      await POST[POST.length - 1](mockReq as Request, mockRes as Response, vi.fn());

      expect(mockRes.redirect).toHaveBeenCalledWith("/subscription-configure-list-preview");
    });
  });
});
