import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./index.js";

vi.mock("@hmcts/system-admin-pages", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@hmcts/system-admin-pages")>();
  return {
    ...actual,
    findAllListTypes: vi.fn(),
    findThirdPartyUserById: vi.fn(),
    updateThirdPartySubscriptions: vi.fn()
  };
});

import { findAllListTypes, findThirdPartyUserById, updateThirdPartySubscriptions } from "@hmcts/system-admin-pages";

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

    req = {
      query: {},
      body: {},
      session: {} as any,
      auditMetadata: undefined as any
    };

    res = {
      render: vi.fn(),
      redirect: vi.fn(),
      locals: {}
    };
  });

  describe("GET", () => {
    it("should redirect to manage users page when no id provided", async () => {
      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(res.redirect).toHaveBeenCalledWith("/manage-third-party-users");
    });

    it("should redirect to manage users page with Welsh locale when no id", async () => {
      (res as any).locals = { locale: "cy" };
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

    it("should render page with current list type IDs from user subscriptions", async () => {
      req.query = { id: "00000000-0000-0000-0000-000000000001" };
      const mockUser = {
        id: "00000000-0000-0000-0000-000000000001",
        name: "Test User",
        subscriptions: [{ listTypeId: 1 }]
      };
      vi.mocked(findThirdPartyUserById).mockResolvedValue(mockUser as any);

      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(res.render).toHaveBeenCalledWith(
        "manage-third-party-subscriptions/index",
        expect.objectContaining({
          currentListTypeIds: [1],
          errors: undefined
        })
      );
    });

    it("should store original subscription list type IDs in session", async () => {
      req.query = { id: "00000000-0000-0000-0000-000000000001" };
      const mockUser = {
        id: "00000000-0000-0000-0000-000000000001",
        name: "Test User",
        subscriptions: [{ listTypeId: 1 }, { listTypeId: 2 }]
      };
      vi.mocked(findThirdPartyUserById).mockResolvedValue(mockUser as any);

      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect((req.session as any).manageThirdPartyUser).toEqual({
        userId: "00000000-0000-0000-0000-000000000001",
        userName: "Test User",
        originalSubscriptions: [1, 2]
      });
    });

    it("should handle user with no subscriptions", async () => {
      req.query = { id: "00000000-0000-0000-0000-000000000001" };
      const mockUser = { id: "00000000-0000-0000-0000-000000000001", name: "Test User", subscriptions: [] };
      vi.mocked(findThirdPartyUserById).mockResolvedValue(mockUser as any);

      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(res.render).toHaveBeenCalledWith(
        "manage-third-party-subscriptions/index",
        expect.objectContaining({
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
      (res as any).locals = { locale: "cy" };
      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(res.redirect).toHaveBeenCalledWith("/manage-third-party-users?lng=cy");
    });

    it("should update subscriptions and redirect to success page", async () => {
      (req.session as any).manageThirdPartyUser = {
        userId: "00000000-0000-0000-0000-000000000001",
        userName: "Test User",
        originalSubscriptions: [1]
      };
      req.body = { listTypes: ["1", "2"] };
      (updateThirdPartySubscriptions as any).mockResolvedValue(undefined);

      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(updateThirdPartySubscriptions).toHaveBeenCalledWith("00000000-0000-0000-0000-000000000001", [{ listTypeId: 1 }, { listTypeId: 2 }]);
      expect(res.redirect).toHaveBeenCalledWith("/third-party-subscriptions-updated");
    });

    it("should redirect with Welsh locale on success", async () => {
      (res as any).locals = { locale: "cy" };
      (req.session as any).manageThirdPartyUser = {
        userId: "00000000-0000-0000-0000-000000000001",
        userName: "Test User",
        originalSubscriptions: []
      };
      req.body = { listTypes: "1" };
      (updateThirdPartySubscriptions as any).mockResolvedValue(undefined);

      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(res.redirect).toHaveBeenCalledWith("/third-party-subscriptions-updated?lng=cy");
    });

    it("should handle single listType as string", async () => {
      (req.session as any).manageThirdPartyUser = {
        userId: "00000000-0000-0000-0000-000000000001",
        userName: "Test User",
        originalSubscriptions: []
      };
      req.body = { listTypes: "1" };
      (updateThirdPartySubscriptions as any).mockResolvedValue(undefined);

      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(updateThirdPartySubscriptions).toHaveBeenCalledWith("00000000-0000-0000-0000-000000000001", [{ listTypeId: 1 }]);
    });

    it("should handle no listTypes selected", async () => {
      (req.session as any).manageThirdPartyUser = {
        userId: "00000000-0000-0000-0000-000000000001",
        userName: "Test User",
        originalSubscriptions: [1]
      };
      req.body = {};
      (updateThirdPartySubscriptions as any).mockResolvedValue(undefined);

      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(updateThirdPartySubscriptions).toHaveBeenCalledWith("00000000-0000-0000-0000-000000000001", []);
    });

    it("should set audit metadata with before and after list types", async () => {
      (req.session as any).manageThirdPartyUser = {
        userId: "00000000-0000-0000-0000-000000000001",
        userName: "Test User",
        originalSubscriptions: [1]
      };
      req.body = { listTypes: ["2"] };
      (updateThirdPartySubscriptions as any).mockResolvedValue(undefined);

      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(req.auditMetadata).toEqual({
        shouldLog: true,
        action: "Update third party subscriptions",
        entityInfo: expect.stringMatching(/ID: 00000000-0000-0000-0000-000000000001, Name: Test User, Previous List Types: \[.*\], Current List Types: \[.*\]/)
      });
    });

    it("should clear session data after successful update", async () => {
      (req.session as any).manageThirdPartyUser = {
        userId: "00000000-0000-0000-0000-000000000001",
        userName: "Test User",
        originalSubscriptions: []
      };
      req.body = { listTypes: [] };
      (updateThirdPartySubscriptions as any).mockResolvedValue(undefined);

      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect((req.session as any).manageThirdPartyUser).toBeUndefined();
    });
  });
});
