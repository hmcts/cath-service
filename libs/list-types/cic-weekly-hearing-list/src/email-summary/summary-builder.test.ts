import { describe, expect, it } from "vitest";
import type { CicWeeklyHearingList } from "../models/types.js";
import { extractCaseSummary, formatCaseSummaryForEmail } from "./summary-builder.js";

describe("CIC Weekly Hearing List Email Summary", () => {
  const mockHearingList: CicWeeklyHearingList = [
    {
      date: "15/06/2026",
      hearingTime: "10:30am",
      caseReferenceNumber: "CIC/2026/001",
      caseName: "Smith v CICA",
      venuePlatform: "Video Hearing",
      judges: "Judge Roberts",
      members: "Dr. Williams, Ms. Jones",
      additionalInformation: "Interpreter required"
    },
    {
      date: "16/06/2026",
      hearingTime: "2:00pm",
      caseReferenceNumber: "CIC/2026/002",
      caseName: "Brown v CICA",
      venuePlatform: "Leicester Tribunal Centre",
      judges: "Judge Anderson",
      members: "Mr. Taylor",
      additionalInformation: ""
    }
  ];

  describe("extractCaseSummary", () => {
    it("should extract date, hearing time, case reference number, and case name from each hearing", () => {
      const result = extractCaseSummary(mockHearingList);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual([
        { label: "Date", value: "15/06/2026" },
        { label: "Hearing time", value: "10:30am" },
        { label: "Case reference number", value: "CIC/2026/001" },
        { label: "Case name", value: "Smith v CICA" }
      ]);
      expect(result[1]).toEqual([
        { label: "Date", value: "16/06/2026" },
        { label: "Hearing time", value: "2:00pm" },
        { label: "Case reference number", value: "CIC/2026/002" },
        { label: "Case name", value: "Brown v CICA" }
      ]);
    });

    it("should handle empty values gracefully", () => {
      const hearingWithEmptyValues: CicWeeklyHearingList = [
        {
          date: "",
          hearingTime: "",
          caseReferenceNumber: "",
          caseName: "",
          venuePlatform: "",
          judges: "",
          members: "",
          additionalInformation: ""
        }
      ];

      const result = extractCaseSummary(hearingWithEmptyValues);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual([
        { label: "Date", value: "" },
        { label: "Hearing time", value: "" },
        { label: "Case reference number", value: "" },
        { label: "Case name", value: "" }
      ]);
    });
  });

  describe("formatCaseSummaryForEmail", () => {
    it("should format case summaries for email display", () => {
      const summaries = extractCaseSummary(mockHearingList);
      const formatted = formatCaseSummaryForEmail(summaries);

      expect(formatted).toContain("Date - 15/06/2026");
      expect(formatted).toContain("Hearing time - 10:30am");
      expect(formatted).toContain("Case reference number - CIC/2026/001");
      expect(formatted).toContain("Case name - Smith v CICA");
      expect(formatted).toContain("Date - 16/06/2026");
      expect(formatted).toContain("Hearing time - 2:00pm");
      expect(formatted).toContain("Case reference number - CIC/2026/002");
      expect(formatted).toContain("Case name - Brown v CICA");
    });
  });
});
