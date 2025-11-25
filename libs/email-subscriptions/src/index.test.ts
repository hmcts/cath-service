import { describe, expect, it } from "vitest";
import * as emailSubscriptionsModule from "./index.js";

describe("email-subscriptions index", () => {
  it("should export subscription service functions", () => {
    expect(emailSubscriptionsModule.createSubscription).toBeDefined();
    expect(emailSubscriptionsModule.getSubscriptionsByUserId).toBeDefined();
    expect(emailSubscriptionsModule.removeSubscription).toBeDefined();
    expect(emailSubscriptionsModule.createMultipleSubscriptions).toBeDefined();
    expect(emailSubscriptionsModule.replaceUserSubscriptions).toBeDefined();
  });

  it("should export validation functions", () => {
    expect(emailSubscriptionsModule.validateLocationId).toBeDefined();
  });

  it("should export functions as functions", () => {
    expect(typeof emailSubscriptionsModule.createSubscription).toBe("function");
    expect(typeof emailSubscriptionsModule.getSubscriptionsByUserId).toBe("function");
    expect(typeof emailSubscriptionsModule.removeSubscription).toBe("function");
    expect(typeof emailSubscriptionsModule.createMultipleSubscriptions).toBe("function");
    expect(typeof emailSubscriptionsModule.replaceUserSubscriptions).toBe("function");
    expect(typeof emailSubscriptionsModule.validateLocationId).toBe("function");
  });
});
