import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { requireAuth } from "./authenticate.js";

vi.mock("./redirect-helpers.js", () => ({
  redirectUnauthenticated: vi.fn()
}));

import { redirectUnauthenticated } from "./redirect-helpers.js";

describe("requireAuth middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should call next() if user is authenticated", () => {
    const middleware = requireAuth();
    const req = {
      isAuthenticated: () => true,
      originalUrl: "/system-admin-dashboard"
    } as unknown as Request;
    const res = {} as Response;
    const next = vi.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(redirectUnauthenticated).not.toHaveBeenCalled();
  });

  it("should call redirectUnauthenticated if user is not authenticated", () => {
    const middleware = requireAuth();
    const req = {
      isAuthenticated: () => false,
      originalUrl: "/admin-dashboard"
    } as unknown as Request;
    const res = {} as Response;
    const next = vi.fn();

    middleware(req, res, next);

    expect(redirectUnauthenticated).toHaveBeenCalledWith(req, res);
    expect(next).not.toHaveBeenCalled();
  });
});
