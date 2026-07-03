import { describe, expect, it } from "vitest";
import { SSCS_EXCEL_CONFIG } from "./sscs-config.js";

describe("SSCS_EXCEL_CONFIG", () => {
  it("should have all required fields configured", () => {
    const fieldNames = SSCS_EXCEL_CONFIG.fields.map((f) => f.fieldName);

    expect(fieldNames).toContain("venue");
    expect(fieldNames).toContain("appealReferenceNumber");
    expect(fieldNames).toContain("hearingType");
    expect(fieldNames).toContain("appellant");
    expect(fieldNames).toContain("courtroom");
    expect(fieldNames).toContain("hearingTime");
    expect(fieldNames).toContain("tribunal");
    expect(fieldNames).toContain("respondent");
    expect(fieldNames).toContain("additionalInformation");
  });

  it("should have correct headers for required fields", () => {
    const headers = SSCS_EXCEL_CONFIG.fields.map((f) => f.header);

    expect(headers).toContain("Venue");
    expect(headers).toContain("Appeal Reference Number");
    expect(headers).toContain("Hearing Type");
    expect(headers).toContain("Appellant");
    expect(headers).toContain("Courtroom");
    expect(headers).toContain("Hearing Time");
    expect(headers).toContain("Tribunal");
    expect(headers).toContain("FTA/Respondent");
    expect(headers).toContain("Additional Information");
  });

  it("should mark most fields as required", () => {
    const requiredFields = SSCS_EXCEL_CONFIG.fields.filter((f) => f.required).map((f) => f.fieldName);

    expect(requiredFields).toContain("venue");
    expect(requiredFields).toContain("appealReferenceNumber");
    expect(requiredFields).toContain("hearingType");
    expect(requiredFields).toContain("appellant");
    expect(requiredFields).toContain("courtroom");
    expect(requiredFields).toContain("hearingTime");
    expect(requiredFields).toContain("tribunal");
    expect(requiredFields).toContain("respondent");
  });

  it("should mark additionalInformation as not required", () => {
    const additionalInfo = SSCS_EXCEL_CONFIG.fields.find((f) => f.fieldName === "additionalInformation");
    expect(additionalInfo?.required).toBe(false);
  });

  it("should have minRows set to 1", () => {
    expect(SSCS_EXCEL_CONFIG.minRows).toBe(1);
  });

  describe("field validators", () => {
    const getValidator = (fieldName: string) => {
      const field = SSCS_EXCEL_CONFIG.fields.find((f) => f.fieldName === fieldName);
      return field!.validators![0];
    };

    const validValues: Record<string, string> = {
      venue: "Manchester Tribunal Centre",
      appealReferenceNumber: "SC/123/2025",
      hearingType: "Oral Hearing",
      appellant: "Smith, John",
      courtroom: "Room 1",
      hearingTime: "10:00am",
      tribunal: "SSCS",
      respondent: "Secretary of State for Work and Pensions",
      additionalInformation: "Video hearing"
    };

    for (const [fieldName, validValue] of Object.entries(validValues)) {
      it(`should accept valid value for ${fieldName}`, () => {
        expect(() => getValidator(fieldName)(validValue, 1)).not.toThrow();
      });

      it(`should reject HTML tags in ${fieldName}`, () => {
        expect(() => getValidator(fieldName)("<script>alert('xss')</script>", 1)).toThrow("HTML tags are not allowed");
      });
    }
  });
});
