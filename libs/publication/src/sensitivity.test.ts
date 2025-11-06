import { describe, expect, it } from "vitest";
import { Sensitivity } from "./sensitivity.js";

describe("Sensitivity Enum", () => {
  it("should have PUBLIC value", () => {
    expect(Sensitivity.PUBLIC).toBe("PUBLIC");
  });

  it("should have PRIVATE value", () => {
    expect(Sensitivity.PRIVATE).toBe("PRIVATE");
  });

  it("should have CLASSIFIED value", () => {
    expect(Sensitivity.CLASSIFIED).toBe("CLASSIFIED");
  });

  it("should have exactly 3 sensitivity values", () => {
    const values = Object.values(Sensitivity);
    expect(values).toHaveLength(3);
  });

  it("should contain all expected sensitivity values", () => {
    const values = Object.values(Sensitivity);
    expect(values).toContain("PUBLIC");
    expect(values).toContain("PRIVATE");
    expect(values).toContain("CLASSIFIED");
  });
});
