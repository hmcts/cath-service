import { describe, expect, it } from "vitest";
import type { LegacyLocationMetadata } from "./legacy-publication-source.js";
import { transformLocationMetadata } from "./location-metadata-transform.js";

const CONTEXT = { locationIds: new Set(["9"]) };

function buildLegacyMetadata(overrides: Partial<LegacyLocationMetadata> = {}): LegacyLocationMetadata {
  return {
    location_metadata_id: "meta-1",
    location_id: 9,
    caution_message: "  Building works  ",
    welsh_caution_message: "",
    no_list_message: null,
    welsh_no_list_message: null,
    ...overrides
  };
}

describe("transformLocationMetadata", () => {
  it("should keep the legacy id, trim messages and store blanks as null", () => {
    // Act
    const result = transformLocationMetadata([buildLegacyMetadata()], CONTEXT);

    // Assert
    expect(result.rows).toEqual([
      {
        locationMetadataId: "meta-1",
        locationId: 9,
        cautionMessage: "Building works",
        welshCautionMessage: null,
        noListMessage: null,
        welshNoListMessage: null
      }
    ]);
  });

  it("should reject unknown locations, rows with no message, and markup the admin page would refuse", () => {
    // Arrange
    const legacy = [
      buildLegacyMetadata({ location_metadata_id: "unknown", location_id: 12345 }),
      buildLegacyMetadata({ location_metadata_id: "empty", caution_message: " " }),
      buildLegacyMetadata({ location_metadata_id: "script", caution_message: "<script>alert(1)</script>" })
    ];

    // Act
    const result = transformLocationMetadata(legacy, CONTEXT);

    // Assert
    expect(result.rows).toHaveLength(0);
    expect(result.rejections.map(({ entityId }) => entityId)).toEqual(["unknown", "empty", "script"]);
    expect(result.rejections[0].reason).toBe("unknown location 12345");
    expect(result.rejections[1].reason).toBe("At least one message required");
    expect(result.rejections[2].reason).toContain("HTML tags which cannot be used");
  });
});
