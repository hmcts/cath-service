import * as location from "@hmcts/location";
import { describe, expect, it, vi } from "vitest";
import * as queries from "../repository/queries.js";
import { validateDuplicateSubscription, validateLocationId, validateLocationIds } from "./validation.js";

vi.mock("@hmcts/location");
vi.mock("../repository/queries.js");

describe("Validation Functions", () => {
  describe("validateLocationId", () => {
    it("should return true for valid location ID", async () => {
      vi.mocked(location.getLocationById).mockResolvedValue({
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
      vi.mocked(location.getLocationById).mockResolvedValue(undefined);

      const result = await validateLocationId("999");

      expect(result).toBe(false);
      expect(location.getLocationById).toHaveBeenCalledWith(999);
    });

    it("should return false for non-numeric location ID", async () => {
      vi.mocked(location.getLocationById).mockResolvedValue(undefined);

      const result = await validateLocationId("invalid");

      expect(result).toBe(false);
    });
  });

  describe("validateLocationIds", () => {
    it("should return all true for valid location IDs", async () => {
      vi.mocked(location.getLocationsByIds).mockResolvedValue([
        { locationId: 1, name: "Court 1", welshName: "Llys 1", regions: [], subJurisdictions: [] },
        { locationId: 2, name: "Court 2", welshName: "Llys 2", regions: [], subJurisdictions: [] },
        { locationId: 3, name: "Court 3", welshName: "Llys 3", regions: [], subJurisdictions: [] }
      ]);

      const result = await validateLocationIds(["1", "2", "3"]);

      expect(result).toEqual([true, true, true]);
      expect(location.getLocationsByIds).toHaveBeenCalledWith([1, 2, 3]);
    });

    it("should return mixed results for partially valid IDs", async () => {
      vi.mocked(location.getLocationsByIds).mockResolvedValue([
        { locationId: 1, name: "Court 1", welshName: "Llys 1", regions: [], subJurisdictions: [] },
        { locationId: 3, name: "Court 3", welshName: "Llys 3", regions: [], subJurisdictions: [] }
      ]);

      const result = await validateLocationIds(["1", "2", "3"]);

      expect(result).toEqual([true, false, true]);
    });

    it("should return false for invalid location IDs", async () => {
      vi.mocked(location.getLocationsByIds).mockResolvedValue([]);

      const result = await validateLocationIds(["999", "998"]);

      expect(result).toEqual([false, false]);
    });

    it("should handle non-numeric IDs", async () => {
      vi.mocked(location.getLocationsByIds).mockResolvedValue([{ locationId: 1, name: "Court 1", welshName: "Llys 1", regions: [], subJurisdictions: [] }]);

      const result = await validateLocationIds(["1", "invalid", "notanumber"]);

      expect(result).toEqual([true, false, false]);
      expect(location.getLocationsByIds).toHaveBeenCalledWith([1]);
    });

    it("should return empty array for empty input", async () => {
      vi.mocked(location.getLocationsByIds).mockResolvedValue([]);

      const result = await validateLocationIds([]);

      expect(result).toEqual([]);
    });

    it("should handle duplicate IDs", async () => {
      vi.mocked(location.getLocationsByIds).mockResolvedValue([{ locationId: 1, name: "Court 1", welshName: "Llys 1", regions: [], subJurisdictions: [] }]);

      const result = await validateLocationIds(["1", "1", "1"]);

      expect(result).toEqual([true, true, true]);
    });
  });

  describe("validateDuplicateSubscription", () => {
    const userId = "user123";
    const locationId = "456";

    it("should return true if no existing subscription", async () => {
      vi.mocked(queries.findSubscriptionByUserAndLocation).mockResolvedValue(null);

      const result = await validateDuplicateSubscription(userId, locationId);

      expect(result).toBe(true);
      expect(queries.findSubscriptionByUserAndLocation).toHaveBeenCalledWith(userId, 456);
    });

    it("should return false if subscription exists", async () => {
      vi.mocked(queries.findSubscriptionByUserAndLocation).mockResolvedValue({
        subscriptionId: "sub123",
        userId,
        locationId: 456,
        dateAdded: new Date()
      });

      const result = await validateDuplicateSubscription(userId, locationId);

      expect(result).toBe(false);
    });
  });
});
