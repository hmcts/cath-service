import { describe, expect, it } from "vitest";
import { parseCsv } from "./csv-parser.js";

const VALID_HEADERS =
  "LOCATION_ID,LOCATION_NAME,WELSH_LOCATION_NAME,EMAIL,CONTACT_NO,SUB_JURISDICTION_NAME,REGION_NAME,PROVENANCE,PROVENANCE_LOCATION_ID,PROVENANCE_LOCATION_TYPE";
const VALID_ROW = "1,Test Court,Llys Prawf,test@example.com,01234567890,Civil Court,London,SNL,ext-123,VENUE";

describe("parseCsv", () => {
  it("should parse valid CSV with all required columns", () => {
    const csv = `${VALID_HEADERS}\n${VALID_ROW}`;
    const buffer = Buffer.from(csv);

    const result = parseCsv(buffer);

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toEqual({
      locationId: 1,
      locationName: "Test Court",
      welshLocationName: "Llys Prawf",
      email: "test@example.com",
      contactNo: "01234567890",
      subJurisdictionNames: ["Civil Court"],
      regionNames: ["London"],
      locationReferences: [{ provenance: "SNL", provenanceLocationId: "ext-123", provenanceLocationType: "VENUE" }]
    });
  });

  it("should handle semicolon-separated values", () => {
    const csv = `${VALID_HEADERS}\n1,Test Court,Llys Prawf,test@example.com,01234567890,Civil Court;Crown Court,London;Midlands,SNL,ext-123,VENUE`;
    const buffer = Buffer.from(csv);

    const result = parseCsv(buffer);

    expect(result.success).toBe(true);
    expect(result.data[0].subJurisdictionNames).toEqual(["Civil Court", "Crown Court"]);
    expect(result.data[0].regionNames).toEqual(["London", "Midlands"]);
  });

  it("should handle semicolon-separated values with spaces", () => {
    const csv = `${VALID_HEADERS}\n1,Test Court,Llys Prawf,test@example.com,01234567890,Civil Court; Crown Court,London; Midlands,SNL,ext-123,VENUE`;
    const buffer = Buffer.from(csv);

    const result = parseCsv(buffer);

    expect(result.success).toBe(true);
    expect(result.data[0].subJurisdictionNames).toEqual(["Civil Court", "Crown Court"]);
    expect(result.data[0].regionNames).toEqual(["London", "Midlands"]);
  });

  it("should handle multiple provenance references as semicolon-separated values", () => {
    const csv = `${VALID_HEADERS}\n1,Test Court,Llys Prawf,test@example.com,01234567890,Civil Court,London,SNL;PDDA,snl-001;pdda-001,VENUE;VENUE`;
    const buffer = Buffer.from(csv);

    const result = parseCsv(buffer);

    expect(result.success).toBe(true);
    expect(result.data[0].locationReferences).toEqual([
      { provenance: "SNL", provenanceLocationId: "snl-001", provenanceLocationType: "VENUE" },
      { provenance: "PDDA", provenanceLocationId: "pdda-001", provenanceLocationType: "VENUE" }
    ]);
  });

  it("should parse a row with no provenance as empty locationReferences", () => {
    const csv = `${VALID_HEADERS}\n1,Test Court,Llys Prawf,test@example.com,01234567890,Civil Court,London,,,`;
    const buffer = Buffer.from(csv);

    const result = parseCsv(buffer);

    expect(result.success).toBe(true);
    expect(result.data[0].locationReferences).toEqual([]);
  });

  it("should preserve provenance location ID and type when provenance is missing", () => {
    const csv = `${VALID_HEADERS}\n1,Test Court,Llys Prawf,test@example.com,01234567890,Civil Court,London,,ext-123,VENUE`;
    const buffer = Buffer.from(csv);

    const result = parseCsv(buffer);

    expect(result.success).toBe(true);
    expect(result.data[0].locationReferences).toEqual([{ provenance: "", provenanceLocationId: "ext-123", provenanceLocationType: "VENUE" }]);
  });

  it("should return error for missing required columns", () => {
    const csv = `LOCATION_ID,LOCATION_NAME\n1,Test Court`;
    const buffer = Buffer.from(csv);

    const result = parseCsv(buffer);

    expect(result.success).toBe(false);
    expect(result.errors[0]).toContain("Missing required columns");
  });

  it("should return error when new provenance columns are missing", () => {
    const csv = `LOCATION_ID,LOCATION_NAME,WELSH_LOCATION_NAME,EMAIL,CONTACT_NO,SUB_JURISDICTION_NAME,REGION_NAME\n1,Test Court,Llys Prawf,test@example.com,01234567890,Civil Court,London`;
    const buffer = Buffer.from(csv);

    const result = parseCsv(buffer);

    expect(result.success).toBe(false);
    expect(result.errors[0]).toContain("Missing required columns");
    expect(result.errors[0]).toContain("PROVENANCE");
  });

  it("should return error for invalid location ID", () => {
    const csv = `${VALID_HEADERS}\nabc,Test Court,Llys Prawf,test@example.com,01234567890,Civil Court,London,SNL,ext-123,VENUE`;
    const buffer = Buffer.from(csv);

    const result = parseCsv(buffer);

    expect(result.success).toBe(false);
    expect(result.errors[0]).toContain("LOCATION_ID must be a valid integer");
  });

  it("should handle empty email and contact number", () => {
    const csv = `${VALID_HEADERS}\n1,Test Court,Llys Prawf,,,Civil Court,London,SNL,ext-123,VENUE`;
    const buffer = Buffer.from(csv);

    const result = parseCsv(buffer);

    expect(result.success).toBe(true);
    expect(result.data[0].email).toBe("");
    expect(result.data[0].contactNo).toBe("");
  });

  it("should parse multiple rows", () => {
    const csv = `${VALID_HEADERS}\n1,Court 1,Llys 1,test1@example.com,01234567890,Civil Court,London,SNL,ext-1,VENUE\n2,Court 2,Llys 2,test2@example.com,09876543210,Family Court,Midlands,COMMON_PLATFORM,ext-2,REGION`;
    const buffer = Buffer.from(csv);

    const result = parseCsv(buffer);

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(2);
    expect(result.data[0].locationId).toBe(1);
    expect(result.data[1].locationId).toBe(2);
    expect(result.data[0].locationReferences[0].provenance).toBe("SNL");
    expect(result.data[1].locationReferences[0].provenance).toBe("COMMON_PLATFORM");
  });

  it("should remove BOM if present", () => {
    const csv = `\uFEFF${VALID_HEADERS}\n${VALID_ROW}`;
    const buffer = Buffer.from(csv);

    const result = parseCsv(buffer);

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
  });

  it("should skip empty lines", () => {
    const csv = `${VALID_HEADERS}\n1,Court 1,Llys 1,test1@example.com,01234567890,Civil Court,London,SNL,ext-1,VENUE\n\n2,Court 2,Llys 2,test2@example.com,09876543210,Family Court,Midlands,COMMON_PLATFORM,ext-2,REGION`;
    const buffer = Buffer.from(csv);

    const result = parseCsv(buffer);

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(2);
  });

  it("should parse provenance fields correctly", () => {
    const csv = `${VALID_HEADERS}\n1,Test Court,Llys Prawf,test@example.com,01234567890,Civil Court,London,CP_CATH,cp-456,OWNING_HEARING_LOCATION`;
    const buffer = Buffer.from(csv);

    const result = parseCsv(buffer);

    expect(result.success).toBe(true);
    expect(result.data[0].locationReferences[0].provenance).toBe("CP_CATH");
    expect(result.data[0].locationReferences[0].provenanceLocationId).toBe("cp-456");
    expect(result.data[0].locationReferences[0].provenanceLocationType).toBe("OWNING_HEARING_LOCATION");
  });
});
