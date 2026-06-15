import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./index.js";

describe("third-party-user-created page", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();

    req = {
      query: {},
      session: {} as any
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

    it("should redirect when session exists but no createdUserId", async () => {
      (req.session as any).createThirdPartyUser = {
        name: "Test User",
        idempotencyToken: "abc123"
      };

      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(res.redirect).toHaveBeenCalledWith("/create-third-party-user");
    });

    it("should render success page with user name in English", async () => {
      (req.session as any).createThirdPartyUser = {
        name: "Test User",
        idempotencyToken: "abc123",
        createdUserId: "user-123"
      };

      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(res.render).toHaveBeenCalledWith(
        "third-party-user-created/index",
        expect.objectContaining({
          userName: "Test User"
        })
      );
    });

    it("should render success page in Welsh", async () => {
      req.query = { lng: "cy" };
      (req.session as any).createThirdPartyUser = {
        name: "Test User",
        idempotencyToken: "abc123",
        createdUserId: "user-123"
      };

      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect(res.render).toHaveBeenCalledWith(
        "third-party-user-created/index",
        expect.objectContaining({
          userName: "Test User"
        })
      );
    });

    it("should clear session data after rendering", async () => {
      (req.session as any).createThirdPartyUser = {
        name: "Test User",
        idempotencyToken: "abc123",
        createdUserId: "user-123"
      };

      const handler = GET[GET.length - 1];
      await handler(req as Request, res as Response, vi.fn());

      expect((req.session as any).createThirdPartyUser).toBeUndefined();
    });
  });
});
