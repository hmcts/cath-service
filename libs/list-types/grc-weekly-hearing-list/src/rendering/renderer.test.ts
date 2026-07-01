import { describe, expect, it } from "vitest";
import type { GrcWeeklyHearingList } from "../models/types.js";
import { renderGrcWeeklyHearingListData } from "./renderer.js";

describe("renderGrcWeeklyHearingListData", () => {
  it("should render hearing list with formatted dates", () => {
    // Arrange
    const hearingList: GrcWeeklyHearingList = [
      {
        date: "02/01/2025",
        hearingTime: "10:00am",
        caseReferenceNumber: "GRC/2025/001",
        caseName: "A Vs B",
        judges: "Judge Smith",
        members: "Member Jones",
        modeOfHearing: "Remote",
        venue: "GRC Hearing Centre",
        additionalInformation: "Remote hearing"
      }
    ];

    const options = {
      locale: "en",
      courtName: "General Regulatory Chamber",
      contentDate: new Date(2025, 0, 2),
      lastReceivedDate: "2025-01-01T09:55:00Z",
      listTitle: "General Regulatory Chamber Weekly Hearing List"
    };

    // Act
    const result = renderGrcWeeklyHearingListData(hearingList, options);

    // Assert
    expect(result.header.listTitle).toBe("General Regulatory Chamber Weekly Hearing List");
    expect(result.header.weekCommencingDate).toBe("02 January 2025");
    expect(result.header.lastUpdatedDate).toBe("01 January 2025");
    expect(result.header.lastUpdatedTime).toContain("am");

    expect(result.hearings).toHaveLength(1);
    expect(result.hearings[0].date).toBe("02 January 2025");
    expect(result.hearings[0].hearingTime).toBe("10:00am");
    expect(result.hearings[0].caseReferenceNumber).toBe("GRC/2025/001");
    expect(result.hearings[0].caseName).toBe("A Vs B");
    expect(result.hearings[0].judges).toBe("Judge Smith");
    expect(result.hearings[0].members).toBe("Member Jones");
    expect(result.hearings[0].modeOfHearing).toBe("Remote");
    expect(result.hearings[0].venue).toBe("GRC Hearing Centre");
    expect(result.hearings[0].additionalInformation).toBe("Remote hearing");
  });

  it("should render multiple hearings", () => {
    // Arrange
    const hearingList: GrcWeeklyHearingList = [
      {
        date: "02/01/2025",
        hearingTime: "10:00am",
        caseReferenceNumber: "GRC/2025/001",
        caseName: "A Vs B",
        judges: "Judge Smith",
        members: "",
        modeOfHearing: "Remote",
        venue: "GRC Hearing Centre",
        additionalInformation: ""
      },
      {
        date: "03/01/2025",
        hearingTime: "2:00pm",
        caseReferenceNumber: "GRC/2025/002",
        caseName: "C Vs D",
        judges: "Judge Brown",
        members: "Member Green",
        modeOfHearing: "In person",
        venue: "GRC Office",
        additionalInformation: "In person"
      }
    ];

    const options = {
      locale: "en",
      courtName: "General Regulatory Chamber",
      contentDate: new Date(2025, 0, 2),
      lastReceivedDate: "2025-01-01T09:55:00Z",
      listTitle: "General Regulatory Chamber Weekly Hearing List"
    };

    // Act
    const result = renderGrcWeeklyHearingListData(hearingList, options);

    // Assert
    expect(result.hearings).toHaveLength(2);
    expect(result.hearings[0].date).toBe("02 January 2025");
    expect(result.hearings[1].date).toBe("03 January 2025");
  });

  it("should handle empty hearing list", () => {
    // Arrange
    const hearingList: GrcWeeklyHearingList = [];

    const options = {
      locale: "en",
      courtName: "General Regulatory Chamber",
      contentDate: new Date(2025, 0, 2),
      lastReceivedDate: "2025-01-01T09:55:00Z",
      listTitle: "General Regulatory Chamber Weekly Hearing List"
    };

    // Act
    const result = renderGrcWeeklyHearingListData(hearingList, options);

    // Assert
    expect(result.hearings).toHaveLength(0);
    expect(result.header.listTitle).toBe("General Regulatory Chamber Weekly Hearing List");
  });

  it("should format lastUpdated time correctly", () => {
    // Arrange
    const hearingList: GrcWeeklyHearingList = [
      {
        date: "02/01/2025",
        hearingTime: "10:00am",
        caseReferenceNumber: "GRC/2025/001",
        caseName: "A Vs B",
        judges: "Judge Smith",
        members: "",
        modeOfHearing: "Remote",
        venue: "GRC Hearing Centre",
        additionalInformation: ""
      }
    ];

    const options = {
      locale: "en",
      courtName: "General Regulatory Chamber",
      contentDate: new Date(2025, 0, 2),
      lastReceivedDate: "2025-01-01T14:30:00Z",
      listTitle: "General Regulatory Chamber Weekly Hearing List"
    };

    // Act
    const result = renderGrcWeeklyHearingListData(hearingList, options);

    // Assert
    expect(result.header.lastUpdatedTime).toBe("2:30pm");
  });
});
