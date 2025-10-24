import { describe, expect, it } from "vitest";
import { getAllJurisdictions, getAllLocations, getAllRegions, getAllSubJurisdictions, getLocationById, getSubJurisdictionsByJurisdiction } from "./queries.js";

describe("getAllLocations", () => {
  it("should return all locations", () => {
    const results = getAllLocations("en");
    expect(results.length).toBe(10);
  });

  it("should return locations sorted alphabetically by name", () => {
    const results = getAllLocations("en");

    for (let i = 0; i < results.length - 1; i++) {
      expect(results[i].name.localeCompare(results[i + 1].name)).toBeLessThanOrEqual(0);
    }
  });

  it("should return locations sorted alphabetically by Welsh name when language is cy", () => {
    const results = getAllLocations("cy");

    for (let i = 0; i < results.length - 1; i++) {
      expect(results[i].welshName.localeCompare(results[i + 1].welshName)).toBeLessThanOrEqual(0);
    }
  });

  it("should not mutate original data", () => {
    const results1 = getAllLocations("en");
    const results2 = getAllLocations("en");

    expect(results1).toEqual(results2);
  });
});

describe("getLocationById", () => {
  it("should return location for valid ID", () => {
    const location = getLocationById(1);
    expect(location).toBeDefined();
    expect(location?.locationId).toBe(1);
    expect(location?.name).toBe("Oxford Combined Court Centre");
  });

  it("should return undefined for non-existent ID", () => {
    const location = getLocationById(999);
    expect(location).toBeUndefined();
  });

  it("should return Single Justice Procedure location", () => {
    const location = getLocationById(9);
    expect(location).toBeDefined();
    expect(location?.name).toBe("Single Justice Procedure");
  });

  it("should return location with all properties", () => {
    const location = getLocationById(1);
    expect(location).toBeDefined();
    expect(location).toHaveProperty("locationId");
    expect(location).toHaveProperty("name");
    expect(location).toHaveProperty("welshName");
    expect(location).toHaveProperty("regions");
    expect(location).toHaveProperty("subJurisdictions");
  });
});

describe("getAllJurisdictions", () => {
  it("should return all jurisdictions", () => {
    const jurisdictions = getAllJurisdictions();
    expect(jurisdictions.length).toBe(4);
  });

  it("should have correct structure", () => {
    const jurisdictions = getAllJurisdictions();
    for (const jurisdiction of jurisdictions) {
      expect(jurisdiction).toHaveProperty("jurisdictionId");
      expect(jurisdiction).toHaveProperty("name");
      expect(jurisdiction).toHaveProperty("welshName");
    }
  });

  it("should include Civil jurisdiction", () => {
    const jurisdictions = getAllJurisdictions();
    const civil = jurisdictions.find((j) => j.jurisdictionId === 1);
    expect(civil).toBeDefined();
    expect(civil?.name).toBe("Civil");
  });
});

describe("getAllRegions", () => {
  it("should return all regions", () => {
    const regions = getAllRegions();
    expect(regions.length).toBe(5);
  });

  it("should have correct structure", () => {
    const regions = getAllRegions();
    for (const region of regions) {
      expect(region).toHaveProperty("regionId");
      expect(region).toHaveProperty("name");
      expect(region).toHaveProperty("welshName");
    }
  });

  it("should include London region", () => {
    const regions = getAllRegions();
    const london = regions.find((r) => r.regionId === 1);
    expect(london).toBeDefined();
    expect(london?.name).toBe("London");
  });
});

describe("getAllSubJurisdictions", () => {
  it("should return all sub-jurisdictions", () => {
    const subJurisdictions = getAllSubJurisdictions();
    expect(subJurisdictions.length).toBe(7);
  });

  it("should have correct structure", () => {
    const subJurisdictions = getAllSubJurisdictions();
    for (const subJurisdiction of subJurisdictions) {
      expect(subJurisdiction).toHaveProperty("subJurisdictionId");
      expect(subJurisdiction).toHaveProperty("name");
      expect(subJurisdiction).toHaveProperty("welshName");
      expect(subJurisdiction).toHaveProperty("jurisdictionId");
    }
  });

  it("should include Civil Court sub-jurisdiction", () => {
    const subJurisdictions = getAllSubJurisdictions();
    const civil = subJurisdictions.find((s) => s.subJurisdictionId === 1);
    expect(civil).toBeDefined();
    expect(civil?.name).toBe("Civil Court");
    expect(civil?.jurisdictionId).toBe(1);
  });
});

describe("getSubJurisdictionsByJurisdiction", () => {
  it("should return sub-jurisdictions for Civil jurisdiction", () => {
    const subJurisdictions = getSubJurisdictionsByJurisdiction(1);
    expect(subJurisdictions.length).toBeGreaterThan(0);
    for (const sub of subJurisdictions) {
      expect(sub.jurisdictionId).toBe(1);
    }
  });

  it("should return sub-jurisdictions for Tribunal jurisdiction", () => {
    const subJurisdictions = getSubJurisdictionsByJurisdiction(4);
    expect(subJurisdictions.length).toBeGreaterThan(0);
    for (const sub of subJurisdictions) {
      expect(sub.jurisdictionId).toBe(4);
    }
  });

  it("should return empty array for non-existent jurisdiction", () => {
    const subJurisdictions = getSubJurisdictionsByJurisdiction(999);
    expect(subJurisdictions).toEqual([]);
  });

  it("should not mutate original data", () => {
    const result1 = getSubJurisdictionsByJurisdiction(1);
    const result2 = getSubJurisdictionsByJurisdiction(1);
    expect(result1).toEqual(result2);
  });
});
