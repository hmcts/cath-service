import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./index.js";

vi.mock("@hmcts/system-admin-pages", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@hmcts/system-admin-pages")>();
  return {
    ...actual,
    AuditLogAction: {
      UPDATE_THIRD_PARTY_SUBSCRIPTIONS: "Update third party subscriptions"
    },
    findAllListTypes: vi.fn(),
    findThirdPartyUserById: vi.fn(),
    isFeatureEnabled: vi.fn().mockResolvedValue(false),
    updateThirdPartySubscriptions: vi.fn(),
    validateSensitivity: vi.fn()
  };
});

import { findAllListTypes, findThirdPartyUserById, isFeatureEnabled, updateThirdPartySubscriptions } from "@hmcts/system-admin-pages";

describe("manage-third-party-subscriptions page", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  const mockListTypes = [
    { id: 1, friendlyName: "Civil Daily Cause List", name: "CIVIL_DAILY_CAUSE_LIST" },
    { id: 2, friendlyName: "Crown Daily List", name: "CROWN_DAILY_LIST" }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(findAllListTypes).mockResolvedValue(mockListTypes as any);
    vi.mocked(isFeatureEnabled).mockResolvedValue(false);

    req = {
      query: {},
      body: {},
      session: {} as any,
      auditMetadata: undefined as any
    };

    res = {
      render: vi.fn(),
      redirect: vi.fn()
    };
  });

  describe("GET", () => {
    it("should redirect to manage users page when no id provided", async () => {
      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(res.redirect).toHaveBeenCalledWith("/manage-third-party-users");
    });

    it("should redirect to manage users page with Welsh locale when no id", async () => {
      req.query = { lng: "cy" };
      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(res.redirect).toHaveBeenCalledWith("/manage-third-party-users?lng=cy");
    });

    it("should render error when user not found", async () => {
      req.query = { id: "non-existent-id" };
      vi.mocked(findThirdPartyUserById).mockResolvedValue(null);

      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(res.render).toHaveBeenCalledWith(
        "manage-third-party-subscriptions/index",
        expect.objectContaining({
          errors: expect.arrayContaining([expect.objectContaining({ text: expect.any(String) })])
        })
      );
    });

    it("should render page with currentSensitivities map built from user subscriptions", async () => {
      req.query = { id: "user-123" };
      const mockUser = {
        id: "user-123",
        name: "Test User",
        subscriptions: [
          { listTypeId: 1, sensitivity: "PUBLIC" },
          { listTypeId: 2, sensitivity: "CLASSIFIED" }
        ]
      };
      vi.mocked(findThirdPartyUserById).mockResolvedValue(mockUser as any);

      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(res.render).toHaveBeenCalledWith(
        "manage-third-party-subscriptions/index",
        expect.objectContaining({
          currentSensitivities: { "1": "PUBLIC", "2": "CLASSIFIED" },
          useRadioButtons: false,
          errors: undefined
        })
      );
    });

    it("should store original subscriptions in session", async () => {
      req.query = { id: "user-123" };
      const mockUser = {
        id: "user-123",
        name: "Test User",
        subscriptions: [
          { listTypeId: 1, sensitivity: "PUBLIC" },
          { listTypeId: 2, sensitivity: "PRIVATE" }
        ]
      };
      vi.mocked(findThirdPartyUserById).mockResolvedValue(mockUser as any);

      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect((req.session as any).manageThirdPartyUser).toEqual({
        userId: "user-123",
        userName: "Test User",
        originalSubscriptions: [
          { listTypeId: 1, sensitivity: "PUBLIC" },
          { listTypeId: 2, sensitivity: "PRIVATE" }
        ]
      });
    });

    it("should handle user with no subscriptions", async () => {
      req.query = { id: "user-123" };
      const mockUser = {
        id: "user-123",
        name: "Test User",
        subscriptions: []
      };
      vi.mocked(findThirdPartyUserById).mockResolvedValue(mockUser as any);

      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(res.render).toHaveBeenCalledWith(
        "manage-third-party-subscriptions/index",
        expect.objectContaining({
          currentSensitivities: {}
        })
      );
    });

    it("should pass useRadioButtons true when LD flag is enabled", async () => {
      req.query = { id: "user-123" };
      const mockUser = { id: "user-123", name: "Test User", subscriptions: [] };
      vi.mocked(findThirdPartyUserById).mockResolvedValue(mockUser as any);
      vi.mocked(isFeatureEnabled).mockResolvedValue(true);

      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(res.render).toHaveBeenCalledWith("manage-third-party-subscriptions/index", expect.objectContaining({ useRadioButtons: true }));
    });
  });

  describe("POST", () => {
    it("should redirect to manage users page when no session data", async () => {
      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(res.redirect).toHaveBeenCalledWith("/manage-third-party-users");
    });

    it("should redirect with Welsh locale when no session data", async () => {
      req.query = { lng: "cy" };
      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(res.redirect).toHaveBeenCalledWith("/manage-third-party-users?lng=cy");
    });

    it("should update subscriptions from per-list-type sensitivity fields", async () => {
      (req.session as any).manageThirdPartyUser = {
        userId: "user-123",
        userName: "Test User",
        originalSubscriptions: []
      };
      req.body = { sensitivity_1: "PUBLIC", sensitivity_2: "CLASSIFIED" };
      vi.mocked(updateThirdPartySubscriptions).mockResolvedValue(undefined as any);

      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(updateThirdPartySubscriptions).toHaveBeenCalledWith("user-123", [
        { listTypeId: 1, channel: "API", sensitivity: "PUBLIC" },
        { listTypeId: 2, channel: "API", sensitivity: "CLASSIFIED" }
      ]);
    });

    it("should skip list types with no or invalid sensitivity selected", async () => {
      (req.session as any).manageThirdPartyUser = {
        userId: "user-123",
        userName: "Test User",
        originalSubscriptions: []
      };
      req.body = { sensitivity_1: "PUBLIC", sensitivity_2: "" };
      vi.mocked(updateThirdPartySubscriptions).mockResolvedValue(undefined as any);

      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(updateThirdPartySubscriptions).toHaveBeenCalledWith("user-123", [{ listTypeId: 1, channel: "API", sensitivity: "PUBLIC" }]);
    });

    it("should handle no sensitivities selected", async () => {
      (req.session as any).manageThirdPartyUser = {
        userId: "user-123",
        userName: "Test User",
        originalSubscriptions: [{ listTypeId: 1, sensitivity: "PUBLIC" }]
      };
      req.body = {};
      vi.mocked(updateThirdPartySubscriptions).mockResolvedValue(undefined as any);

      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(updateThirdPartySubscriptions).toHaveBeenCalledWith("user-123", []);
    });

    it("should redirect to success page on completion", async () => {
      (req.session as any).manageThirdPartyUser = {
        userId: "user-123",
        userName: "Test User",
        originalSubscriptions: []
      };
      req.body = { sensitivity_1: "PUBLIC" };
      vi.mocked(updateThirdPartySubscriptions).mockResolvedValue(undefined as any);

      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(res.redirect).toHaveBeenCalledWith("/third-party-subscriptions-updated");
    });

    it("should redirect with Welsh locale on success", async () => {
      req.query = { lng: "cy" };
      (req.session as any).manageThirdPartyUser = {
        userId: "user-123",
        userName: "Test User",
        originalSubscriptions: []
      };
      req.body = {};
      vi.mocked(updateThirdPartySubscriptions).mockResolvedValue(undefined as any);

      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(res.redirect).toHaveBeenCalledWith("/third-party-subscriptions-updated?lng=cy");
    });

    it("should set audit metadata with before and after summaries", async () => {
      (req.session as any).manageThirdPartyUser = {
        userId: "user-123",
        userName: "Test User",
        originalSubscriptions: [{ listTypeId: 1, sensitivity: "PUBLIC" }]
      };
      req.body = { sensitivity_2: "CLASSIFIED" };
      vi.mocked(updateThirdPartySubscriptions).mockResolvedValue(undefined as any);

      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(req.auditMetadata).toEqual({
        shouldLog: true,
        action: "Update third party subscriptions",
        entityInfo: expect.stringMatching(/ID: user-123, Name: Test User, Previous: \[.*\], Current: \[.*\]/)
      });
    });

    it("should clear session data after successful update", async () => {
      (req.session as any).manageThirdPartyUser = {
        userId: "user-123",
        userName: "Test User",
        originalSubscriptions: []
      };
      req.body = {};
      vi.mocked(updateThirdPartySubscriptions).mockResolvedValue(undefined as any);

      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect((req.session as any).manageThirdPartyUser).toBeUndefined();
    });
  });
});
