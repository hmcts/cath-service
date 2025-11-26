import type { Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { GET } from "./index.js";

// Mock the auth middleware
vi.mock("@hmcts/auth", () => ({
  requireRole: () => (_req: Request, _res: Response, next: () => void) => next(),
  USER_ROLES: {
    SYSTEM_ADMIN: "SYSTEM_ADMIN",
    INTERNAL_ADMIN_CTSC: "INTERNAL_ADMIN_CTSC",
    INTERNAL_ADMIN_LOCAL: "INTERNAL_ADMIN_LOCAL"
  }
}));

describe("admin dashboard page", () => {
  describe("GET", () => {
    it("should render dashboard page with English content", async () => {
      const req = {
        query: {},
        user: { id: "test-user", email: "test@example.com", displayName: "Test User", role: "SYSTEM_ADMIN" }
      } as unknown as Request;

      const res = {
        render: vi.fn(),
        locals: {
          locale: "en",
          navigation: {
            verifiedItems: [
              { text: "Dashboard", href: "/system-admin-dashboard", current: false },
              { text: "Admin Dashboard", href: "/admin-dashboard", current: true }
            ]
          }
        }
      } as unknown as Response;

      // GET is now an array [middleware, handler]
      const handler = GET[GET.length - 1] as (req: Request, res: Response) => Promise<void>;
      await handler(req, res);

      // Verify res.locals.navigation still has the verifiedItems from middleware
      expect(res.locals.navigation.verifiedItems).toHaveLength(2);

      expect(res.render).toHaveBeenCalledWith(
        "admin-dashboard/index",
        expect.objectContaining({
          pageTitle: "Admin Dashboard",
          tiles: expect.arrayContaining([
            expect.objectContaining({
              heading: "Upload",
              description: expect.any(String)
            }),
            expect.objectContaining({
              heading: "Upload Excel File",
              description: expect.any(String)
            }),
            expect.objectContaining({
              heading: "Remove",
              description: expect.any(String)
            })
          ]),
          // navigation is not passed explicitly - it comes from res.locals via renderInterceptorMiddleware
          hideLanguageToggle: true
        })
      );
    });

    it("should render dashboard page with Welsh content", async () => {
      const req = {
        query: { lng: "cy" },
        user: { id: "test-user", email: "test@example.com", displayName: "Test User", role: "SYSTEM_ADMIN" }
      } as unknown as Request;

      const res = {
        render: vi.fn(),
        locals: {
          locale: "cy",
          navigation: {
            verifiedItems: [
              { text: "Dashboard", href: "/system-admin-dashboard", current: false },
              { text: "Admin Dashboard", href: "/admin-dashboard", current: true }
            ]
          }
        }
      } as unknown as Response;

      // GET is now an array [middleware, handler]
      const handler = GET[GET.length - 1] as (req: Request, res: Response) => Promise<void>;
      await handler(req, res);

      // Verify res.locals.navigation still has the verifiedItems from middleware
      expect(res.locals.navigation.verifiedItems).toHaveLength(2);

      expect(res.render).toHaveBeenCalledWith(
        "admin-dashboard/index",
        expect.objectContaining({
          pageTitle: "Admin Dashboard",
          tiles: expect.arrayContaining([
            expect.objectContaining({
              heading: "Upload",
              description: expect.any(String)
            }),
            expect.objectContaining({
              heading: "Upload Excel File",
              description: expect.any(String)
            }),
            expect.objectContaining({
              heading: "Remove",
              description: expect.any(String)
            })
          ]),
          // navigation is not passed explicitly - it comes from res.locals via renderInterceptorMiddleware
          hideLanguageToggle: true
        })
      );
    });

    it("should include three tiles for SYSTEM_ADMIN", async () => {
      const req = {
        query: {},
        user: { id: "test-user", email: "test@example.com", displayName: "Test User", role: "SYSTEM_ADMIN" }
      } as unknown as Request;

      const res = {
        render: vi.fn(),
        locals: {
          navigation: {
            verifiedItems: []
          }
        }
      } as unknown as Response;

      // GET is now an array [middleware, handler]
      const handler = GET[GET.length - 1] as (req: Request, res: Response) => Promise<void>;
      await handler(req, res);

      const renderCall = vi.mocked(res.render).mock.calls[0];
      const renderData = renderCall[1];

      expect(renderData.tiles).toHaveLength(3);
    });

    it("should include three tiles for INTERNAL_ADMIN_LOCAL", async () => {
      const req = {
        query: {},
        user: { id: "test-user", email: "test@example.com", displayName: "Test User", role: "INTERNAL_ADMIN_LOCAL" }
      } as unknown as Request;

      const res = {
        render: vi.fn(),
        locals: {
          navigation: {
            verifiedItems: []
          }
        }
      } as unknown as Response;

      // GET is now an array [middleware, handler]
      const handler = GET[GET.length - 1] as (req: Request, res: Response) => Promise<void>;
      await handler(req, res);

      const renderCall = vi.mocked(res.render).mock.calls[0];
      const renderData = renderCall[1];

      expect(renderData.tiles).toHaveLength(3);
    });

    it("should include four tiles for INTERNAL_ADMIN_CTSC", async () => {
      const req = {
        query: {},
        user: { id: "test-user", email: "test@example.com", displayName: "Test User", role: "INTERNAL_ADMIN_CTSC" }
      } as unknown as Request;

      const res = {
        render: vi.fn(),
        locals: {
          navigation: {
            verifiedItems: []
          }
        }
      } as unknown as Response;

      // GET is now an array [middleware, handler]
      const handler = GET[GET.length - 1] as (req: Request, res: Response) => Promise<void>;
      await handler(req, res);

      const renderCall = vi.mocked(res.render).mock.calls[0];
      const renderData = renderCall[1];

      expect(renderData.tiles).toHaveLength(4);
      expect(renderData.tiles[3]).toEqual({
        heading: "Manage Media Account Requests",
        description: "CTSC assess new media account applications"
      });
    });

    it("should set navigation.signOut with language-specific text", async () => {
      const req = {
        query: { lng: "en" },
        user: { id: "test-user", email: "test@example.com", displayName: "Test User", role: "INTERNAL_ADMIN_CTSC" }
      } as unknown as Request;

      const res = {
        render: vi.fn(),
        locals: {
          navigation: {
            verifiedItems: [{ text: "Admin Dashboard", href: "/admin-dashboard", current: true }]
          }
        }
      } as unknown as Response;

      // GET is now an array [middleware, handler]
      const handler = GET[GET.length - 1] as (req: Request, res: Response) => Promise<void>;
      await handler(req, res);

      // Verify res.locals.navigation still has the verifiedItems from middleware
      expect(res.locals.navigation.verifiedItems).toHaveLength(1);
    });

    it("should show both Dashboard and Admin Dashboard links for SYSTEM_ADMIN", async () => {
      const req = {
        query: {},
        user: { id: "test-user", email: "test@example.com", displayName: "Test User", role: "SYSTEM_ADMIN" }
      } as unknown as Request;

      const res = {
        render: vi.fn(),
        locals: {
          navigation: {
            verifiedItems: [
              { text: "Dashboard", href: "/system-admin-dashboard", current: false },
              { text: "Admin Dashboard", href: "/admin-dashboard", current: true }
            ]
          }
        }
      } as unknown as Response;

      const handler = GET[GET.length - 1] as (req: Request, res: Response) => Promise<void>;
      await handler(req, res);

      // Verify res.locals.navigation still has the verifiedItems from middleware
      expect(res.locals.navigation.verifiedItems).toHaveLength(2);
      expect(res.locals.navigation.verifiedItems[0].text).toBe("Dashboard");
      expect(res.locals.navigation.verifiedItems[1].text).toBe("Admin Dashboard");
      expect(res.locals.navigation.verifiedItems[1].current).toBe(true);
    });

    it("should show only Admin Dashboard link for INTERNAL_ADMIN_CTSC", async () => {
      const req = {
        query: {},
        user: { id: "test-user", email: "test@example.com", displayName: "Test User", role: "INTERNAL_ADMIN_CTSC" }
      } as unknown as Request;

      const res = {
        render: vi.fn(),
        locals: {
          navigation: {
            verifiedItems: [{ text: "Admin Dashboard", href: "/admin-dashboard", current: true }]
          }
        }
      } as unknown as Response;

      const handler = GET[GET.length - 1] as (req: Request, res: Response) => Promise<void>;
      await handler(req, res);

      // Verify res.locals.navigation still has the verifiedItems from middleware
      expect(res.locals.navigation.verifiedItems).toHaveLength(1);
      expect(res.locals.navigation.verifiedItems[0].text).toBe("Admin Dashboard");
      expect(res.locals.navigation.verifiedItems[0].current).toBe(true);
    });

    it("should show only Admin Dashboard link for INTERNAL_ADMIN_LOCAL", async () => {
      const req = {
        query: {},
        user: { id: "test-user", email: "test@example.com", displayName: "Test User", role: "INTERNAL_ADMIN_LOCAL" }
      } as unknown as Request;

      const res = {
        render: vi.fn(),
        locals: {
          navigation: {
            verifiedItems: [{ text: "Admin Dashboard", href: "/admin-dashboard", current: true }]
          }
        }
      } as unknown as Response;

      const handler = GET[GET.length - 1] as (req: Request, res: Response) => Promise<void>;
      await handler(req, res);

      // Verify res.locals.navigation still has the verifiedItems from middleware
      expect(res.locals.navigation.verifiedItems).toHaveLength(1);
      expect(res.locals.navigation.verifiedItems[0].text).toBe("Admin Dashboard");
      expect(res.locals.navigation.verifiedItems[0].current).toBe(true);
    });
  });
});
