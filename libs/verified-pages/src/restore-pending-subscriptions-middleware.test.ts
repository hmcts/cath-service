import { beforeEach, describe, expect, it, vi } from "vitest";
import { restorePendingSubscriptionsMiddleware } from "./restore-pending-subscriptions-middleware.js";

vi.mock("./pending-subscriptions-store.js", () => ({
  getPendingSubscriptions: vi.fn()
}));

describe("restorePendingSubscriptionsMiddleware", () => {
  let mockReq: any;
  let mockRes: any;
  let mockNext: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockReq = {
      isAuthenticated: vi.fn().mockReturnValue(true),
      user: { id: "user-123" },
      session: {},
      app: { locals: { redisClient: {} } }
    };
    mockRes = {};
    mockNext = vi.fn();
    vi.clearAllMocks();
  });

  it("should call next immediately when user is not authenticated", async () => {
    mockReq.isAuthenticated.mockReturnValue(false);

    await restorePendingSubscriptionsMiddleware()(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(mockReq.session.pendingSubscriptionsRestored).toBeUndefined();
  });

  it("should call next immediately when user has no ID", async () => {
    mockReq.user = undefined;

    await restorePendingSubscriptionsMiddleware()(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(mockReq.session.pendingSubscriptionsRestored).toBeUndefined();
  });

  it("should call next immediately when subscriptions have already been restored", async () => {
    mockReq.session.pendingSubscriptionsRestored = true;

    await restorePendingSubscriptionsMiddleware()(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(1);
  });

  it("should call next without hitting Redis when session already has pending subscriptions", async () => {
    const { getPendingSubscriptions } = await import("./pending-subscriptions-store.js");
    mockReq.session.emailSubscriptions = { pendingSubscriptions: ["loc-1"] };

    await restorePendingSubscriptionsMiddleware()(mockReq, mockRes, mockNext);

    expect(getPendingSubscriptions).not.toHaveBeenCalled();
    expect(mockNext).toHaveBeenCalledTimes(1);
    expect(mockReq.session.pendingSubscriptionsRestored).toBe(true);
  });

  it("should restore pending subscriptions from Redis and call next", async () => {
    const { getPendingSubscriptions } = await import("./pending-subscriptions-store.js");
    vi.mocked(getPendingSubscriptions).mockResolvedValue(["loc-1", "loc-2"]);

    await restorePendingSubscriptionsMiddleware()(mockReq, mockRes, mockNext);

    expect(mockReq.session.emailSubscriptions?.pendingSubscriptions).toEqual(["loc-1", "loc-2"]);
    expect(mockNext).toHaveBeenCalledTimes(1);
  });

  it("should initialize emailSubscriptions when it does not exist and Redis has data", async () => {
    const { getPendingSubscriptions } = await import("./pending-subscriptions-store.js");
    vi.mocked(getPendingSubscriptions).mockResolvedValue(["loc-1"]);
    mockReq.session.emailSubscriptions = undefined;

    await restorePendingSubscriptionsMiddleware()(mockReq, mockRes, mockNext);

    expect(mockReq.session.emailSubscriptions?.pendingSubscriptions).toEqual(["loc-1"]);
  });

  it("should call next without setting subscriptions when Redis returns null", async () => {
    const { getPendingSubscriptions } = await import("./pending-subscriptions-store.js");
    vi.mocked(getPendingSubscriptions).mockResolvedValue(null);

    await restorePendingSubscriptionsMiddleware()(mockReq, mockRes, mockNext);

    expect(mockReq.session.emailSubscriptions).toBeUndefined();
    expect(mockNext).toHaveBeenCalledTimes(1);
  });

  it("should call next even when Redis throws an error", async () => {
    const { getPendingSubscriptions } = await import("./pending-subscriptions-store.js");
    vi.mocked(getPendingSubscriptions).mockRejectedValue(new Error("Redis connection error"));

    await restorePendingSubscriptionsMiddleware()(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalledTimes(1);
  });
});
