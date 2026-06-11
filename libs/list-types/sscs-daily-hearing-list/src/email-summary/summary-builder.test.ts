import { describe, expect, it } from "vitest";
import { extractCaseSummary } from "./summary-builder.js";

describe("extractCaseSummary", () => {
  it("should extract hearing time, hearing type, and appeal reference number from each hearing", () => {
    const hearings = [
      {
        venue: "Manchester Tribunal Centre",
        appealReferenceNumber: "SC/123/2025",
        hearingType: "Oral Hearing",
        appellant: "Smith, John",
        courtroom: "Room 1",
        hearingTime: "10:00am",
        tribunal: "SSCS",
        respondent: "Secretary of State for Work and Pensions",
        additionalInformation: "Video hearing"
      }
    ];

    const result = extractCaseSummary(hearings);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual([
      { label: "Hearing Time", value: "10:00am" },
      { label: "Hearing Type", value: "Oral Hearing" },
      { label: "Appeal Reference Number", value: "SC/123/2025" }
    ]);
  });

  it("should extract summaries for multiple hearings", () => {
    const hearings = [
      {
        venue: "Manchester Tribunal Centre",
        appealReferenceNumber: "SC/123/2025",
        hearingType: "Oral Hearing",
        appellant: "Smith, John",
        courtroom: "Room 1",
        hearingTime: "10:00am",
        tribunal: "SSCS",
        respondent: "Secretary of State",
        additionalInformation: ""
      },
      {
        venue: "London Tribunal Centre",
        appealReferenceNumber: "SC/456/2025",
        hearingType: "Paper Hearing",
        appellant: "Jones, Jane",
        courtroom: "Room 2",
        hearingTime: "2:00pm",
        tribunal: "SSCS",
        respondent: "HMRC",
        additionalInformation: "In person"
      }
    ];

    const result = extractCaseSummary(hearings);

    expect(result).toHaveLength(2);
    expect(result[0][0].value).toBe("10:00am");
    expect(result[0][1].value).toBe("Oral Hearing");
    expect(result[0][2].value).toBe("SC/123/2025");
    expect(result[1][0].value).toBe("2:00pm");
    expect(result[1][1].value).toBe("Paper Hearing");
    expect(result[1][2].value).toBe("SC/456/2025");
  });

  it("should handle empty hearingTime with empty string fallback", () => {
    const hearings = [
      {
        venue: "Venue",
        appealReferenceNumber: "SC/123/2025",
        hearingType: "Oral Hearing",
        appellant: "Smith",
        courtroom: "Room 1",
        hearingTime: "",
        tribunal: "SSCS",
        respondent: "Secretary of State",
        additionalInformation: ""
      }
    ];

    const result = extractCaseSummary(hearings);

    expect(result[0][0].value).toBe("");
  });

  it("should return an empty array for an empty hearing list", () => {
    const result = extractCaseSummary([]);
    expect(result).toHaveLength(0);
  });
});
