import { describe, expect, it } from "vitest";
import type { UtaacHearingList } from "../models/types.js";
import { renderUtaacDailyHearingListData } from "./renderer.js";

describe("renderUtaacDailyHearingListData", () => {
  const baseOptions = {
    locale: "en",
    courtName: "Upper Tribunal (Administrative Appeals Chamber)",
    contentDate: new Date(2025, 0, 15),
    lastReceivedDate: "2025-01-15T09:55:00Z",
    listTitle: "Upper Tribunal (Administrative Appeals Chamber) Daily Hearing list"
  };

  it("should render hearing list with header", () => {
    const hearingList: UtaacHearingList = [
      {
        time: "10:00am",
        appellant: "Smith",
        caseReferenceNumber: "UTAAC/2025/0001",
        caseName: "Smith v Secretary of State",
        judges: "Judge Smith",
        members: "Member Jones",
        modeOfHearing: "CVP",
        venue: "Field House",
        additionalInformation: "Remote hearing"
      }
    ];

    const result = renderUtaacDailyHearingListData(hearingList, baseOptions);

    expect(result.header.listTitle).toBe("Upper Tribunal (Administrative Appeals Chamber) Daily Hearing list");
    expect(result.header.hearingDate).toBe("15 January 2025");
    expect(result.header.lastUpdatedDate).toBe("15 January 2025");
    expect(result.header.lastUpdatedTime).toContain("am");
  });

  it("should render multiple hearings", () => {
    const hearingList: UtaacHearingList = [
      {
        time: "10:00am",
        appellant: "Smith",
        caseReferenceNumber: "UTAAC/2025/0001",
        caseName: "Smith v Secretary of State",
        judges: "Judge Smith",
        members: "Member Jones",
        modeOfHearing: "CVP",
        venue: "Field House"
      },
      {
        time: "2:00pm",
        appellant: "Brown",
        caseReferenceNumber: "UTAAC/2025/0002",
        caseName: "Brown v DWP",
        judges: "Judge Brown",
        members: "Member Davis",
        modeOfHearing: "In person",
        venue: "Field House"
      }
    ];

    const result = renderUtaacDailyHearingListData(hearingList, baseOptions);

    expect(result.hearings).toHaveLength(2);
    expect(result.hearings[0].caseReferenceNumber).toBe("UTAAC/2025/0001");
    expect(result.hearings[1].caseReferenceNumber).toBe("UTAAC/2025/0002");
  });

  it("should include appellant and caseReferenceNumber in rendered data", () => {
    const hearingList: UtaacHearingList = [
      {
        time: "10:00am",
        appellant: "Smith",
        caseReferenceNumber: "UTAAC/2025/0001",
        caseName: "Smith v Secretary of State",
        judges: "Judge Smith",
        members: "Member Jones",
        modeOfHearing: "CVP",
        venue: "Field House"
      }
    ];

    const result = renderUtaacDailyHearingListData(hearingList, baseOptions);

    expect(result.hearings[0].appellant).toBe("Smith");
    expect(result.hearings[0].caseReferenceNumber).toBe("UTAAC/2025/0001");
  });

  it("should handle optional additionalInformation field", () => {
    const hearingList: UtaacHearingList = [
      {
        time: "10:00am",
        appellant: "Smith",
        caseReferenceNumber: "UTAAC/2025/0001",
        caseName: "Smith v Secretary of State",
        judges: "Judge Smith",
        members: "Member Jones",
        modeOfHearing: "CVP",
        venue: "Field House"
      }
    ];

    const result = renderUtaacDailyHearingListData(hearingList, baseOptions);

    expect(result.hearings[0].additionalInformation).toBeUndefined();
  });

  it("should handle empty hearing list", () => {
    const hearingList: UtaacHearingList = [];

    const result = renderUtaacDailyHearingListData(hearingList, baseOptions);

    expect(result.hearings).toHaveLength(0);
    expect(result.header.listTitle).toBe("Upper Tribunal (Administrative Appeals Chamber) Daily Hearing list");
  });

  it("should preserve all hearing fields without modification", () => {
    const hearingList: UtaacHearingList = [
      {
        time: "10:30am",
        appellant: "Smith & Jones",
        caseReferenceNumber: "UTAAC/2025/0001/A",
        caseName: "Smith & Jones v Secretary of State",
        judges: "Judge Smith; Judge Brown",
        members: "Member Jones, Member Davis",
        modeOfHearing: "BT Meet Me",
        venue: "Field House, Room 3",
        additionalInformation: "Contact adminappeals@justice.gov.uk for details"
      }
    ];

    const result = renderUtaacDailyHearingListData(hearingList, baseOptions);

    expect(result.hearings[0].time).toBe("10:30am");
    expect(result.hearings[0].appellant).toBe("Smith & Jones");
    expect(result.hearings[0].caseReferenceNumber).toBe("UTAAC/2025/0001/A");
    expect(result.hearings[0].caseName).toBe("Smith & Jones v Secretary of State");
    expect(result.hearings[0].judges).toBe("Judge Smith; Judge Brown");
    expect(result.hearings[0].members).toBe("Member Jones, Member Davis");
    expect(result.hearings[0].modeOfHearing).toBe("BT Meet Me");
    expect(result.hearings[0].venue).toBe("Field House, Room 3");
    expect(result.hearings[0].additionalInformation).toBe("Contact adminappeals@justice.gov.uk for details");
  });
});
