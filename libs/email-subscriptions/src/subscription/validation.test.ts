import * as location from "@hmcts/location";
import { describe, expect, it, vi } from "vitest";
import * as queries from "./repository/queries.js";
import { validateDuplicateSubscription, validateLocationId } from "./validation.js";

vi.mock("@hmcts/location");
vi.mock("./repository/queries.js");

describe("Validation Functions", () => {
  describe("validateLocationId", () => {
    it("should return true for valid location ID", async () => {
      vi.mocked(location.getLocationById).mockReturnValue({
        locationId: 456,
        name: "Test Court",
        welshName: "Llys Prawf",
        region: "England"
      });

      const result = await validateLocationId("456");

      expect(result).toBe(true);
      expect(location.getLocationById).toHaveBeenCalledWith(456);
    });

    it("should return false for invalid location ID", async () => {
      vi.mocked(location.getLocationById).mockReturnValue(undefined);

      const result = await validateLocationId("999");

      expect(result).toBe(false);
      expect(location.getLocationById).toHaveBeenCalledWith(999);
    });

    it("should return false for non-numeric location ID", async () => {
      vi.mocked(location.getLocationById).mockReturnValue(undefined);

      const result = await validateLocationId("invalid");

      expect(result).toBe(false);
    });
  });

  describe("validateDuplicateSubscription", () => {
    const userId = "user123";
    const locationId = "456";

    it("should return true if no existing subscription", async () => {
      vi.mocked(queries.findSubscriptionByUserAndLocation).mockResolvedValue(null);

      const result = await validateDuplicateSubscription(userId, locationId);

      expect(result).toBe(true);
      expect(queries.findSubscriptionByUserAndLocation).toHaveBeenCalledWith(userId, locationId);
    });

    it("should return false if subscription exists", async () => {
      vi.mocked(queries.findSubscriptionByUserAndLocation).mockResolvedValue({
        subscriptionId: "sub123",
        userId,
        locationId,
        dateAdded: new Date()
      });

      const result = await validateDuplicateSubscription(userId, locationId);

      expect(result).toBe(false);
    });
  });
});
