import type { NextFunction, Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRoutingProxy } from "./proxy-middleware.js";

let capturedNewHandler: ((req: any, res: any, next: any) => void) | null = null;
let capturedOldHandler: ((req: any, res: any, next: any) => void) | null = null;
let callCount = 0;

vi.mock("http-proxy-middleware", () => ({
  createProxyMiddleware: vi.fn((opts: { target: string }) => {
    callCount++;
    const handler = vi.fn((req: any, res: any, next: any) => {
      next();
    });
    if (callCount % 2 === 1) {
      capturedNewHandler = handler;
    } else {
      capturedOldHandler = handler;
    }
    return handler;
  })
}));

describe("createRoutingProxy", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let mockLdClient: { boolVariation: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();
    callCount = 0;
    capturedNewHandler = null;
    capturedOldHandler = null;

    mockReq = {};
    mockRes = {
      locals: { visitorId: "test-visitor-123" },
      setHeader: vi.fn(),
      status: vi.fn().mockReturnThis(),
      send: vi.fn()
    };
    mockNext = vi.fn();
    mockLdClient = {
      boolVariation: vi.fn()
    };
  });

  it("should route to new service when flag is true", async () => {
    // Arrange
    mockLdClient.boolVariation.mockResolvedValue(true);
    const middleware = createRoutingProxy({
      ldClient: mockLdClient as any,
      newServiceUrl: "http://new:8080",
      oldServiceUrl: "http://old:3000"
    });

    // Act
    await middleware(mockReq as Request, mockRes as Response, mockNext);

    // Assert
    expect(capturedNewHandler).toHaveBeenCalled();
    expect(capturedOldHandler).not.toHaveBeenCalled();
    expect(mockLdClient.boolVariation).toHaveBeenCalledWith("cath-new-service", { kind: "user", key: "test-visitor-123" }, false);
  });

  it("should route to old service when flag is false", async () => {
    // Arrange
    mockLdClient.boolVariation.mockResolvedValue(false);
    const middleware = createRoutingProxy({
      ldClient: mockLdClient as any,
      newServiceUrl: "http://new:8080",
      oldServiceUrl: "http://old:3000"
    });

    // Act
    await middleware(mockReq as Request, mockRes as Response, mockNext);

    // Assert
    expect(capturedOldHandler).toHaveBeenCalled();
    expect(capturedNewHandler).not.toHaveBeenCalled();
  });

  it("should route to old service when LD client is null", async () => {
    // Arrange
    const middleware = createRoutingProxy({
      ldClient: null,
      newServiceUrl: "http://new:8080",
      oldServiceUrl: "http://old:3000"
    });

    // Act
    await middleware(mockReq as Request, mockRes as Response, mockNext);

    // Assert
    expect(capturedOldHandler).toHaveBeenCalled();
    expect(capturedNewHandler).not.toHaveBeenCalled();
  });

  it("should route to old service when LD evaluation throws", async () => {
    // Arrange
    mockLdClient.boolVariation.mockRejectedValue(new Error("LD error"));
    const middleware = createRoutingProxy({
      ldClient: mockLdClient as any,
      newServiceUrl: "http://new:8080",
      oldServiceUrl: "http://old:3000"
    });

    // Act
    await middleware(mockReq as Request, mockRes as Response, mockNext);

    // Assert
    expect(capturedOldHandler).toHaveBeenCalled();
    expect(capturedNewHandler).not.toHaveBeenCalled();
  });
});
