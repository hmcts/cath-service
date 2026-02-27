import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./index.js";

vi.mock("../../third-party-user/queries.js", () => ({
  findThirdPartyUserById: vi.fn(),
  updateThirdPartySubscriptions: vi.fn()
}));

vi.mock("../../third-party-user/validation.js", () => ({
  validateSensitivity: vi.fn()
}));

vi.mock("@hmcts/list-types-common", () => ({
  mockListTypes: [
    { id: 1, englishFriendlyName: "Civil Daily Cause List" },
    { id: 2, englishFriendlyName: "Crown Daily List" }
  ]
}));

import { findThirdPartyUserById, updateThirdPartySubscriptions } from "../../third-party-user/queries.js";
import { validateSensitivity } from "../../third-party-user/validation.js";

describe("manage-third-party-subscriptions page", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();

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
      (findThirdPartyUserById as any).mockResolvedValue(null);

      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(res.render).toHaveBeenCalledWith(
        "manage-third-party-subscriptions/index",
        expect.objectContaining({
          errors: expect.arrayContaining([expect.objectContaining({ text: expect.any(String) })])
        })
      );
    });

    it("should render subscriptions page with user data", async () => {
      req.query = { id: "user-123" };
      const mockUser = {
        id: "user-123",
        name: "Test User",
        subscriptions: [{ listTypeId: 1, sensitivity: "PUBLIC" }]
      };
      (findThirdPartyUserById as any).mockResolvedValue(mockUser);

      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(findThirdPartyUserById).toHaveBeenCalledWith("user-123");
      expect(res.render).toHaveBeenCalledWith(
        "manage-third-party-subscriptions/index",
        expect.objectContaining({
          currentChannel: "API",
          currentSensitivity: "PUBLIC",
          currentListTypeIds: [1],
          errors: undefined
        })
      );
    });

    it("should store user info in session", async () => {
      req.query = { id: "user-123" };
      const mockUser = {
        id: "user-123",
        name: "Test User",
        subscriptions: [{ listTypeId: 1 }, { listTypeId: 2 }]
      };
      (findThirdPartyUserById as any).mockResolvedValue(mockUser);

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
      const mockUser = {
        id: "user-123",
        name: "Test User",
        subscriptions: []
      };
      (findThirdPartyUserById as any).mockResolvedValue(mockUser);

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
      req.query = { lng: "cy" };
      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(res.redirect).toHaveBeenCalledWith("/manage-third-party-users?lng=cy");
    });

    it("should show validation error when sensitivity not selected", async () => {
      (req.session as any).manageThirdPartyUser = {
        userId: "user-123",
        userName: "Test User",
        originalSubscriptions: []
      };
      req.body = { channel: "API", listTypes: ["1"] };
      (validateSensitivity as any).mockReturnValue({ href: "#sensitivity" });

      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(res.render).toHaveBeenCalledWith(
        "manage-third-party-subscriptions/index",
        expect.objectContaining({
          errors: expect.arrayContaining([expect.objectContaining({ href: "#sensitivity" })])
        })
      );
    });

    it("should update subscriptions and redirect to success page", async () => {
      (req.session as any).manageThirdPartyUser = {
        userId: "user-123",
        userName: "Test User",
        originalSubscriptions: [1]
      };
      req.body = { channel: "API", sensitivity: "PUBLIC", listTypes: ["1", "2"] };
      (validateSensitivity as any).mockReturnValue(null);
      (updateThirdPartySubscriptions as any).mockResolvedValue(undefined);

      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(updateThirdPartySubscriptions).toHaveBeenCalledWith("user-123", [
        { listTypeId: 1, channel: "API", sensitivity: "PUBLIC" },
        { listTypeId: 2, channel: "API", sensitivity: "PUBLIC" }
      ]);
      expect(res.redirect).toHaveBeenCalledWith("/third-party-subscriptions-updated");
    });

    it("should redirect with Welsh locale on success", async () => {
      req.query = { lng: "cy" };
      (req.session as any).manageThirdPartyUser = {
        userId: "user-123",
        userName: "Test User",
        originalSubscriptions: []
      };
      req.body = { channel: "API", sensitivity: "PUBLIC", listTypes: "1" };
      (validateSensitivity as any).mockReturnValue(null);
      (updateThirdPartySubscriptions as any).mockResolvedValue(undefined);

      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(res.redirect).toHaveBeenCalledWith("/third-party-subscriptions-updated?lng=cy");
    });

    it("should handle single listType as string", async () => {
      (req.session as any).manageThirdPartyUser = {
        userId: "user-123",
        userName: "Test User",
        originalSubscriptions: []
      };
      req.body = { channel: "API", sensitivity: "PUBLIC", listTypes: "1" };
      (validateSensitivity as any).mockReturnValue(null);
      (updateThirdPartySubscriptions as any).mockResolvedValue(undefined);

      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(updateThirdPartySubscriptions).toHaveBeenCalledWith("user-123", [{ listTypeId: 1, channel: "API", sensitivity: "PUBLIC" }]);
    });

    it("should handle no listTypes selected", async () => {
      (req.session as any).manageThirdPartyUser = {
        userId: "user-123",
        userName: "Test User",
        originalSubscriptions: [1]
      };
      req.body = { channel: "API", sensitivity: "PUBLIC" };
      (validateSensitivity as any).mockReturnValue(null);
      (updateThirdPartySubscriptions as any).mockResolvedValue(undefined);

      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(updateThirdPartySubscriptions).toHaveBeenCalledWith("user-123", []);
    });

    it("should set audit metadata with before and after list types", async () => {
      (req.session as any).manageThirdPartyUser = {
        userId: "user-123",
        userName: "Test User",
        originalSubscriptions: [1]
      };
      req.body = { channel: "API", sensitivity: "PUBLIC", listTypes: ["2"] };
      (validateSensitivity as any).mockReturnValue(null);
      (updateThirdPartySubscriptions as any).mockResolvedValue(undefined);

      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(req.auditMetadata).toEqual({
        shouldLog: true,
        action: "UPDATE_THIRD_PARTY_SUBSCRIPTIONS",
        entityInfo: expect.stringMatching(/ID: user-123, Name: Test User, Sensitivity: PUBLIC, Previous List Types: \[.*\], Current List Types: \[.*\]/)
      });
    });

    it("should clear session data after successful update", async () => {
      (req.session as any).manageThirdPartyUser = {
        userId: "user-123",
        userName: "Test User",
        originalSubscriptions: []
      };
      req.body = { channel: "API", sensitivity: "PUBLIC", listTypes: [] };
      (validateSensitivity as any).mockReturnValue(null);
      (updateThirdPartySubscriptions as any).mockResolvedValue(undefined);

      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect((req.session as any).manageThirdPartyUser).toBeUndefined();
    });

    it("should default channel to API if not provided", async () => {
      (req.session as any).manageThirdPartyUser = {
        userId: "user-123",
        userName: "Test User",
        originalSubscriptions: []
      };
      req.body = { sensitivity: "PUBLIC", listTypes: ["1"] };
      (validateSensitivity as any).mockReturnValue(null);
      (updateThirdPartySubscriptions as any).mockResolvedValue(undefined);

      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(updateThirdPartySubscriptions).toHaveBeenCalledWith("user-123", [{ listTypeId: 1, channel: "API", sensitivity: "PUBLIC" }]);
    });
  });
});
