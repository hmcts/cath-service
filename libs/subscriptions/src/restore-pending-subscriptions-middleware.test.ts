import { beforeEach, describe, expect, it, vi } from "vitest";
import { restorePendingSubscriptionsMiddleware } from "./restore-pending-subscriptions-middleware.js";

vi.mock("./pending-subscriptions-store.js", () => ({
  getPendingSubscriptions: vi.fn(),
  getPendingCaseSubscriptions: vi.fn()
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

  it("should restore pending location subscriptions from Redis and call next", async () => {
    const { getPendingSubscriptions, getPendingCaseSubscriptions } = await import("./pending-subscriptions-store.js");
    vi.mocked(getPendingSubscriptions).mockResolvedValue(["loc-1", "loc-2"]);
    vi.mocked(getPendingCaseSubscriptions).mockResolvedValue(null);

    await restorePendingSubscriptionsMiddleware()(mockReq, mockRes, mockNext);

    expect(mockReq.session.emailSubscriptions?.pendingSubscriptions).toEqual(["loc-1", "loc-2"]);
    expect(mockReq.session.pendingSubscriptionsRestored).toBe(true);
    expect(mockNext).toHaveBeenCalledTimes(1);
  });

  it("should restore pending case subscriptions from Redis and call next", async () => {
    const { getPendingSubscriptions, getPendingCaseSubscriptions } = await import("./pending-subscriptions-store.js");
    const caseSubscriptions = [{ caseName: "Smith v Jones", caseNumber: "AB-123", searchType: "CASE_NAME" as const, searchValue: "Smith v Jones" }];
    vi.mocked(getPendingSubscriptions).mockResolvedValue(null);
    vi.mocked(getPendingCaseSubscriptions).mockResolvedValue(caseSubscriptions);

    await restorePendingSubscriptionsMiddleware()(mockReq, mockRes, mockNext);

    expect(mockReq.session.emailSubscriptions?.pendingCaseSubscriptions).toEqual(caseSubscriptions);
    expect(mockReq.session.pendingSubscriptionsRestored).toBe(true);
    expect(mockNext).toHaveBeenCalledTimes(1);
  });

  it("should restore both location and case subscriptions from Redis", async () => {
    const { getPendingSubscriptions, getPendingCaseSubscriptions } = await import("./pending-subscriptions-store.js");
    const caseSubscriptions = [{ caseName: "Smith v Jones", caseNumber: "AB-123", searchType: "CASE_NAME" as const, searchValue: "Smith v Jones" }];
    vi.mocked(getPendingSubscriptions).mockResolvedValue(["loc-1"]);
    vi.mocked(getPendingCaseSubscriptions).mockResolvedValue(caseSubscriptions);

    await restorePendingSubscriptionsMiddleware()(mockReq, mockRes, mockNext);

    expect(mockReq.session.emailSubscriptions?.pendingSubscriptions).toEqual(["loc-1"]);
    expect(mockReq.session.emailSubscriptions?.pendingCaseSubscriptions).toEqual(caseSubscriptions);
    expect(mockReq.session.pendingSubscriptionsRestored).toBe(true);
  });

  it("should initialize emailSubscriptions when it does not exist and Redis has data", async () => {
    const { getPendingSubscriptions, getPendingCaseSubscriptions } = await import("./pending-subscriptions-store.js");
    vi.mocked(getPendingSubscriptions).mockResolvedValue(["loc-1"]);
    vi.mocked(getPendingCaseSubscriptions).mockResolvedValue(null);
    mockReq.session.emailSubscriptions = undefined;

    await restorePendingSubscriptionsMiddleware()(mockReq, mockRes, mockNext);

    expect(mockReq.session.emailSubscriptions?.pendingSubscriptions).toEqual(["loc-1"]);
  });

  it("should call next without setting subscriptions when Redis returns null for both", async () => {
    const { getPendingSubscriptions, getPendingCaseSubscriptions } = await import("./pending-subscriptions-store.js");
    vi.mocked(getPendingSubscriptions).mockResolvedValue(null);
    vi.mocked(getPendingCaseSubscriptions).mockResolvedValue(null);

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
