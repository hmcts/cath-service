import { describe, expect, it } from "vitest";
import type { LegacyListSearchConfig } from "./legacy-publication-source.js";
import { transformListSearchConfigs } from "./list-search-config-transform.js";

// Arbitrary ids: resolution must go through names only.
const CONTEXT = { listTypeIdByName: new Map([["CROWN_DAILY_PDDA_LIST", 903]]) };

function buildConfig(overrides: Partial<LegacyListSearchConfig> = {}): LegacyListSearchConfig {
  return { id: "config-1", list_type: "CROWN_DAILY_LIST", case_number_field_name: " caseNumber ", case_name_field_name: "caseName", ...overrides };
}

describe("transformListSearchConfigs", () => {
  it("should keep the legacy id and resolve renamed list types by name", () => {
    // Act
    const result = transformListSearchConfigs([buildConfig()], CONTEXT);

    // Assert
    expect(result.rows).toEqual([{ id: "config-1", listTypeId: 903, caseNumberFieldName: "caseNumber", caseNameFieldName: "caseName" }]);
  });

  it("should reject unknown list types, missing field names, and a second config for one list type", () => {
    // Arrange
    const legacy = [
      buildConfig(),
      buildConfig({ id: "unknown", list_type: "SJP_PRESS_REGISTER" }),
      buildConfig({ id: "blank", case_name_field_name: " " }),
      buildConfig({ id: "collapsed", list_type: "CROWN_DAILY_PDDA_LIST" })
    ];

    // Act
    const result = transformListSearchConfigs(legacy, CONTEXT);

    // Assert
    expect(result.rows.map(({ id }) => id)).toEqual(["config-1"]);
    expect(result.rejections).toEqual([
      { entityId: "unknown", reason: "unknown list type SJP_PRESS_REGISTER" },
      { entityId: "blank", reason: "missing case number or case name field name" },
      { entityId: "collapsed", reason: "duplicate config for list type" }
    ]);
  });
});
