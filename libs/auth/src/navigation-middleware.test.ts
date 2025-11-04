import type { Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { authNavigationMiddleware } from "./navigation-middleware.js";

describe("authNavigationMiddleware", () => {
  it("should set isAuthenticated to true for authenticated user", () => {
    const middleware = authNavigationMiddleware();

    const req = {
      isAuthenticated: () => true
    } as Request;

    const res = {
      locals: {}
    } as Response;

    const next = vi.fn();

    middleware(req, res, next);

    expect(res.locals.isAuthenticated).toBe(true);
    expect(next).toHaveBeenCalled();
  });

  it("should set isAuthenticated to false for unauthenticated user", () => {
    const middleware = authNavigationMiddleware();

    const req = {
      isAuthenticated: () => false
    } as Request;

    const res = {
      locals: {}
    } as Response;

    const next = vi.fn();

    middleware(req, res, next);

    expect(res.locals.isAuthenticated).toBe(false);
    expect(next).toHaveBeenCalled();
  });
});
