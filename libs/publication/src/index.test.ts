import { describe, expect, it } from "vitest";
import { Language, Sensitivity, mockListTypes, mockPublications } from "./index.js";

describe("Publication Module Exports", () => {
  it("should export Language enum", () => {
    expect(Language).toBeDefined();
    expect(Language.ENGLISH).toBe("ENGLISH");
    expect(Language.WELSH).toBe("WELSH");
    expect(Language.BILINGUAL).toBe("BILINGUAL");
  });

  it("should export Sensitivity enum", () => {
    expect(Sensitivity).toBeDefined();
    expect(Sensitivity.PUBLIC).toBe("PUBLIC");
    expect(Sensitivity.PRIVATE).toBe("PRIVATE");
    expect(Sensitivity.CLASSIFIED).toBe("CLASSIFIED");
  });

  it("should export mockListTypes array", () => {
    expect(mockListTypes).toBeDefined();
    expect(Array.isArray(mockListTypes)).toBe(true);
    expect(mockListTypes.length).toBeGreaterThan(0);
  });

  it("should export mockPublications array", () => {
    expect(mockPublications).toBeDefined();
    expect(Array.isArray(mockPublications)).toBe(true);
    expect(mockPublications.length).toBeGreaterThan(0);
  });
});
