import { describe, expect, it } from "vitest";
import { transformArtefacts } from "./artefact-transform.js";
import type { LegacyArtefact } from "./legacy-publication-source.js";

const ARTEFACT_ID = "55555555-5555-5555-5555-555555555555";
const CONTEXT = {
  // Arbitrary ids: resolution must go through names only.
  listTypeIdByName: new Map([
    ["CIVIL_DAILY_CAUSE_LIST", 901],
    ["UTIAC_JR_LEEDS_DAILY_HEARING_LIST", 902]
  ]),
  locationIds: new Set(["9"])
};

function buildLegacyArtefact(overrides: Partial<LegacyArtefact> = {}): LegacyArtefact {
  return {
    artefact_id: ARTEFACT_ID,
    provenance: "SNL",
    source_artefact_id: "SNL-1",
    type: "LIST",
    sensitivity: "PUBLIC",
    language: "ENGLISH",
    list_type: "CIVIL_DAILY_CAUSE_LIST",
    location_id: "9",
    is_flat_file: false,
    payload: "https://legacy.blob.core.windows.net/artefact/0f1e2d3c",
    superseded_count: 2,
    display_from: new Date("2026-10-08T00:00:00Z"),
    display_to: new Date("2026-10-10T00:00:00Z"),
    content_date: new Date("2026-10-09T00:00:00Z"),
    last_received_date: new Date("2026-10-08T17:00:00Z"),
    ...overrides
  };
}

describe("transformArtefacts", () => {
  it("should truncate the legacy content date timestamp to its date", () => {
    // Arrange
    const legacy = buildLegacyArtefact({ content_date: new Date("2026-10-09T23:30:00Z") });

    // Act
    const result = transformArtefacts([legacy], CONTEXT);

    // Assert
    expect(result.rows[0].artefact.contentDate).toEqual(new Date("2026-10-09T00:00:00Z"));
  });

  it("should keep the legacy artefact id and take the payload blob name from the URL", () => {
    // Act
    const result = transformArtefacts([buildLegacyArtefact()], CONTEXT);

    // Assert
    expect(result.rows).toEqual([
      {
        artefact: {
          artefactId: ARTEFACT_ID,
          type: "LIST",
          locationId: "9",
          listTypeId: 901,
          contentDate: new Date("2026-10-09T00:00:00Z"),
          sensitivity: "PUBLIC",
          language: "ENGLISH",
          displayFrom: new Date("2026-10-08T00:00:00Z"),
          displayTo: new Date("2026-10-10T00:00:00Z"),
          lastReceivedDate: new Date("2026-10-08T17:00:00Z"),
          isFlatFile: false,
          provenance: "SNL",
          supersededCount: 2,
          sourceArtefactId: "SNL-1"
        },
        legacyPayloadBlob: "0f1e2d3c"
      }
    ]);
  });

  it("should map renamed list types and the legacy bilingual spelling", () => {
    // Arrange
    const legacy = buildLegacyArtefact({ list_type: "UT_IAC_JR_LEEDS_DAILY_HEARING_LIST", language: "BI_LINGUAL" });

    // Act
    const result = transformArtefacts([legacy], CONTEXT);

    // Assert
    expect(result.rows[0].artefact).toMatchObject({ listTypeId: 902, language: "BILINGUAL" });
  });

  it("should keep no-match artefacts even though their location is not in this service", () => {
    // Act
    const result = transformArtefacts([buildLegacyArtefact({ location_id: "NoMatch1234" })], CONTEXT);

    // Assert
    expect(result.rows[0].artefact.locationId).toBe("NoMatch1234");
  });

  it("should reject what this service cannot represent", () => {
    // Arrange
    const legacy = [
      buildLegacyArtefact({ artefact_id: "list-type", list_type: "SJP_PRESS_REGISTER" }),
      buildLegacyArtefact({ artefact_id: "outcome", type: "JUDGEMENTS_AND_OUTCOMES" }),
      buildLegacyArtefact({ artefact_id: "internal", sensitivity: "INTERNAL" }),
      buildLegacyArtefact({ artefact_id: "location", location_id: "12345" }),
      buildLegacyArtefact({ artefact_id: "payload", payload: null })
    ];

    // Act
    const result = transformArtefacts(legacy, CONTEXT);

    // Assert
    expect(result.rows).toHaveLength(0);
    expect(result.rejections).toEqual([
      { entityId: "list-type", reason: "unknown list type SJP_PRESS_REGISTER" },
      { entityId: "outcome", reason: "artefact type JUDGEMENTS_AND_OUTCOMES is not supported" },
      { entityId: "internal", reason: "unsupported sensitivity INTERNAL" },
      { entityId: "location", reason: "unknown location 12345" },
      { entityId: "payload", reason: "missing content date, provenance or payload" }
    ]);
  });
});
