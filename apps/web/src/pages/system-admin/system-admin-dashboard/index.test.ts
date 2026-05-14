import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./index.js";

describe("system-admin-dashboard page", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();

    req = {
      query: {},
      user: {
        id: "test-user-id",
        email: "test@example.com",
        roles: ["SYSTEM_ADMIN"]
      } as any
    };

    res = {
      render: vi.fn(),
      locals: {}
    };
  });

  it("should render dashboard page in English", async () => {
    // GET is an array with middleware, the last one is the handler
    const handler = GET[GET.length - 1];
    await handler(req as Request, res as Response, vi.fn());

    expect(res.render).toHaveBeenCalledWith(
      "system-admin-dashboard/index",
      expect.objectContaining({
        user: expect.objectContaining({
          email: "test@example.com"
        })
      })
    );
  });

  it("should render dashboard page in Welsh", async () => {
    req.query = { lng: "cy" };
    const handler = GET[GET.length - 1];
    await handler(req as Request, res as Response, vi.fn());

    expect(res.render).toHaveBeenCalledWith(
      "system-admin-dashboard/index",
      expect.objectContaining({
        user: expect.objectContaining({
          email: "test@example.com"
        })
      })
    );
  });

  it("should include user information in the render", async () => {
    const testUser = {
      id: "user-123",
      email: "admin@example.com",
      roles: ["SYSTEM_ADMIN"]
    };
    req.user = testUser as any;

    const handler = GET[GET.length - 1];
    await handler(req as Request, res as Response, vi.fn());

    expect(res.render).toHaveBeenCalledWith(
      "system-admin-dashboard/index",
      expect.objectContaining({
        user: testUser
      })
    );
  });
});
