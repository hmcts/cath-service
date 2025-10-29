import type { NextFunction, Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { requireSystemAdmin } from "./admin-auth-middleware.js";

describe("requireSystemAdmin", () => {
  it("should call next() and allow access", async () => {
    const req = {} as Request;
    const res = {} as Response;
    const next = vi.fn() as NextFunction;

    const middleware = requireSystemAdmin();
    await middleware(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(next).toHaveBeenCalledWith();
  });

  it("should be a function that returns middleware", () => {
    const middleware = requireSystemAdmin();
    expect(typeof middleware).toBe("function");
    expect(middleware.length).toBe(3);
  });
});
