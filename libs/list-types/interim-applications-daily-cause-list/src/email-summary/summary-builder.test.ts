import { describe, expect, it } from "vitest";
import type { InterimApplicationsData } from "../models/types.js";
import { extractCaseSummary, formatCaseSummaryForEmail, SPECIAL_CATEGORY_DATA_WARNING } from "./summary-builder.js";

describe("SPECIAL_CATEGORY_DATA_WARNING", () => {
  it("should contain required warning text", () => {
    expect(SPECIAL_CATEGORY_DATA_WARNING).toContain("Special Category Data");
    expect(SPECIAL_CATEGORY_DATA_WARNING).toContain("Data Protection Act 2018");
  });
});

describe("extractCaseSummary", () => {
  it("should extract case summaries from the hearingList", () => {
    const data: InterimApplicationsData = {
      hearingList: [
        {
          judge: "Judge A",
          time: "10.30am",
          venue: "Venue A",
          type: "Type A",
          caseNumber: "1234",
          caseName: "Case name A",
          additionalInformation: "Info"
        }
      ],
      openJusticeStatementDetails: []
    };

    const result = extractCaseSummary(data);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual([
      { label: "Time", value: "10.30am" },
      { label: "Case number", value: "1234" },
      { label: "Case name", value: "Case name A" }
    ]);
  });

  it("should handle an empty hearingList", () => {
    const data: InterimApplicationsData = { hearingList: [], openJusticeStatementDetails: [] };

    const result = extractCaseSummary(data);

    expect(result).toHaveLength(0);
  });
});

describe("formatCaseSummaryForEmail", () => {
  it("should format a single case summary", () => {
    const items = [
      [
        { label: "Time", value: "10.30am" },
        { label: "Case number", value: "1234" },
        { label: "Case name", value: "Case name A" }
      ]
    ];

    const result = formatCaseSummaryForEmail(items);

    expect(result).toContain("Time - 10.30am");
    expect(result).toContain("Case number - 1234");
    expect(result).toContain("Case name - Case name A");
  });

  it("should handle an empty case list", () => {
    const result = formatCaseSummaryForEmail([]);

    expect(result).toBe("No cases scheduled.");
  });
});
