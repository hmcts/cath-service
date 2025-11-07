import type { Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { GET } from "./index.js";

// Mock the auth middleware
vi.mock("@hmcts/auth", () => ({
  requireRole: () => (_req: Request, _res: Response, next: () => void) => next(),
  USER_ROLES: {
    SYSTEM_ADMIN: "SYSTEM_ADMIN"
  }
}));

describe("Admin Dashboard GET handler", () => {
  it("should render the dashboard page with English content", async () => {
    const req = {
      isAuthenticated: () => true,
      user: { id: "test-user", email: "test@example.com", displayName: "Test User", role: "SYSTEM_ADMIN" }
    } as unknown as Request;
    const res = {
      render: vi.fn(),
      locals: {
        navigation: {
          verifiedItems: [
            { text: "Dashboard", href: "/system-admin-dashboard", current: true },
            { text: "Admin Dashboard", href: "/admin-dashboard", current: false }
          ]
        }
      }
    } as unknown as Response;

    // GET is now an array [middleware, handler]
    const handler = GET[GET.length - 1] as (req: Request, res: Response) => Promise<void>;
    await handler(req, res);

    // Verify res.locals.navigation is set from middleware (renderInterceptorMiddleware will merge this)
    expect(res.locals.navigation).toBeDefined();
    expect(res.locals.navigation.verifiedItems).toHaveLength(2);

    expect(res.render).toHaveBeenCalledOnce();
    expect(res.render).toHaveBeenCalledWith(
      "system-admin-dashboard/index",
      expect.objectContaining({
        title: "System Admin Dashboard",
        tiles: expect.arrayContaining([
          expect.objectContaining({
            title: "Upload Reference Data",
            href: "/upload-reference-data"
          })
        ]),
        user: expect.objectContaining({
          id: "test-user",
          email: "test@example.com",
          role: "SYSTEM_ADMIN"
        })
        // navigation is not passed explicitly - it comes from res.locals via renderInterceptorMiddleware
      })
    );
  });

  it("should include all 8 tiles", async () => {
    const req = {
      isAuthenticated: () => true,
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

    const renderCall = (res.render as ReturnType<typeof vi.fn>).mock.calls[0];
    const content = renderCall[1];

    expect(content.tiles).toHaveLength(8);
    expect(content.tiles[0].title).toBe("Upload Reference Data");
    expect(content.tiles[1].title).toBe("Delete Court");
    expect(content.tiles[2].title).toBe("Manage Third-Party Users");
    expect(content.tiles[3].title).toBe("User Management");
    expect(content.tiles[4].title).toBe("Blob Explorer");
    expect(content.tiles[5].title).toBe("Bulk Create Media Accounts");
    expect(content.tiles[6].title).toBe("Audit Log Viewer");
    expect(content.tiles[7].title).toBe("Manage Location Metadata");
  });
});
