import { describe, expect, it, vi } from "vitest";

// Mock the queries module to prevent Prisma initialization
vi.mock("./queries.js", () => ({
  getAllLocations: vi.fn((language: "en" | "cy") => {
    const locations = [
      {
        locationId: 1,
        name: "Birmingham Civil and Family Justice Centre",
        welshName: "Canolfan Cyfiawnder Sifil a Theulu Birmingham",
        regions: [2],
        subJurisdictions: [1, 2]
      },
      {
        locationId: 2,
        name: "Bristol Crown Court",
        welshName: "Llys y Goron Bryste",
        regions: [3],
        subJurisdictions: [2]
      },
      {
        locationId: 11,
        name: "Cardiff Crown Court",
        welshName: "Llys y Goron Caerdydd",
        regions: [5],
        subJurisdictions: [2]
      },
      {
        locationId: 3,
        name: "Cardiff Civil and Family Justice Centre",
        welshName: "Canolfan Gyfiawnder Sifil a Theulu Caerdydd",
        regions: [5],
        subJurisdictions: [1]
      },
      {
        locationId: 4,
        name: "Leeds Combined Court Centre",
        welshName: "Canolfan Llysoedd Cyfun Leeds",
        regions: [4],
        subJurisdictions: [1, 2]
      },
      {
        locationId: 5,
        name: "Liverpool Civil and Family Court",
        welshName: "Llys Sifil a Theulu Lerpwl",
        regions: [4],
        subJurisdictions: [1]
      },
      {
        locationId: 12,
        name: "Liverpool Crown Court",
        welshName: "Llys y Goron Lerpwl",
        regions: [4],
        subJurisdictions: [2]
      },
      {
        locationId: 6,
        name: "Manchester Civil Justice Centre",
        welshName: "Canolfan Cyfiawnder Sifil Manceinion",
        regions: [4],
        subJurisdictions: [1, 2]
      },
      {
        locationId: 7,
        name: "Oxford Combined Court Centre",
        welshName: "Canolfan Llysoedd Cyfun Rhydychen",
        regions: [3],
        subJurisdictions: [1, 2]
      },
      {
        locationId: 8,
        name: "Royal Courts of Justice",
        welshName: "Llysoedd Barn Brenhinol",
        regions: [1],
        subJurisdictions: [1, 2]
      },
      {
        locationId: 9009,
        name: "Single Justice Procedure",
        welshName: "Gweithdrefn Ynad Unigol",
        regions: [6],
        subJurisdictions: [3]
      },
      {
        locationId: 13,
        name: "Southampton Combined Court Centre",
        welshName: "Canolfan Llysoedd Cyfun Southampton",
        regions: [3],
        subJurisdictions: [1, 2]
      },
      {
        locationId: 10,
        name: "Swansea Civil and Family Justice Centre",
        welshName: "Canolfan Cyfiawnder Sifil a Theulu Abertawe",
        regions: [5],
        subJurisdictions: [1]
      }
    ];

    // Sort by the appropriate name field
    return Promise.resolve(
      locations.sort((a, b) => {
        const nameA = language === "cy" ? a.welshName : a.name;
        const nameB = language === "cy" ? b.welshName : b.name;
        return nameA.localeCompare(nameB);
      })
    );
  })
}));

import { getLocationsGroupedByLetter, searchLocations } from "./service.js";

describe("searchLocations", () => {
  describe("priority ordering", () => {
    it("should prioritize starts-with matches before partial matches", async () => {
      const results = await searchLocations("man", "en");

      expect(results.length).toBeGreaterThan(0);
      expect(results[0].name).toBe("Manchester Civil Justice Centre");
    });

    it("should sort starts-with matches alphabetically", async () => {
      const results = await searchLocations("court", "en");

      const startsWithMatches = results.filter((loc) => loc.name.toLowerCase().startsWith("court"));

      for (let i = 0; i < startsWithMatches.length - 1; i++) {
        expect(startsWithMatches[i].name.localeCompare(startsWithMatches[i + 1].name)).toBeLessThanOrEqual(0);
      }
    });

    it("should sort partial matches alphabetically", async () => {
      const results = await searchLocations("justice", "en");

      const partialMatches = results.filter((loc) => !loc.name.toLowerCase().startsWith("justice") && loc.name.toLowerCase().includes("justice"));

      for (let i = 0; i < partialMatches.length - 1; i++) {
        expect(partialMatches[i].name.localeCompare(partialMatches[i + 1].name)).toBeLessThanOrEqual(0);
      }
    });

    it("should return partial matches after starts-with matches", async () => {
      const results = await searchLocations("l", "en");

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
    it("should return results regardless of case", async () => {
      const lower = await searchLocations("oxford", "en");
      const upper = await searchLocations("OXFORD", "en");
      const mixed = await searchLocations("OxFoRd", "en");

      expect(lower).toEqual(upper);
      expect(upper).toEqual(mixed);
      expect(lower[0].name).toBe("Oxford Combined Court Centre");
    });
  });

  describe("partial matching", () => {
    it("should return partial matches when no starts-with matches exist", async () => {
      const results = await searchLocations("justice", "en");
      expect(results.length).toBeGreaterThan(0);
      expect(results.every((loc) => loc.name.toLowerCase().includes("justice"))).toBe(true);
    });

    it("should return matches for single character", async () => {
      const results = await searchLocations("o", "en");
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe("empty or invalid queries", () => {
    it("should return empty array for empty string", async () => {
      const results = await searchLocations("", "en");
      expect(results).toEqual([]);
    });

    it("should return empty array for whitespace only", async () => {
      const results = await searchLocations("   ", "en");
      expect(results).toEqual([]);
    });

    it("should return empty array for no matches", async () => {
      const results = await searchLocations("zzzzzzzzz", "en");
      expect(results).toEqual([]);
    });
  });

  describe("Welsh language support", () => {
    it("should search Welsh names when language is cy", async () => {
      const results = await searchLocations("canolfan", "cy");
      expect(results.length).toBeGreaterThan(0);
      expect(results.every((loc) => loc.welshName.toLowerCase().includes("canolfan"))).toBe(true);
    });

    it("should prioritize starts-with matches in Welsh", async () => {
      const results = await searchLocations("llys", "cy");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].welshName.toLowerCase().startsWith("llys")).toBe(true);
    });

    it("should not match English names when searching in Welsh", async () => {
      const results = await searchLocations("oxford", "cy");
      expect(results.length).toBe(0);
    });
  });

  describe("trimming", () => {
    it("should trim leading whitespace", async () => {
      const results = await searchLocations("  oxford", "en");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].name).toBe("Oxford Combined Court Centre");
    });

    it("should trim trailing whitespace", async () => {
      const results = await searchLocations("oxford  ", "en");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].name).toBe("Oxford Combined Court Centre");
    });
  });
});

describe("getLocationsGroupedByLetter", () => {
  it("should group locations by first letter", async () => {
    const grouped = await getLocationsGroupedByLetter("en");

    expect(grouped).toHaveProperty("B");
    expect(grouped).toHaveProperty("C");
    expect(grouped).toHaveProperty("L");
    expect(grouped).toHaveProperty("M");
    expect(grouped).toHaveProperty("O");
    expect(grouped).toHaveProperty("R");
    expect(grouped).toHaveProperty("S");
  });

  it("should have locations sorted alphabetically within each group", async () => {
    const grouped = await getLocationsGroupedByLetter("en");

    for (const letter in grouped) {
      const locations = grouped[letter];
      for (let i = 0; i < locations.length - 1; i++) {
        expect(locations[i].name.localeCompare(locations[i + 1].name)).toBeLessThanOrEqual(0);
      }
    }
  });

  it("should use first letter in uppercase", async () => {
    const grouped = await getLocationsGroupedByLetter("en");

    for (const letter in grouped) {
      expect(letter).toBe(letter.toUpperCase());
      expect(letter.length).toBe(1);
    }
  });

  it("should group Welsh locations correctly", async () => {
    const grouped = await getLocationsGroupedByLetter("cy");

    expect(grouped).toHaveProperty("C");
    expect(grouped).toHaveProperty("G");
    expect(grouped).toHaveProperty("L");
  });

  it("should use Welsh names for grouping when language is cy", async () => {
    const grouped = await getLocationsGroupedByLetter("cy");

    for (const letter in grouped) {
      const locations = grouped[letter];
      for (const location of locations) {
        expect(location.welshName.charAt(0).toUpperCase()).toBe(letter);
      }
    }
  });

  it("should have all locations distributed across groups", async () => {
    const grouped = await getLocationsGroupedByLetter("en");

    let totalCount = 0;
    for (const letter in grouped) {
      totalCount += grouped[letter].length;
    }

    expect(totalCount).toBe(13);
  });

  describe("filtering", () => {
    it("should filter by region", async () => {
      const grouped = await getLocationsGroupedByLetter("en", { regions: [1] }); // London

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

    it("should filter by subJurisdiction", async () => {
      const grouped = await getLocationsGroupedByLetter("en", { subJurisdictions: [1] }); // Civil Court

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

    it("should filter by multiple regions", async () => {
      const grouped = await getLocationsGroupedByLetter("en", { regions: [1, 5] }); // London and Wales

      // Check all locations have either London or Wales region
      for (const letter in grouped) {
        for (const location of grouped[letter]) {
          expect(location.regions.some((r) => r === 1 || r === 5)).toBe(true);
        }
      }
    });

    it("should filter by both region and subJurisdiction", async () => {
      const grouped = await getLocationsGroupedByLetter("en", { regions: [1], subJurisdictions: [1] });

      // Check all locations match both filters
      for (const letter in grouped) {
        for (const location of grouped[letter]) {
          expect(location.regions).toContain(1);
          expect(location.subJurisdictions).toContain(1);
        }
      }
    });

    it("should return empty object when no locations match filters", async () => {
      const grouped = await getLocationsGroupedByLetter("en", { regions: [999] });
      expect(Object.keys(grouped).length).toBe(0);
    });

    it("should return all locations when no filters provided", async () => {
      const grouped = await getLocationsGroupedByLetter("en");

      let totalCount = 0;
      for (const letter in grouped) {
        totalCount += grouped[letter].length;
      }

      expect(totalCount).toBe(13);
    });
  });
});
