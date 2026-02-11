import type { NextFunction, Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { visitorCookie } from "./visitor-cookie.js";

vi.mock("node:crypto", () => ({
  default: { randomUUID: vi.fn(() => "generated-uuid-1234") }
}));

describe("visitorCookie", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();
    mockReq = { cookies: {} };
    mockRes = {
      cookie: vi.fn(),
      locals: {} as Record<string, any>
    };
    mockNext = vi.fn();
  });

  it("should generate a new visitor ID when no cookie exists", () => {
    // Act
    visitorCookie()(mockReq as Request, mockRes as Response, mockNext);

    // Assert
    expect(mockRes.cookie).toHaveBeenCalledWith(
      "cath_visitor_id",
      "generated-uuid-1234",
      expect.objectContaining({
        httpOnly: true,
        sameSite: "lax"
      })
    );
    expect(mockRes.locals?.visitorId).toBe("generated-uuid-1234");
    expect(mockNext).toHaveBeenCalled();
  });

  it("should reuse existing visitor ID from cookie", () => {
    // Arrange
    mockReq.cookies = { cath_visitor_id: "existing-visitor-id" };

    // Act
    visitorCookie()(mockReq as Request, mockRes as Response, mockNext);

    // Assert
    expect(mockRes.cookie).not.toHaveBeenCalled();
    expect(mockRes.locals?.visitorId).toBe("existing-visitor-id");
    expect(mockNext).toHaveBeenCalled();
  });

  it("should set secure flag in production", () => {
    // Arrange
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    // Act
    visitorCookie()(mockReq as Request, mockRes as Response, mockNext);

    // Assert
    expect(mockRes.cookie).toHaveBeenCalledWith("cath_visitor_id", expect.any(String), expect.objectContaining({ secure: true }));

    process.env.NODE_ENV = originalEnv;
  });
});
