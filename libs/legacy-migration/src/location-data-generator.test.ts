import { describe, expect, it } from "vitest";
import type { LegacyLocation } from "./legacy-publication-source.js";
import { generateLocationData, renderLocationDataSource } from "./location-data-generator.js";
import type { LocationData } from "./location-drift.js";

const CURRENT: LocationData = {
  locations: [{ locationId: 1, name: "Old", welshName: "Hen", regions: [], subJurisdictions: [] }],
  regions: [{ regionId: 3, name: "South East", welshName: "De Ddwyrain" }],
  jurisdictions: [{ jurisdictionId: 1, name: "Civil", welshName: "Sifil" }],
  subJurisdictions: [{ subJurisdictionId: 7, name: "Civil Court", welshName: "Llys Sifil", jurisdictionId: 1 }]
};

function buildLegacyLocation(overrides: Partial<LegacyLocation> = {}): LegacyLocation {
  return {
    location_id: 240,
    name: "Leeds Combined Court Centre",
    welsh_name: "Canolfan Llysoedd Cyfun Leeds",
    location_type: "VENUE",
    region: ["South East"],
    welsh_region: null,
    jurisdiction: ["Civil"],
    welsh_jurisdiction: null,
    jurisdiction_type: ["Civil Court"],
    welsh_jurisdiction_type: null,
    email: null,
    contact_no: null,
    ...overrides
  };
}

describe("generateLocationData", () => {
  it("should replace locations with legacy ones keyed by the legacy P&I id, keeping the reference lists", () => {
    // Act
    const { data, issues } = generateLocationData([buildLegacyLocation()], [], CURRENT);

    // Assert
    expect(data.locations).toEqual([
      { locationId: 240, name: "Leeds Combined Court Centre", welshName: "Canolfan Llysoedd Cyfun Leeds", regions: [3], subJurisdictions: [7] }
    ]);
    expect(data.regions).toBe(CURRENT.regions);
    expect(issues).toEqual([]);
  });

  it("should carry non-venue location types and sort by id", () => {
    // Arrange
    const legacy = [buildLegacyLocation({ location_id: 300 }), buildLegacyLocation({ location_id: 16, location_type: "NATIONAL" })];

    // Act
    const { data } = generateLocationData(legacy, [], CURRENT);

    // Assert
    expect(data.locations.map(({ locationId }) => locationId)).toEqual([16, 300]);
    expect(data.locations[0].provenanceLocationType).toBe("NATIONAL");
    expect(data.locations[1]).not.toHaveProperty("provenanceLocationType");
  });

  it("should report what it cannot carry instead of inventing reference data", () => {
    // Arrange
    const legacy = [buildLegacyLocation({ welsh_name: null, region: ["Atlantis"] }), buildLegacyLocation({ location_id: 5, name: " " })];
    const references = [{ location_id: 240, provenance: "SNL", provenance_location_id: "123", provenance_location_type: "VENUE" }];

    // Act
    const { data, issues } = generateLocationData(legacy, references, CURRENT);

    // Assert
    expect(data.locations.map(({ locationId, welshName, regions }) => ({ locationId, welshName, regions }))).toEqual([
      { locationId: 240, welshName: "Leeds Combined Court Centre", regions: [] }
    ]);
    expect(issues).toEqual([
      { entityId: "5", reason: "missing name, location left out" },
      { entityId: "240", reason: "missing Welsh name, English name used" },
      { entityId: "240", reason: "location references not carried: location-data.ts has no field for them" },
      { entityId: "240", reason: "unknown region Atlantis" }
    ]);
  });
});

describe("renderLocationDataSource", () => {
  it("should render a module exporting locationData with the same shape", () => {
    // Act
    const source = renderLocationDataSource(CURRENT);

    // Assert
    expect(source).toContain('import type { Jurisdiction, Location, Region, SubJurisdiction } from "./repository/model.js";');
    expect(JSON.parse(source.slice(source.indexOf("} = ") + 4, source.lastIndexOf(";")))).toEqual(CURRENT);
  });
});
