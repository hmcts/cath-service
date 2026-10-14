import { beforeEach, describe, expect, it, vi } from "vitest";
import { readLegacyPublicationData } from "./legacy-publication-source.js";
import { buildLocationDataCandidate } from "./location-data-candidate.js";

vi.mock("./legacy-publication-source.js", () => ({ readLegacyPublicationData: vi.fn() }));
vi.mock("@hmcts/location", () => ({
  locationData: {
    regions: [{ regionId: 1, name: "London", welshName: "Llundain" }],
    jurisdictions: [],
    subJurisdictions: [],
    locations: []
  }
}));

describe("buildLocationDataCandidate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(readLegacyPublicationData).mockResolvedValue({
      locations: [
        {
          location_id: 7,
          name: "Oxford Combined Court",
          welsh_name: null,
          location_type: "VENUE",
          region: ["London"],
          welsh_region: null,
          jurisdiction: null,
          welsh_jurisdiction: null,
          jurisdiction_type: [],
          welsh_jurisdiction_type: null,
          email: null,
          contact_no: null
        }
      ],
      locationReferences: [],
      locationMetadata: [],
      listSearchConfigs: [],
      artefacts: []
    });
  });

  it("should read legacy locations and render them against the current regions", async () => {
    // Act
    const result = await buildLocationDataCandidate("postgres://legacy");

    // Assert
    expect(readLegacyPublicationData).toHaveBeenCalledWith("postgres://legacy");
    expect(result.source).toContain("Oxford Combined Court");
    expect(result.issues).toContainEqual({ entityId: "7", reason: "missing Welsh name, English name used" });
  });
});
