import type { SessionData } from "express-session";
import { describe, expect, it } from "vitest";

describe("email-subscriptions session types", () => {
  it("should extend express-session with emailSubscriptions property", () => {
    const mockSession: SessionData = {
      cookie: {} as any
    };

    mockSession.emailSubscriptions = {
      pendingSubscriptions: ["123", "456"],
      confirmationComplete: true,
      confirmedLocations: ["123"],
      subscriptionToRemove: "sub123"
    };

    expect(mockSession.emailSubscriptions).toBeDefined();
    expect(mockSession.emailSubscriptions?.pendingSubscriptions).toEqual(["123", "456"]);
    expect(mockSession.emailSubscriptions?.confirmationComplete).toBe(true);
    expect(mockSession.emailSubscriptions?.confirmedLocations).toEqual(["123"]);
    expect(mockSession.emailSubscriptions?.subscriptionToRemove).toBe("sub123");
  });

  it("should allow emailSubscriptions to be undefined", () => {
    const mockSession: SessionData = {
      cookie: {} as any
    };

    expect(mockSession.emailSubscriptions).toBeUndefined();
  });

  it("should allow partial emailSubscriptions object", () => {
    const mockSession: SessionData = {
      cookie: {} as any,
      emailSubscriptions: {
        pendingSubscriptions: ["123"]
      }
    };

    expect(mockSession.emailSubscriptions?.pendingSubscriptions).toEqual(["123"]);
    expect(mockSession.emailSubscriptions?.confirmationComplete).toBeUndefined();
  });

  it("should support successMessage property", () => {
    const mockSession: SessionData = {
      cookie: {} as any,
      successMessage: "Subscription successful"
    };

    expect(mockSession.successMessage).toBe("Subscription successful");
  });

  it("should allow successMessage to be undefined", () => {
    const mockSession: SessionData = {
      cookie: {} as any
    };

    expect(mockSession.successMessage).toBeUndefined();
  });
});
