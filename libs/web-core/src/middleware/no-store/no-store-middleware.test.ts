import type { NextFunction, Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { NO_STORE_CACHE_CONTROL, noStore } from "./no-store-middleware.js";

describe("noStore", () => {
  it("should set a no-store Cache-Control header and continue", () => {
    // Arrange
    const res = { setHeader: vi.fn() } as unknown as Response;
    const next = vi.fn() as NextFunction;

    // Act
    noStore()({} as Request, res, next);

    // Assert
    expect(res.setHeader).toHaveBeenCalledWith("Cache-Control", NO_STORE_CACHE_CONTROL);
    expect(next).toHaveBeenCalledOnce();
  });

  it("should stop browsers and proxies storing the page", () => {
    // Assert
    expect(NO_STORE_CACHE_CONTROL).toContain("no-store");
    expect(NO_STORE_CACHE_CONTROL).toContain("private");
  });
});
