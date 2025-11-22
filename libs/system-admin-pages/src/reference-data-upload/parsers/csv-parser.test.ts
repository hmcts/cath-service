import { describe, expect, it } from "vitest";
import { parseCsv } from "./csv-parser.js";

describe("parseCsv", () => {
  it("should parse valid CSV with all required columns", () => {
    const csv = `LOCATION_ID,LOCATION_NAME,WELSH_LOCATION_NAME,EMAIL,CONTACT_NO,SUB_JURISDICTION_NAME,REGION_NAME
1,Test Court,Llys Prawf,test@example.com,01234567890,Civil Court,London`;
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
      regionNames: ["London"]
    });
  });

  it("should handle semicolon-separated values", () => {
    const csv = `LOCATION_ID,LOCATION_NAME,WELSH_LOCATION_NAME,EMAIL,CONTACT_NO,SUB_JURISDICTION_NAME,REGION_NAME
1,Test Court,Llys Prawf,test@example.com,01234567890,Civil Court;Crown Court,London;Midlands`;
    const buffer = Buffer.from(csv);

    const result = parseCsv(buffer);

    expect(result.success).toBe(true);
    expect(result.data[0].subJurisdictionNames).toEqual(["Civil Court", "Crown Court"]);
    expect(result.data[0].regionNames).toEqual(["London", "Midlands"]);
  });

  it("should handle semicolon-separated values with spaces", () => {
    const csv = `LOCATION_ID,LOCATION_NAME,WELSH_LOCATION_NAME,EMAIL,CONTACT_NO,SUB_JURISDICTION_NAME,REGION_NAME
1,Test Court,Llys Prawf,test@example.com,01234567890,Civil Court; Crown Court,London; Midlands`;
    const buffer = Buffer.from(csv);

    const result = parseCsv(buffer);

    expect(result.success).toBe(true);
    expect(result.data[0].subJurisdictionNames).toEqual(["Civil Court", "Crown Court"]);
    expect(result.data[0].regionNames).toEqual(["London", "Midlands"]);
  });

  it("should return error for missing required columns", () => {
    const csv = `LOCATION_ID,LOCATION_NAME
1,Test Court`;
    const buffer = Buffer.from(csv);

    const result = parseCsv(buffer);

    expect(result.success).toBe(false);
    expect(result.errors[0]).toContain("Missing required columns");
  });

  it("should return error for invalid location ID", () => {
    const csv = `LOCATION_ID,LOCATION_NAME,WELSH_LOCATION_NAME,EMAIL,CONTACT_NO,SUB_JURISDICTION_NAME,REGION_NAME
abc,Test Court,Llys Prawf,test@example.com,01234567890,Civil Court,London`;
    const buffer = Buffer.from(csv);

    const result = parseCsv(buffer);

    expect(result.success).toBe(false);
    expect(result.errors[0]).toContain("LOCATION_ID must be a valid integer");
  });

  it("should handle empty email and contact number", () => {
    const csv = `LOCATION_ID,LOCATION_NAME,WELSH_LOCATION_NAME,EMAIL,CONTACT_NO,SUB_JURISDICTION_NAME,REGION_NAME
1,Test Court,Llys Prawf,,,Civil Court,London`;
    const buffer = Buffer.from(csv);

    const result = parseCsv(buffer);

    expect(result.success).toBe(true);
    expect(result.data[0].email).toBe("");
    expect(result.data[0].contactNo).toBe("");
  });

  it("should parse multiple rows", () => {
    const csv = `LOCATION_ID,LOCATION_NAME,WELSH_LOCATION_NAME,EMAIL,CONTACT_NO,SUB_JURISDICTION_NAME,REGION_NAME
1,Court 1,Llys 1,test1@example.com,01234567890,Civil Court,London
2,Court 2,Llys 2,test2@example.com,09876543210,Family Court,Midlands`;
    const buffer = Buffer.from(csv);

    const result = parseCsv(buffer);

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(2);
    expect(result.data[0].locationId).toBe(1);
    expect(result.data[1].locationId).toBe(2);
  });

  it("should remove BOM if present", () => {
    const csv = `\uFEFFLOCATION_ID,LOCATION_NAME,WELSH_LOCATION_NAME,EMAIL,CONTACT_NO,SUB_JURISDICTION_NAME,REGION_NAME
1,Test Court,Llys Prawf,test@example.com,01234567890,Civil Court,London`;
    const buffer = Buffer.from(csv);

    const result = parseCsv(buffer);

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
  });

  it("should skip empty lines", () => {
    const csv = `LOCATION_ID,LOCATION_NAME,WELSH_LOCATION_NAME,EMAIL,CONTACT_NO,SUB_JURISDICTION_NAME,REGION_NAME
1,Court 1,Llys 1,test1@example.com,01234567890,Civil Court,London

2,Court 2,Llys 2,test2@example.com,09876543210,Family Court,Midlands`;
    const buffer = Buffer.from(csv);

    const result = parseCsv(buffer);

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(2);
  });
});
