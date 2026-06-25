import { describe, expect, it } from "vitest";
import type { UtlcHearingList } from "../models/types.js";
import { renderUtlcDailyHearingListData } from "./renderer.js";

describe("renderUtlcDailyHearingListData", () => {
  const baseOptions = {
    locale: "en",
    courtName: "Upper Tribunal (Lands Chamber)",
    contentDate: new Date(2025, 0, 15),
    lastReceivedDate: "2025-01-15T09:55:00Z",
    listTitle: "Upper Tribunal (Lands Chamber) Daily Hearing List"
  };

  it("should render hearing list with header", () => {
    const hearingList: UtlcHearingList = [
      {
        time: "10:00am",
        caseReferenceNumber: "LC/2025/0001",
        caseName: "Smith v Jones",
        judges: "Judge Smith",
        members: "Member Jones",
        hearingType: "Substantive hearing",
        venue: "Royal Courts of Justice",
        modeOfHearing: "CVP",
        additionalInformation: "Remote hearing"
      }
    ];

    const result = renderUtlcDailyHearingListData(hearingList, baseOptions);

    expect(result.header.listTitle).toBe("Upper Tribunal (Lands Chamber) Daily Hearing List");
    expect(result.header.hearingDate).toBe("15 January 2025");
    expect(result.header.lastUpdatedDate).toBe("15 January 2025");
    expect(result.header.lastUpdatedTime).toContain("am");
  });

  it("should render multiple hearings", () => {
    const hearingList: UtlcHearingList = [
      {
        time: "10:00am",
        caseReferenceNumber: "LC/2025/0001",
        caseName: "Smith v Jones",
        judges: "Judge Smith",
        members: "Member Jones",
        hearingType: "Substantive hearing",
        venue: "Royal Courts of Justice",
        modeOfHearing: "In person",
        additionalInformation: ""
      },
      {
        time: "2:00pm",
        caseReferenceNumber: "LC/2025/0002",
        caseName: "Brown v Green",
        judges: "Judge Brown",
        members: "Member Davis",
        hearingType: "Preliminary hearing",
        venue: "Royal Courts of Justice",
        modeOfHearing: "CVP",
        additionalInformation: ""
      }
    ];

    const result = renderUtlcDailyHearingListData(hearingList, baseOptions);

    expect(result.hearings).toHaveLength(2);
    expect(result.hearings[0].caseReferenceNumber).toBe("LC/2025/0001");
    expect(result.hearings[1].caseReferenceNumber).toBe("LC/2025/0002");
  });

  it("should include modeOfHearing in rendered data", () => {
    const hearingList: UtlcHearingList = [
      {
        time: "10:00am",
        caseReferenceNumber: "LC/2025/0001",
        caseName: "Smith v Jones",
        judges: "Judge Smith",
        members: "Member Jones",
        hearingType: "Substantive hearing",
        venue: "Royal Courts of Justice",
        modeOfHearing: "CVP",
        additionalInformation: ""
      }
    ];

    const result = renderUtlcDailyHearingListData(hearingList, baseOptions);

    expect(result.hearings[0].modeOfHearing).toBe("CVP");
  });

  it("should include additionalInformation in rendered data", () => {
    const hearingList: UtlcHearingList = [
      {
        time: "10:00am",
        caseReferenceNumber: "LC/2025/0001",
        caseName: "Smith v Jones",
        judges: "Judge Smith",
        members: "Member Jones",
        hearingType: "Substantive hearing",
        venue: "Royal Courts of Justice",
        modeOfHearing: "In person",
        additionalInformation: "Remote hearing"
      }
    ];

    const result = renderUtlcDailyHearingListData(hearingList, baseOptions);

    expect(result.hearings[0].additionalInformation).toBe("Remote hearing");
  });

  it("should handle empty hearing list", () => {
    const hearingList: UtlcHearingList = [];

    const result = renderUtlcDailyHearingListData(hearingList, baseOptions);

    expect(result.hearings).toHaveLength(0);
    expect(result.header.listTitle).toBe("Upper Tribunal (Lands Chamber) Daily Hearing List");
  });

  it("should preserve all hearing fields without modification", () => {
    const hearingList: UtlcHearingList = [
      {
        time: "10:30am",
        caseReferenceNumber: "LC/2025/0001/A",
        caseName: "Smith & Jones v Landowner",
        judges: "Judge Smith; Judge Brown",
        members: "Member Jones, Member Davis",
        hearingType: "Substantive hearing - final",
        venue: "Royal Courts of Justice, Room 3",
        modeOfHearing: "Cloud Video Platform (CVP)",
        additionalInformation: "Contact Lands@justice.gov.uk for details"
      }
    ];

    const result = renderUtlcDailyHearingListData(hearingList, baseOptions);

    expect(result.hearings[0].time).toBe("10:30am");
    expect(result.hearings[0].caseReferenceNumber).toBe("LC/2025/0001/A");
    expect(result.hearings[0].caseName).toBe("Smith & Jones v Landowner");
    expect(result.hearings[0].judges).toBe("Judge Smith; Judge Brown");
    expect(result.hearings[0].members).toBe("Member Jones, Member Davis");
    expect(result.hearings[0].hearingType).toBe("Substantive hearing - final");
    expect(result.hearings[0].venue).toBe("Royal Courts of Justice, Room 3");
    expect(result.hearings[0].modeOfHearing).toBe("Cloud Video Platform (CVP)");
    expect(result.hearings[0].additionalInformation).toBe("Contact Lands@justice.gov.uk for details");
  });
});
