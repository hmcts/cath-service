import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./index.js";

vi.mock("@hmcts/system-admin-pages", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@hmcts/system-admin-pages")>();
  return {
    ...actual,
    AuditLogAction: {
      UPDATE_THIRD_PARTY_SUBSCRIPTIONS: "UPDATE_THIRD_PARTY_SUBSCRIPTIONS"
    },
    findAllListTypes: vi.fn(),
    findThirdPartyUserById: vi.fn(),
    updateThirdPartySubscriptions: vi.fn(),
    validateSensitivity: vi.fn()
  };
});

import { findAllListTypes, findThirdPartyUserById, updateThirdPartySubscriptions, validateSensitivity } from "@hmcts/system-admin-pages";

describe("manage-third-party-subscriptions page", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  const mockListTypes = [
    { id: 1, friendlyName: "Civil Daily Cause List", name: "CIVIL_DAILY_CAUSE_LIST", welshFriendlyName: "Rhestr Achos Dyddiol Sifil" },
    { id: 2, friendlyName: "Crown Daily List", name: "CROWN_DAILY_LIST", welshFriendlyName: "Rhestr Ddyddiol y Goron" }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(findAllListTypes).mockResolvedValue(mockListTypes as any);
    vi.mocked(validateSensitivity).mockReturnValue(null);

    req = {
      query: {},
      body: {},
      session: {} as any,
      auditMetadata: undefined as any
    };

    res = {
      render: vi.fn(),
      redirect: vi.fn(),
      locals: { locale: "en" } as any
    };
  });

  describe("GET", () => {
    it("should redirect to manage users page when no id provided", async () => {
      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(res.redirect).toHaveBeenCalledWith("/manage-third-party-users");
    });

    it("should redirect with Welsh locale when no id", async () => {
      res.locals = { locale: "cy" } as any;
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

    it("should render page with current sensitivity and list type IDs from user subscriptions", async () => {
      req.query = { id: "user-123" };
      const mockUser = {
        id: "user-123",
        name: "Test User",
        subscriptions: [
          { listTypeId: 1, sensitivity: "PUBLIC" },
          { listTypeId: 2, sensitivity: "PUBLIC" }
        ]
      };
      vi.mocked(findThirdPartyUserById).mockResolvedValue(mockUser as any);

      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(res.render).toHaveBeenCalledWith(
        "manage-third-party-subscriptions/index",
        expect.objectContaining({
          currentChannel: "API",
          currentSensitivity: "PUBLIC",
          currentListTypeIds: [1, 2],
          errors: undefined
        })
      );
    });

    it("should store original subscription list type IDs in session", async () => {
      req.query = { id: "user-123" };
      const mockUser = {
        id: "user-123",
        name: "Test User",
        subscriptions: [{ listTypeId: 1, sensitivity: "PUBLIC" }, { listTypeId: 2, sensitivity: "PRIVATE" }]
      };
      vi.mocked(findThirdPartyUserById).mockResolvedValue(mockUser as any);

      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect((req.session as any).manageThirdPartyUser).toEqual({
        userId: "user-123",
        userName: "Test User",
        originalSubscriptions: [1, 2]
      });
    });

    it("should handle user with no subscriptions", async () => {
      req.query = { id: "user-123" };
      const mockUser = { id: "user-123", name: "Test User", subscriptions: [] };
      vi.mocked(findThirdPartyUserById).mockResolvedValue(mockUser as any);

      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(res.render).toHaveBeenCalledWith(
        "manage-third-party-subscriptions/index",
        expect.objectContaining({
          currentSensitivity: "",
          currentListTypeIds: []
        })
      );
    });
  });

  describe("POST", () => {
    it("should redirect to manage users page when no session data", async () => {
      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(res.redirect).toHaveBeenCalledWith("/manage-third-party-users");
    });

    it("should redirect with Welsh locale when no session data", async () => {
      res.locals = { locale: "cy" } as any;
      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(res.redirect).toHaveBeenCalledWith("/manage-third-party-users?lng=cy");
    });

    it("should show validation error when sensitivity not selected", async () => {
      (req.session as any).manageThirdPartyUser = { userId: "user-123", userName: "Test User", originalSubscriptions: [] };
      req.body = { channel: "API", listTypes: ["1"] };
      vi.mocked(validateSensitivity).mockReturnValue({ href: "#sensitivity" });

      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(res.render).toHaveBeenCalledWith(
        "manage-third-party-subscriptions/index",
        expect.objectContaining({
          errors: expect.arrayContaining([expect.objectContaining({ href: "#sensitivity" })])
        })
      );
    });

    it("should update subscriptions with selected list types and sensitivity", async () => {
      (req.session as any).manageThirdPartyUser = { userId: "user-123", userName: "Test User", originalSubscriptions: [1] };
      req.body = { channel: "API", sensitivity: "PUBLIC", listTypes: ["1", "2"] };
      vi.mocked(updateThirdPartySubscriptions).mockResolvedValue(undefined as any);

      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(updateThirdPartySubscriptions).toHaveBeenCalledWith("user-123", [
        { listTypeId: 1, channel: "API", sensitivity: "PUBLIC" },
        { listTypeId: 2, channel: "API", sensitivity: "PUBLIC" }
      ]);
    });

    it("should handle single listType as string", async () => {
      (req.session as any).manageThirdPartyUser = { userId: "user-123", userName: "Test User", originalSubscriptions: [] };
      req.body = { channel: "API", sensitivity: "PRIVATE", listTypes: "1" };
      vi.mocked(updateThirdPartySubscriptions).mockResolvedValue(undefined as any);

      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(updateThirdPartySubscriptions).toHaveBeenCalledWith("user-123", [{ listTypeId: 1, channel: "API", sensitivity: "PRIVATE" }]);
    });

    it("should handle no listTypes selected", async () => {
      (req.session as any).manageThirdPartyUser = { userId: "user-123", userName: "Test User", originalSubscriptions: [1] };
      req.body = { channel: "API", sensitivity: "PUBLIC" };
      vi.mocked(updateThirdPartySubscriptions).mockResolvedValue(undefined as any);

      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(updateThirdPartySubscriptions).toHaveBeenCalledWith("user-123", []);
    });

    it("should redirect to success page on completion", async () => {
      (req.session as any).manageThirdPartyUser = { userId: "user-123", userName: "Test User", originalSubscriptions: [] };
      req.body = { channel: "API", sensitivity: "PUBLIC", listTypes: ["1"] };
      vi.mocked(updateThirdPartySubscriptions).mockResolvedValue(undefined as any);

      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(res.redirect).toHaveBeenCalledWith("/third-party-subscriptions-updated");
    });

    it("should redirect with Welsh locale on success", async () => {
      res.locals = { locale: "cy" } as any;
      (req.session as any).manageThirdPartyUser = { userId: "user-123", userName: "Test User", originalSubscriptions: [] };
      req.body = { channel: "API", sensitivity: "PUBLIC", listTypes: "1" };
      vi.mocked(updateThirdPartySubscriptions).mockResolvedValue(undefined as any);

      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(res.redirect).toHaveBeenCalledWith("/third-party-subscriptions-updated?lng=cy");
    });

    it("should set audit metadata with before and after list types", async () => {
      (req.session as any).manageThirdPartyUser = { userId: "user-123", userName: "Test User", originalSubscriptions: [1] };
      req.body = { channel: "API", sensitivity: "PUBLIC", listTypes: ["2"] };
      vi.mocked(updateThirdPartySubscriptions).mockResolvedValue(undefined as any);

      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(req.auditMetadata).toEqual({
        shouldLog: true,
        action: "UPDATE_THIRD_PARTY_SUBSCRIPTIONS",
        entityInfo: expect.stringMatching(/ID: user-123, Name: Test User, Sensitivity: PUBLIC, Previous List Types: \[.*\], Current List Types: \[.*\]/)
      });
    });

    it("should clear session data after successful update", async () => {
      (req.session as any).manageThirdPartyUser = { userId: "user-123", userName: "Test User", originalSubscriptions: [] };
      req.body = { channel: "API", sensitivity: "PUBLIC" };
      vi.mocked(updateThirdPartySubscriptions).mockResolvedValue(undefined as any);

      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect((req.session as any).manageThirdPartyUser).toBeUndefined();
    });

    it("should default channel to API if not provided", async () => {
      (req.session as any).manageThirdPartyUser = { userId: "user-123", userName: "Test User", originalSubscriptions: [] };
      req.body = { sensitivity: "PUBLIC", listTypes: ["1"] };
      vi.mocked(updateThirdPartySubscriptions).mockResolvedValue(undefined as any);

      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(updateThirdPartySubscriptions).toHaveBeenCalledWith("user-123", [{ listTypeId: 1, channel: "API", sensitivity: "PUBLIC" }]);
    });
  });
});
