import { describe, expect, it } from "vitest";
import type { UtccHearingList } from "../models/types.js";
import { renderUtccDailyHearingListData } from "./renderer.js";

describe("renderUtccDailyHearingListData", () => {
  const baseOptions = {
    locale: "en",
    courtName: "Upper Tribunal Tax and Chancery Chamber",
    contentDate: new Date(2025, 0, 15),
    lastReceivedDate: "2025-01-15T09:55:00Z",
    listTitle: "Upper Tribunal Tax and Chancery Chamber Daily Hearing List"
  };

  it("should render hearing list with header", () => {
    const hearingList: UtccHearingList = [
      {
        time: "10:00am",
        caseReferenceNumber: "UTTC/2025/0001",
        caseName: "Smith v HMRC",
        judges: "Judge Smith",
        members: "Member Jones",
        hearingType: "Substantive hearing",
        venue: "Field House",
        additionalInformation: "Remote hearing"
      }
    ];

    const result = renderUtccDailyHearingListData(hearingList, baseOptions);

    expect(result.header.listTitle).toBe("Upper Tribunal Tax and Chancery Chamber Daily Hearing List");
    expect(result.header.hearingDate).toBe("15 January 2025");
    expect(result.header.lastUpdatedDate).toBe("15 January 2025");
    expect(result.header.lastUpdatedTime).toContain("am");
  });

  it("should render multiple hearings", () => {
    const hearingList: UtccHearingList = [
      {
        time: "10:00am",
        caseReferenceNumber: "UTTC/2025/0001",
        caseName: "Smith v HMRC",
        judges: "Judge Smith",
        members: "Member Jones",
        hearingType: "Substantive hearing",
        venue: "Field House",
        additionalInformation: ""
      },
      {
        time: "2:00pm",
        caseReferenceNumber: "UTTC/2025/0002",
        caseName: "Brown v HMRC",
        judges: "Judge Brown",
        members: "Member Davis",
        hearingType: "Preliminary hearing",
        venue: "Field House",
        additionalInformation: ""
      }
    ];

    const result = renderUtccDailyHearingListData(hearingList, baseOptions);

    expect(result.hearings).toHaveLength(2);
    expect(result.hearings[0].caseReferenceNumber).toBe("UTTC/2025/0001");
    expect(result.hearings[1].caseReferenceNumber).toBe("UTTC/2025/0002");
  });

  it("should include additionalInformation in rendered data", () => {
    const hearingList: UtccHearingList = [
      {
        time: "10:00am",
        caseReferenceNumber: "UTTC/2025/0001",
        caseName: "Smith v HMRC",
        judges: "Judge Smith",
        members: "Member Jones",
        hearingType: "Substantive hearing",
        venue: "Field House",
        additionalInformation: "Remote hearing"
      }
    ];

    const result = renderUtccDailyHearingListData(hearingList, baseOptions);

    expect(result.hearings[0].additionalInformation).toBe("Remote hearing");
  });

  it("should handle empty hearing list", () => {
    const hearingList: UtccHearingList = [];

    const result = renderUtccDailyHearingListData(hearingList, baseOptions);

    expect(result.hearings).toHaveLength(0);
    expect(result.header.listTitle).toBe("Upper Tribunal Tax and Chancery Chamber Daily Hearing List");
  });

  it("should format AM times correctly", () => {
    const hearingList: UtccHearingList = [
      {
        time: "10:00am",
        caseReferenceNumber: "UTTC/2025/0001",
        caseName: "Smith v HMRC",
        judges: "Judge Smith",
        members: "Member Jones",
        hearingType: "Substantive hearing",
        venue: "Field House",
        additionalInformation: ""
      }
    ];

    const options = { ...baseOptions, lastReceivedDate: "2025-01-15T09:55:00Z" };
    const result = renderUtccDailyHearingListData(hearingList, options);

    expect(result.header.lastUpdatedTime).toBe("9:55am");
  });

  it("should format PM times correctly", () => {
    const hearingList: UtccHearingList = [
      {
        time: "10:00am",
        caseReferenceNumber: "UTTC/2025/0001",
        caseName: "Smith v HMRC",
        judges: "Judge Smith",
        members: "Member Jones",
        hearingType: "Substantive hearing",
        venue: "Field House",
        additionalInformation: ""
      }
    ];

    const options = { ...baseOptions, lastReceivedDate: "2025-01-15T14:30:00Z" };
    const result = renderUtccDailyHearingListData(hearingList, options);

    expect(result.header.lastUpdatedTime).toBe("2:30pm");
  });

  it("should use the provided listTitle", () => {
    const hearingList: UtccHearingList = [
      {
        time: "10:00am",
        caseReferenceNumber: "UTTC/2025/0001",
        caseName: "Smith v HMRC",
        judges: "Judge Smith",
        members: "Member Jones",
        hearingType: "Substantive hearing",
        venue: "Field House",
        additionalInformation: ""
      }
    ];

    const welshOptions = { ...baseOptions, listTitle: "Welsh title placeholder" };
    const result = renderUtccDailyHearingListData(hearingList, welshOptions);

    expect(result.header.listTitle).toBe("Welsh title placeholder");
  });

  it("should preserve all hearing fields without modification", () => {
    const hearingList: UtccHearingList = [
      {
        time: "10:30am",
        caseReferenceNumber: "UTTC/2025/0001/A",
        caseName: "Smith & Jones v HMRC",
        judges: "Judge Smith; Judge Brown",
        members: "Member Jones, Member Davis",
        hearingType: "Substantive hearing - final",
        venue: "Field House, Room 3",
        additionalInformation: "Remote via CVP; contact uttc@justice.gov.uk"
      }
    ];

    const result = renderUtccDailyHearingListData(hearingList, baseOptions);

    expect(result.hearings[0].time).toBe("10:30am");
    expect(result.hearings[0].caseReferenceNumber).toBe("UTTC/2025/0001/A");
    expect(result.hearings[0].caseName).toBe("Smith & Jones v HMRC");
    expect(result.hearings[0].judges).toBe("Judge Smith; Judge Brown");
    expect(result.hearings[0].members).toBe("Member Jones, Member Davis");
    expect(result.hearings[0].hearingType).toBe("Substantive hearing - final");
    expect(result.hearings[0].venue).toBe("Field House, Room 3");
    expect(result.hearings[0].additionalInformation).toBe("Remote via CVP; contact uttc@justice.gov.uk");
  });
});
