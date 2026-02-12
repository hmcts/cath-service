import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./index.js";

vi.mock("../../third-party-user/queries.js", () => ({
  createThirdPartyUser: vi.fn()
}));

import { createThirdPartyUser } from "../../third-party-user/queries.js";

describe("create-third-party-user-summary page", () => {
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
    it("should redirect to create page when no session data", async () => {
      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(res.redirect).toHaveBeenCalledWith("/create-third-party-user");
    });

    it("should redirect to create page with Welsh locale when no session data", async () => {
      req.query = { lng: "cy" };
      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(res.redirect).toHaveBeenCalledWith("/create-third-party-user?lng=cy");
    });

    it("should render summary page with session data in English", async () => {
      (req.session as any).createThirdPartyUser = {
        name: "Test User",
        idempotencyToken: "abc123"
      };

      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(res.render).toHaveBeenCalledWith(
        "create-third-party-user-summary/index",
        expect.objectContaining({
          name: "Test User"
        })
      );
    });

    it("should render summary page in Welsh", async () => {
      req.query = { lng: "cy" };
      (req.session as any).createThirdPartyUser = {
        name: "Test User",
        idempotencyToken: "abc123"
      };

      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(res.render).toHaveBeenCalledWith(
        "create-third-party-user-summary/index",
        expect.objectContaining({
          name: "Test User"
        })
      );
    });
  });

  describe("POST", () => {
    it("should redirect to create page when no session data", async () => {
      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(res.redirect).toHaveBeenCalledWith("/create-third-party-user");
    });

    it("should redirect to create page with Welsh locale when no session data", async () => {
      req.query = { lng: "cy" };
      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(res.redirect).toHaveBeenCalledWith("/create-third-party-user?lng=cy");
    });

    it("should redirect to success page if user already created (idempotency)", async () => {
      (req.session as any).createThirdPartyUser = {
        name: "Test User",
        idempotencyToken: "abc123",
        createdUserId: "user-123"
      };

      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(createThirdPartyUser).not.toHaveBeenCalled();
      expect(res.redirect).toHaveBeenCalledWith("/third-party-user-created");
    });

    it("should redirect to success page with Welsh locale if already created", async () => {
      req.query = { lng: "cy" };
      (req.session as any).createThirdPartyUser = {
        name: "Test User",
        idempotencyToken: "abc123",
        createdUserId: "user-123"
      };

      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(res.redirect).toHaveBeenCalledWith("/third-party-user-created?lng=cy");
    });

    it("should create user and redirect to success page", async () => {
      (req.session as any).createThirdPartyUser = {
        name: "Test User",
        idempotencyToken: "abc123"
      };
      (createThirdPartyUser as any).mockResolvedValue({ id: "new-user-id", name: "Test User" });

      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(createThirdPartyUser).toHaveBeenCalledWith("Test User");
      expect((req.session as any).createThirdPartyUser.createdUserId).toBe("new-user-id");
      expect(res.redirect).toHaveBeenCalledWith("/third-party-user-created");
    });

    it("should create user and redirect with Welsh locale", async () => {
      req.query = { lng: "cy" };
      (req.session as any).createThirdPartyUser = {
        name: "Test User",
        idempotencyToken: "abc123"
      };
      (createThirdPartyUser as any).mockResolvedValue({ id: "new-user-id", name: "Test User" });

      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(res.redirect).toHaveBeenCalledWith("/third-party-user-created?lng=cy");
    });

    it("should set audit metadata on user creation", async () => {
      (req.session as any).createThirdPartyUser = {
        name: "Test User",
        idempotencyToken: "abc123"
      };
      (createThirdPartyUser as any).mockResolvedValue({ id: "new-user-id", name: "Test User" });

      const handler = POST[POST.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(req.auditMetadata).toEqual({
        shouldLog: true,
        action: "CREATE_THIRD_PARTY_USER",
        entityInfo: "ID: new-user-id, Name: Test User"
      });
    });
  });
});
