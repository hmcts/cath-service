import { describe, expect, it } from "vitest";
import { validatePhtWeeklyHearingList } from "./json-validator.js";

const validHearing = {
  date: "02/01/2025",
  caseName: "A Vs B",
  hearingLength: "1 hour",
  hearingType: "mda",
  venue: "Primary Health Tribunal",
  additionalInformation: "None"
};

describe("validatePhtWeeklyHearingList", () => {
  describe("valid data", () => {
    it("should accept a valid hearing list", () => {
      const result = validatePhtWeeklyHearingList([validHearing]);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should accept an empty array", () => {
      const result = validatePhtWeeklyHearingList([]);
      expect(result.isValid).toBe(true);
    });

    it("should accept multiple valid hearings", () => {
      const result = validatePhtWeeklyHearingList([validHearing, { ...validHearing, date: "15/06/2025" }]);
      expect(result.isValid).toBe(true);
    });
  });

  describe("required fields", () => {
    it("should reject missing date", () => {
      const { date: _, ...noDate } = validHearing;
      const result = validatePhtWeeklyHearingList([noDate]);
      expect(result.isValid).toBe(false);
    });

    it("should reject missing caseName", () => {
      const { caseName: _, ...noCaseName } = validHearing;
      const result = validatePhtWeeklyHearingList([noCaseName]);
      expect(result.isValid).toBe(false);
    });

    it("should reject missing hearingLength", () => {
      const { hearingLength: _, ...noHearingLength } = validHearing;
      const result = validatePhtWeeklyHearingList([noHearingLength]);
      expect(result.isValid).toBe(false);
    });

    it("should reject missing hearingType", () => {
      const { hearingType: _, ...noHearingType } = validHearing;
      const result = validatePhtWeeklyHearingList([noHearingType]);
      expect(result.isValid).toBe(false);
    });

    it("should reject missing venue", () => {
      const { venue: _, ...noVenue } = validHearing;
      const result = validatePhtWeeklyHearingList([noVenue]);
      expect(result.isValid).toBe(false);
    });

    it("should reject missing additionalInformation", () => {
      const { additionalInformation: _, ...noAdditionalInfo } = validHearing;
      const result = validatePhtWeeklyHearingList([noAdditionalInfo]);
      expect(result.isValid).toBe(false);
    });
  });

  describe("date format", () => {
    it("should accept a valid dd/MM/yyyy date", () => {
      const result = validatePhtWeeklyHearingList([{ ...validHearing, date: "31/12/2025" }]);
      expect(result.isValid).toBe(true);
    });

    it("should reject ISO date format", () => {
      const result = validatePhtWeeklyHearingList([{ ...validHearing, date: "2025-01-02" }]);
      expect(result.isValid).toBe(false);
    });

    it("should reject date without leading zeros", () => {
      const result = validatePhtWeeklyHearingList([{ ...validHearing, date: "2/1/2025" }]);
      expect(result.isValid).toBe(false);
    });

    it("should reject date with slashes in wrong positions", () => {
      const result = validatePhtWeeklyHearingList([{ ...validHearing, date: "2025/01/02" }]);
      expect(result.isValid).toBe(false);
    });
  });

  describe("HTML injection protection", () => {
    it("should reject HTML tags in caseName", () => {
      const result = validatePhtWeeklyHearingList([{ ...validHearing, caseName: "<script>alert(1)</script>" }]);
      expect(result.isValid).toBe(false);
    });

    it("should reject HTML tags in hearingLength", () => {
      const result = validatePhtWeeklyHearingList([{ ...validHearing, hearingLength: "<b>1 hour</b>" }]);
      expect(result.isValid).toBe(false);
    });

    it("should reject HTML tags in hearingType", () => {
      const result = validatePhtWeeklyHearingList([{ ...validHearing, hearingType: "<script>xss</script>" }]);
      expect(result.isValid).toBe(false);
    });

    it("should reject HTML tags in venue", () => {
      const result = validatePhtWeeklyHearingList([{ ...validHearing, venue: "<img src=x onerror=alert(1)>" }]);
      expect(result.isValid).toBe(false);
    });

    it("should reject HTML tags in additionalInformation", () => {
      const result = validatePhtWeeklyHearingList([{ ...validHearing, additionalInformation: "<p>info</p>" }]);
      expect(result.isValid).toBe(false);
    });
  });

  describe("invalid input types", () => {
    it("should reject a non-array input", () => {
      const result = validatePhtWeeklyHearingList(validHearing);
      expect(result.isValid).toBe(false);
    });

    it("should reject null", () => {
      const result = validatePhtWeeklyHearingList(null);
      expect(result.isValid).toBe(false);
    });
  });
});
