import { describe, expect, it, vi } from "vitest";

vi.mock("@hmcts/publication", () => ({
  validateJson: vi.fn()
}));

import { validateJson } from "@hmcts/publication";
import { validateUtLandsChamberDailyHearingList } from "./json-validator.js";

describe("validateUtLandsChamberDailyHearingList", () => {
  it("should call validateJson with the provided data and schema and return the result", () => {
    // Arrange
    const mockData = { hearings: [] };
    const mockResult = { isValid: true, errors: [] };
    vi.mocked(validateJson).mockReturnValue(mockResult as any);

    // Act
    const result = validateUtLandsChamberDailyHearingList(mockData);

    // Assert
    expect(validateJson).toHaveBeenCalledWith(mockData, expect.any(Object), "1.0");
    expect(result).toBe(mockResult);
  });

  it("should return the validation result when data is invalid", () => {
    // Arrange
    const mockData = { invalid: true };
    const mockResult = { isValid: false, errors: ["Missing required field"] };
    vi.mocked(validateJson).mockReturnValue(mockResult as any);

    // Act
    const result = validateUtLandsChamberDailyHearingList(mockData);

    // Assert
    expect(validateJson).toHaveBeenCalledWith(mockData, expect.any(Object), "1.0");
    expect(result).toBe(mockResult);
  });
});
