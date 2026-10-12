import { describe, expect, it } from "vitest";
import type { LegacyLocation } from "./legacy-publication-source.js";
import { findLocationDrift, type LocationData } from "./location-drift.js";

const CURRENT: LocationData = {
  locations: [
    { locationId: 1, name: "Oxford Combined Court Centre", welshName: "Canolfan Rhydychen", regions: [3], subJurisdictions: [1] },
    { locationId: 2, name: "Only Here", welshName: "Dim ond yma", regions: [], subJurisdictions: [] }
  ],
  regions: [{ regionId: 3, name: "South East", welshName: "De Ddwyrain" }],
  jurisdictions: [{ jurisdictionId: 1, name: "Civil", welshName: "Sifil" }],
  subJurisdictions: [{ subJurisdictionId: 1, name: "Civil Court", welshName: "Llys Sifil", jurisdictionId: 1 }]
};

function buildLegacyLocation(overrides: Partial<LegacyLocation> = {}): LegacyLocation {
  return {
    location_id: 1,
    name: "Oxford Combined Court Centre",
    welsh_name: "Canolfan Rhydychen",
    location_type: "VENUE",
    region: ["South East"],
    welsh_region: ["De Ddwyrain"],
    jurisdiction: ["Civil"],
    welsh_jurisdiction: ["Sifil"],
    jurisdiction_type: ["Civil Court"],
    welsh_jurisdiction_type: ["Llys Sifil"],
    email: null,
    contact_no: null,
    ...overrides
  };
}

describe("findLocationDrift", () => {
  it("should report nothing for a matching location apart from new-only locations", () => {
    // Act
    const drift = findLocationDrift([buildLegacyLocation()], CURRENT);

    // Assert
    expect(drift).toEqual([{ entityId: "2", reason: "in location-data.ts but not in legacy" }]);
  });

  it("should compare regions and sub-jurisdictions by name, ignoring case and order", () => {
    // Act
    const drift = findLocationDrift([buildLegacyLocation({ region: ["south east"], jurisdiction_type: [" Civil Court "] })], CURRENT);

    // Assert
    expect(drift.filter(({ entityId }) => entityId === "1")).toEqual([]);
  });

  it("should report each kind of difference", () => {
    // Arrange
    const legacy = [
      buildLegacyLocation({ name: "Oxford Court", welsh_name: "Llys Rhydychen", region: ["London"], jurisdiction_type: [] }),
      buildLegacyLocation({ location_id: 99 })
    ];

    // Act
    const drift = findLocationDrift(legacy, CURRENT);

    // Assert
    expect(drift).toEqual([
      { entityId: "1", reason: "name differs" },
      { entityId: "1", reason: "Welsh name differs" },
      { entityId: "1", reason: "regions differ" },
      { entityId: "1", reason: "sub-jurisdictions differ" },
      { entityId: "99", reason: "missing from location-data.ts" },
      { entityId: "2", reason: "in location-data.ts but not in legacy" }
    ]);
  });
});
