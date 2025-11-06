import { describe, expect, it } from "vitest";
import { Language } from "./language.js";

describe("Language Enum", () => {
  it("should have ENGLISH value", () => {
    expect(Language.ENGLISH).toBe("ENGLISH");
  });

  it("should have WELSH value", () => {
    expect(Language.WELSH).toBe("WELSH");
  });

  it("should have BILINGUAL value", () => {
    expect(Language.BILINGUAL).toBe("BILINGUAL");
  });

  it("should have exactly 3 language values", () => {
    const values = Object.values(Language);
    expect(values).toHaveLength(3);
  });

  it("should contain all expected language values", () => {
    const values = Object.values(Language);
    expect(values).toContain("ENGLISH");
    expect(values).toContain("WELSH");
    expect(values).toContain("BILINGUAL");
  });
});
