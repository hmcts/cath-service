import type { ChdKbHearingList } from "@hmcts/chd-kb-common";
import { describe, expect, it } from "vitest";
import { cy } from "../locales/cy.js";
import { en } from "../locales/en.js";
import { renderFinancialListChdKbDailyCauseList } from "./renderer.js";

describe("renderFinancialListChdKbDailyCauseList", () => {
  it("should render hearing list with header and hearings", () => {
    const hearingList: ChdKbHearingList = [
      {
        judge: "Judge A",
        time: "9am",
        venue: "Venue A",
        type: "Type A",
        caseNumber: "12345",
        caseName: "Case name A",
        additionalInformation: "This is additional information"
      }
    ];

    const options = {
      locale: "en",
      contentDate: new Date("2025-06-20"),
      lastReceivedDate: "2025-01-01T09:55:00Z"
    };

    const result = renderFinancialListChdKbDailyCauseList(hearingList, options);

    expect(result.header.listTitle).toBe(en.pageTitle);
    expect(result.header.listDate).toBe("20 June 2025");
    expect(result.header.lastUpdatedDate).toBe("1 January 2025");
    expect(result.header.lastUpdatedTime).toContain("am");
    expect(result.hearings).toHaveLength(1);
    expect(result.hearings[0].judge).toBe("Judge A");
    expect(result.hearings[0].caseNumber).toBe("12345");
    expect(result.hearings[0].caseName).toBe("Case name A");
    expect(result.hearings[0].additionalInformation).toBe("This is additional information");
  });

  it("should handle empty hearing list", () => {
    const hearingList: ChdKbHearingList = [];
    const options = {
      locale: "en",
      contentDate: new Date("2025-01-01"),
      lastReceivedDate: "2025-01-01T09:55:00Z"
    };

    const result = renderFinancialListChdKbDailyCauseList(hearingList, options);

    expect(result.hearings).toHaveLength(0);
    expect(result.header.listTitle).toBe(en.pageTitle);
  });

  it("should use the Welsh list title when locale is cy", () => {
    const hearingList: ChdKbHearingList = [];
    const options = {
      locale: "cy",
      contentDate: new Date("2025-01-01"),
      lastReceivedDate: "2025-01-01T09:55:00Z"
    };

    const result = renderFinancialListChdKbDailyCauseList(hearingList, options);

    expect(result.header.listTitle).toBe(cy.pageTitle);
  });

  it("should format PM times correctly", () => {
    const hearingList: ChdKbHearingList = [];
    const options = {
      locale: "en",
      contentDate: new Date("2025-01-01"),
      lastReceivedDate: "2025-01-01T14:30:00Z"
    };

    const result = renderFinancialListChdKbDailyCauseList(hearingList, options);

    expect(result.header.lastUpdatedTime).toBe("2:30pm");
  });
});
