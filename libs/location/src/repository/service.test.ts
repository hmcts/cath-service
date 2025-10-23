import { describe, expect, it } from "vitest";
import { getLocationsGroupedByLetter, searchLocations } from "./service.js";

describe("searchLocations", () => {
  describe("priority ordering", () => {
    it("should prioritize starts-with matches before partial matches", () => {
      const results = searchLocations("man", "en");

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].name).toBe("Manchester Civil Justice Centre");
    });

    it("should sort starts-with matches alphabetically", () => {
      const results = searchLocations("court", "en");

      const startsWithMatches = results.filter((loc) => loc.name.toLowerCase().startsWith("court"));

      for (let i = 0; i < startsWithMatches.length - 1; i++) {
        expect(startsWithMatches[i].name.localeCompare(startsWithMatches[i + 1].name)).toBeLessThanOrEqual(0);
      }
    });

    it("should sort partial matches alphabetically", () => {
      const results = searchLocations("justice", "en");

      const partialMatches = results.filter((loc) => !loc.name.toLowerCase().startsWith("justice") && loc.name.toLowerCase().includes("justice"));

      for (let i = 0; i < partialMatches.length - 1; i++) {
        expect(partialMatches[i].name.localeCompare(partialMatches[i + 1].name)).toBeLessThanOrEqual(0);
      }
    });

    it("should return partial matches after starts-with matches", () => {
      const results = searchLocations("l", "en");

      const startsWithCount = results.filter((loc) => loc.name.toLowerCase().startsWith("l")).length;
      const partialCount = results.filter((loc) => !loc.name.toLowerCase().startsWith("l") && loc.name.toLowerCase().includes("l")).length;

      expect(startsWithCount).toBeGreaterThan(0);
      expect(partialCount).toBeGreaterThan(0);

      for (let i = 0; i < startsWithCount; i++) {
        expect(results[i].name.toLowerCase().startsWith("l")).toBe(true);
      }

      for (let i = startsWithCount; i < results.length; i++) {
        expect(results[i].name.toLowerCase().includes("l")).toBe(true);
        expect(results[i].name.toLowerCase().startsWith("l")).toBe(false);
      }
    });
  });

  describe("case insensitivity", () => {
    it("should return results regardless of case", () => {
      const lower = searchLocations("oxford", "en");
      const upper = searchLocations("OXFORD", "en");
      const mixed = searchLocations("OxFoRd", "en");

      expect(lower).toEqual(upper);
      expect(upper).toEqual(mixed);
      expect(lower[0].name).toBe("Oxford Combined Court Centre");
    });
  });

  describe("partial matching", () => {
    it("should return partial matches when no starts-with matches exist", () => {
      const results = searchLocations("justice", "en");
      expect(results.length).toBeGreaterThan(0);
      expect(results.every((loc) => loc.name.toLowerCase().includes("justice"))).toBe(true);
    });

    it("should return matches for single character", () => {
      const results = searchLocations("o", "en");
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe("empty or invalid queries", () => {
    it("should return empty array for empty string", () => {
      const results = searchLocations("", "en");
      expect(results).toEqual([]);
    });

    it("should return empty array for whitespace only", () => {
      const results = searchLocations("   ", "en");
      expect(results).toEqual([]);
    });

    it("should return empty array for no matches", () => {
      const results = searchLocations("zzzzzzzzz", "en");
      expect(results).toEqual([]);
    });
  });

  describe("Welsh language support", () => {
    it("should search Welsh names when language is cy", () => {
      const results = searchLocations("canolfan", "cy");
      expect(results.length).toBeGreaterThan(0);
      expect(results.every((loc) => loc.welshName.toLowerCase().includes("canolfan"))).toBe(true);
    });

    it("should prioritize starts-with matches in Welsh", () => {
      const results = searchLocations("llys", "cy");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].welshName.toLowerCase().startsWith("llys")).toBe(true);
    });

    it("should not match English names when searching in Welsh", () => {
      const results = searchLocations("oxford", "cy");
      expect(results.length).toBe(0);
    });
  });

  describe("trimming", () => {
    it("should trim leading whitespace", () => {
      const results = searchLocations("  oxford", "en");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].name).toBe("Oxford Combined Court Centre");
    });

    it("should trim trailing whitespace", () => {
      const results = searchLocations("oxford  ", "en");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].name).toBe("Oxford Combined Court Centre");
    });
  });
});

describe("getLocationsGroupedByLetter", () => {
  it("should group locations by first letter", () => {
    const grouped = getLocationsGroupedByLetter("en");

    expect(grouped).toHaveProperty("B");
    expect(grouped).toHaveProperty("C");
    expect(grouped).toHaveProperty("L");
    expect(grouped).toHaveProperty("M");
    expect(grouped).toHaveProperty("N");
    expect(grouped).toHaveProperty("O");
    expect(grouped).toHaveProperty("R");
    expect(grouped).toHaveProperty("S");
  });

  it("should have locations sorted alphabetically within each group", () => {
    const grouped = getLocationsGroupedByLetter("en");

    for (const letter in grouped) {
      const locations = grouped[letter];
      for (let i = 0; i < locations.length - 1; i++) {
        expect(locations[i].name.localeCompare(locations[i + 1].name)).toBeLessThanOrEqual(0);
      }
    }
  });

  it("should use first letter in uppercase", () => {
    const grouped = getLocationsGroupedByLetter("en");

    for (const letter in grouped) {
      expect(letter).toBe(letter.toUpperCase());
      expect(letter.length).toBe(1);
    }
  });

  it("should group Welsh locations correctly", () => {
    const grouped = getLocationsGroupedByLetter("cy");

    expect(grouped).toHaveProperty("C");
    expect(grouped).toHaveProperty("G");
    expect(grouped).toHaveProperty("L");
  });

  it("should use Welsh names for grouping when language is cy", () => {
    const grouped = getLocationsGroupedByLetter("cy");

    for (const letter in grouped) {
      const locations = grouped[letter];
      for (const location of locations) {
        expect(location.welshName.charAt(0).toUpperCase()).toBe(letter);
      }
    }
  });

  it("should have all locations distributed across groups", () => {
    const grouped = getLocationsGroupedByLetter("en");

    let totalCount = 0;
    for (const letter in grouped) {
      totalCount += grouped[letter].length;
    }

    expect(totalCount).toBe(10);
  });

  describe("filtering", () => {
    it("should filter by region", () => {
      const grouped = getLocationsGroupedByLetter("en", { regions: [1] }); // London

      let totalCount = 0;
      for (const letter in grouped) {
        totalCount += grouped[letter].length;
      }

      expect(totalCount).toBeGreaterThan(0);
      expect(totalCount).toBeLessThan(10);

      // Check all locations have London region
      for (const letter in grouped) {
        for (const location of grouped[letter]) {
          expect(location.regions).toContain(1);
        }
      }
    });

    it("should filter by subJurisdiction", () => {
      const grouped = getLocationsGroupedByLetter("en", { subJurisdictions: [1] }); // Civil Court

      let totalCount = 0;
      for (const letter in grouped) {
        totalCount += grouped[letter].length;
      }

      expect(totalCount).toBeGreaterThan(0);

      // Check all locations have Civil Court sub-jurisdiction
      for (const letter in grouped) {
        for (const location of grouped[letter]) {
          expect(location.subJurisdictions).toContain(1);
        }
      }
    });

    it("should filter by multiple regions", () => {
      const grouped = getLocationsGroupedByLetter("en", { regions: [1, 5] }); // London and Wales

      // Check all locations have either London or Wales region
      for (const letter in grouped) {
        for (const location of grouped[letter]) {
          expect(location.regions.some((r) => r === 1 || r === 5)).toBe(true);
        }
      }
    });

    it("should filter by both region and subJurisdiction", () => {
      const grouped = getLocationsGroupedByLetter("en", { regions: [1], subJurisdictions: [1] });

      // Check all locations match both filters
      for (const letter in grouped) {
        for (const location of grouped[letter]) {
          expect(location.regions).toContain(1);
          expect(location.subJurisdictions).toContain(1);
        }
      }
    });

    it("should return empty object when no locations match filters", () => {
      const grouped = getLocationsGroupedByLetter("en", { regions: [999] });
      expect(Object.keys(grouped).length).toBe(0);
    });

    it("should return all locations when no filters provided", () => {
      const grouped = getLocationsGroupedByLetter("en");

      let totalCount = 0;
      for (const letter in grouped) {
        totalCount += grouped[letter].length;
      }

      expect(totalCount).toBe(10);
    });
  });
});
