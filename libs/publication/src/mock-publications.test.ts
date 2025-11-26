import { describe, expect, it } from "vitest";
import { mockPublications } from "./mock-publications.js";

describe("mockPublications", () => {
  it("should be an array", () => {
    expect(Array.isArray(mockPublications)).toBe(true);
  });

  it("should have at least 10 publications", () => {
    expect(mockPublications.length).toBeGreaterThanOrEqual(10);
  });

  it("should have publications with required properties", () => {
    for (const publication of mockPublications) {
      expect(publication).toHaveProperty("id");
      expect(publication).toHaveProperty("locationId");
      expect(publication).toHaveProperty("listType");
      expect(publication).toHaveProperty("contentDate");
      expect(publication).toHaveProperty("language");
    }
  });

  it("should have unique IDs for each publication", () => {
    const ids = mockPublications.map((p) => p.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("should have positive integer IDs", () => {
    for (const publication of mockPublications) {
      expect(Number.isInteger(publication.id)).toBe(true);
      expect(publication.id).toBeGreaterThan(0);
    }
  });

  it("should have positive integer location IDs", () => {
    for (const publication of mockPublications) {
      expect(Number.isInteger(publication.locationId)).toBe(true);
      expect(publication.locationId).toBeGreaterThan(0);
    }
  });

  it("should have positive integer list types", () => {
    for (const publication of mockPublications) {
      expect(Number.isInteger(publication.listType)).toBe(true);
      expect(publication.listType).toBeGreaterThan(0);
    }
  });

  it("should have valid date strings in YYYY-MM-DD format", () => {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    for (const publication of mockPublications) {
      expect(publication.contentDate).toMatch(dateRegex);
      // Verify it's a valid date
      const date = new Date(publication.contentDate);
      expect(date.toString()).not.toBe("Invalid Date");
    }
  });

  it("should have valid language values", () => {
    for (const publication of mockPublications) {
      expect(["ENGLISH", "WELSH"]).toContain(publication.language);
    }
  });

  it("should include both ENGLISH and WELSH publications", () => {
    const hasEnglish = mockPublications.some((p) => p.language === "ENGLISH");
    const hasWelsh = mockPublications.some((p) => p.language === "WELSH");
    expect(hasEnglish).toBe(true);
    expect(hasWelsh).toBe(true);
  });

  it("should have publications for at least one location", () => {
    const locationIds = new Set(mockPublications.map((p) => p.locationId));
    expect(locationIds.size).toBeGreaterThanOrEqual(1);
  });

  it("should have publications with multiple list types", () => {
    const listTypes = new Set(mockPublications.map((p) => p.listType));
    expect(listTypes.size).toBeGreaterThan(1);
  });

  it("should have publications with location ID 9", () => {
    const loc9Publications = mockPublications.filter((p) => p.locationId === 9);
    expect(loc9Publications.length).toBeGreaterThan(0);
  });

  it("should have publications with list type 4", () => {
    const type4Publications = mockPublications.filter((p) => p.listType === 4);
    expect(type4Publications.length).toBeGreaterThan(0);
  });

  it("should have publications with list type 3", () => {
    const type3Publications = mockPublications.filter((p) => p.listType === 3);
    expect(type3Publications.length).toBeGreaterThan(0);
  });
});
