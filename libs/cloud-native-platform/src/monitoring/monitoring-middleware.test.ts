import type { NextFunction, Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { type MonitoringMiddlewareConfig, monitoringMiddleware } from "./monitoring-middleware.js";
import { MonitoringService } from "./monitoring-service.js";

vi.mock("./monitoring-service.js");

function createMockMonitoringService(overrides: Partial<MonitoringService> = {}) {
  return class MockMonitoringService {
    trackRequest = overrides.trackRequest ?? vi.fn();
    trackException = overrides.trackException ?? vi.fn();
    trackEvent = overrides.trackEvent ?? vi.fn();
    trackMetric = overrides.trackMetric ?? vi.fn();
    flush = overrides.flush ?? vi.fn();
  };
}

describe("monitoringMiddleware", () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;
  let config: MonitoringMiddlewareConfig;

  beforeEach(() => {
    vi.clearAllMocks();

    req = {
      method: "GET",
      path: "/test",
      url: "/test?query=value",
      route: { path: "/test" },
      headers: {
        "user-agent": "Mozilla/5.0"
      }
    };

    res = {
      statusCode: 200,
      on: vi.fn()
    };

    next = vi.fn();

    config = {
      serviceName: "test-service",
      appInsightsConnectionString: "InstrumentationKey=test",
      enabled: true
    };
  });

  it("should call next function", () => {
    const middleware = monitoringMiddleware(config);

    middleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalled();
  });

  it("should not initialize monitoring when disabled", () => {
    config.enabled = false;
    const middleware = monitoringMiddleware(config);

    middleware(req as Request, res as Response, next);

    expect(MonitoringService).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  it("should initialize monitoring service when enabled", () => {
    vi.mocked(MonitoringService).mockImplementation(createMockMonitoringService() as any);

    const middleware = monitoringMiddleware(config);

    middleware(req as Request, res as Response, next);

    expect(MonitoringService).toHaveBeenCalledWith("InstrumentationKey=test", "test-service");
  });

  it("should track request on finish event", () => {
    const mockTrackRequest = vi.fn();
    const mockTrackException = vi.fn();

    vi.mocked(MonitoringService).mockImplementation(
      createMockMonitoringService({
        trackRequest: mockTrackRequest,
        trackException: mockTrackException
      }) as any
    );

    const middleware = monitoringMiddleware(config);
    let finishCallback: () => void;

    res.on = vi.fn((event: string, callback: () => void) => {
      if (event === "finish") {
        finishCallback = callback;
      }
    }) as any;

    middleware(req as Request, res as Response, next);

    expect(res.on).toHaveBeenCalledWith("finish", expect.any(Function));

    finishCallback!();

    expect(mockTrackRequest).toHaveBeenCalledWith({
      name: "GET /test",
      url: "/test?query=value",
      duration: expect.any(Number),
      resultCode: 200,
      success: true,
      properties: {
        method: "GET",
        path: "/test",
        userAgent: "Mozilla/5.0"
      }
    });
  });

  it("should track exception on error event", () => {
    const mockTrackException = vi.fn();

    vi.mocked(MonitoringService).mockImplementation(
      createMockMonitoringService({
        trackException: mockTrackException
      }) as any
    );

    const middleware = monitoringMiddleware(config);
    let errorCallback: (err: Error) => void;

    res.on = vi.fn((event: string, callback: (err: Error) => void) => {
      if (event === "error") {
        errorCallback = callback;
      }
    }) as any;

    middleware(req as Request, res as Response, next);

    expect(res.on).toHaveBeenCalledWith("error", expect.any(Function));

    const testError = new Error("Test error");
    errorCallback!(testError);

    expect(mockTrackException).toHaveBeenCalledWith(testError);
  });

  it("should handle request without route", () => {
    const mockTrackRequest = vi.fn();

    vi.mocked(MonitoringService).mockImplementation(
      createMockMonitoringService({
        trackRequest: mockTrackRequest
      }) as any
    );

    delete req.route;

    const middleware = monitoringMiddleware(config);
    let finishCallback: () => void;

    res.on = vi.fn((event: string, callback: () => void) => {
      if (event === "finish") {
        finishCallback = callback;
      }
    }) as any;

    middleware(req as Request, res as Response, next);
    finishCallback!();

    expect(mockTrackRequest).toHaveBeenCalledWith({
      name: "GET /test",
      url: "/test?query=value",
      duration: expect.any(Number),
      resultCode: 200,
      success: true,
      properties: {
        method: "GET",
        path: "/test",
        userAgent: "Mozilla/5.0"
      }
    });
  });

  it("should track failed request", () => {
    const mockTrackRequest = vi.fn();

    vi.mocked(MonitoringService).mockImplementation(
      createMockMonitoringService({
        trackRequest: mockTrackRequest
      }) as any
    );

    res.statusCode = 500;

    const middleware = monitoringMiddleware(config);
    let finishCallback: () => void;

    res.on = vi.fn((event: string, callback: () => void) => {
      if (event === "finish") {
        finishCallback = callback;
      }
    }) as any;

    middleware(req as Request, res as Response, next);
    finishCallback!();

    expect(mockTrackRequest).toHaveBeenCalledWith({
      name: "GET /test",
      url: "/test?query=value",
      duration: expect.any(Number),
      resultCode: 500,
      success: false,
      properties: {
        method: "GET",
        path: "/test",
        userAgent: "Mozilla/5.0"
      }
    });
  });
});
