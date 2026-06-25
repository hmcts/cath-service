import { describe, expect, it } from "vitest";
import type { AstDailyHearingList } from "../models/types.js";
import { renderAstDailyHearingListData } from "./renderer.js";

describe("renderAstDailyHearingListData", () => {
  it("should render hearing list with header and hearings", () => {
    const hearingList: AstDailyHearingList = [
      {
        appellant: "A Smith",
        appealReferenceNumber: "AST/2025/001",
        caseType: "Section 4",
        hearingType: "Substantive",
        hearingTime: "10am",
        additionalInformation: "Remote hearing"
      }
    ];

    const options = {
      locale: "en",
      contentDate: new Date("2025-06-20"),
      lastReceivedDate: "2025-01-01T09:55:00Z",
      listTitle: "Asylum Support Tribunal Daily Hearing List"
    };

    const result = renderAstDailyHearingListData(hearingList, options);

    expect(result.header.listTitle).toBe("Asylum Support Tribunal Daily Hearing List");
    expect(result.header.listForDate).toBe("20 June 2025");
    expect(result.header.lastUpdatedDate).toBe("1 January 2025");
    expect(result.header.lastUpdatedTime).toContain("am");
    expect(result.hearings).toHaveLength(1);
    expect(result.hearings[0].appellant).toBe("A Smith");
    expect(result.hearings[0].appealReferenceNumber).toBe("AST/2025/001");
    expect(result.hearings[0].caseType).toBe("Section 4");
    expect(result.hearings[0].hearingType).toBe("Substantive");
    expect(result.hearings[0].hearingTime).toBe("10am");
    expect(result.hearings[0].additionalInformation).toBe("Remote hearing");
  });

  it("should handle empty hearing list", () => {
    const hearingList: AstDailyHearingList = [];
    const options = {
      locale: "en",
      contentDate: new Date("2025-01-01"),
      lastReceivedDate: "2025-01-01T09:55:00Z",
      listTitle: "AST Daily Hearing List"
    };

    const result = renderAstDailyHearingListData(hearingList, options);

    expect(result.hearings).toHaveLength(0);
    expect(result.header.listTitle).toBe("AST Daily Hearing List");
  });

  it("should use Welsh locale", () => {
    const hearingList: AstDailyHearingList = [];
    const options = {
      locale: "cy",
      contentDate: new Date("2025-01-01"),
      lastReceivedDate: "2025-01-01T09:55:00Z",
      listTitle: "Rhestr Gwrandawiadau Dyddiol y Tribiwnlys Cymorth Lloches"
    };

    const result = renderAstDailyHearingListData(hearingList, options);

    expect(result.header.listTitle).toBe("Rhestr Gwrandawiadau Dyddiol y Tribiwnlys Cymorth Lloches");
  });

  it("should format PM times correctly", () => {
    const hearingList: AstDailyHearingList = [];
    const options = {
      locale: "en",
      contentDate: new Date("2025-01-01"),
      lastReceivedDate: "2025-01-01T14:30:00Z",
      listTitle: "AST Daily Hearing List"
    };

    const result = renderAstDailyHearingListData(hearingList, options);

    expect(result.header.lastUpdatedTime).toBe("2:30pm");
  });
});
