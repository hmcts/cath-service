import { describe, expect, it } from "vitest";
import { buildNoMatchLocationId, getLocationIdForNoMatch, isNoMatchLocationId } from "./no-match-location.js";

describe("no-match-location", () => {
  describe("buildNoMatchLocationId", () => {
    it("should prefix the unmatched location id with NoMatch", () => {
      // Act
      const result = buildNoMatchLocationId("123");

      // Assert
      expect(result).toBe("NoMatch123");
    });

    it("should return only the prefix when the unmatched location id is empty", () => {
      // Act
      const result = buildNoMatchLocationId("");

      // Assert
      expect(result).toBe("NoMatch");
    });
  });

  describe("isNoMatchLocationId", () => {
    it("should return true when the location id starts with NoMatch", () => {
      // Act
      const result = isNoMatchLocationId("NoMatch123");

      // Assert
      expect(result).toBe(true);
    });

    it("should return false when the location id is a matched location id", () => {
      // Act
      const result = isNoMatchLocationId("123");

      // Assert
      expect(result).toBe(false);
    });

    it("should return false when the prefix has different casing", () => {
      // Act
      const result = isNoMatchLocationId("nomatch123");

      // Assert
      expect(result).toBe(false);
    });

    it("should return false when NoMatch appears but not at the start", () => {
      // Act
      const result = isNoMatchLocationId("123NoMatch");

      // Assert
      expect(result).toBe(false);
    });

    it("should return false when the location id is empty", () => {
      // Act
      const result = isNoMatchLocationId("");

      // Assert
      expect(result).toBe(false);
    });
  });

  describe("getLocationIdForNoMatch", () => {
    it("should strip the NoMatch prefix from a no-match location id", () => {
      // Act
      const result = getLocationIdForNoMatch("NoMatch123");

      // Assert
      expect(result).toBe("123");
    });

    it("should return the location id unchanged when it has no NoMatch prefix", () => {
      // Act
      const result = getLocationIdForNoMatch("123");

      // Assert
      expect(result).toBe("123");
    });

    it("should only strip the leading prefix when NoMatch is repeated", () => {
      // Act
      const result = getLocationIdForNoMatch("NoMatchNoMatch123");

      // Assert
      expect(result).toBe("NoMatch123");
    });

    it("should return the original unmatched id when round-tripped through buildNoMatchLocationId", () => {
      // Arrange
      const unmatchedLocationId = "ABC-999";

      // Act
      const result = getLocationIdForNoMatch(buildNoMatchLocationId(unmatchedLocationId));

      // Assert
      expect(result).toBe(unmatchedLocationId);
    });
  });
});
