import { describe, expect, it } from "vitest";
import { isUuid } from "./uuid.js";

describe("isUuid", () => {
  it("should accept a UUID in either case", () => {
    // Act
    const results = [isUuid("6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b"), isUuid("6F1C2A3B-4D5E-4F60-8A7B-9C0D1E2F3A4B")];

    // Assert
    expect(results).toEqual([true, true]);
  });

  it("should reject anything else, including a UUID with more around it", () => {
    // Act
    const results = [isUuid("user-1"), isUuid(" 6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b"), isUuid(42), isUuid(undefined)];

    // Assert
    expect(results).toEqual([false, false, false, false]);
  });
});
