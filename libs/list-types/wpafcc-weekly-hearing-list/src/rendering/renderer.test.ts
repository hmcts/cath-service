import { describe, expect, it } from "vitest";
import type { WpafccWeeklyHearingList } from "../models/types.js";
import { renderWpafccWeeklyHearingListData } from "./renderer.js";

describe("renderWpafccWeeklyHearingListData", () => {
  it("should render hearing list with formatted dates", () => {
    // Arrange
    const hearingList: WpafccWeeklyHearingList = [
      {
        date: "02/01/2025",
        hearingTime: "10:00am",
        caseReferenceNumber: "WPAFCC/2025/001",
        caseName: "A Vs B",
        judges: "Judge Smith",
        members: "Member Jones",
        modeOfHearing: "Remote",
        venue: "WPAFCC Hearing Centre",
        additionalInformation: "Remote hearing"
      }
    ];

    const options = {
      locale: "en",
      courtName: "First-tier Tribunal (War Pensions and Armed Forces Compensation)",
      contentDate: new Date(2025, 0, 2),
      lastReceivedDate: "2025-01-01T09:55:00Z",
      listTitle: "First-tier Tribunal (War Pensions and Armed Forces Compensation) Weekly Hearing List"
    };

    // Act
    const result = renderWpafccWeeklyHearingListData(hearingList, options);

    // Assert
    expect(result.header.listTitle).toBe("First-tier Tribunal (War Pensions and Armed Forces Compensation) Weekly Hearing List");
    expect(result.header.weekCommencingDate).toBe("2 January 2025");
    expect(result.header.lastUpdatedDate).toBe("1 January 2025");
    expect(result.header.lastUpdatedTime).toContain("am");

    expect(result.hearings).toHaveLength(1);
    expect(result.hearings[0].date).toBe("2 January 2025");
    expect(result.hearings[0].hearingTime).toBe("10:00am");
    expect(result.hearings[0].caseReferenceNumber).toBe("WPAFCC/2025/001");
    expect(result.hearings[0].caseName).toBe("A Vs B");
    expect(result.hearings[0].judges).toBe("Judge Smith");
    expect(result.hearings[0].members).toBe("Member Jones");
    expect(result.hearings[0].modeOfHearing).toBe("Remote");
    expect(result.hearings[0].venue).toBe("WPAFCC Hearing Centre");
    expect(result.hearings[0].additionalInformation).toBe("Remote hearing");
  });

  it("should render multiple hearings", () => {
    // Arrange
    const hearingList: WpafccWeeklyHearingList = [
      {
        date: "02/01/2025",
        hearingTime: "10:00am",
        caseReferenceNumber: "WPAFCC/2025/001",
        caseName: "A Vs B",
        judges: "Judge Smith",
        members: "",
        modeOfHearing: "Remote",
        venue: "WPAFCC Hearing Centre",
        additionalInformation: ""
      },
      {
        date: "03/01/2025",
        hearingTime: "2:00pm",
        caseReferenceNumber: "WPAFCC/2025/002",
        caseName: "C Vs D",
        judges: "Judge Brown",
        members: "Member Green",
        modeOfHearing: "In person",
        venue: "WPAFCC Office",
        additionalInformation: "In person"
      }
    ];

    const options = {
      locale: "en",
      courtName: "First-tier Tribunal (War Pensions and Armed Forces Compensation)",
      contentDate: new Date(2025, 0, 2),
      lastReceivedDate: "2025-01-01T09:55:00Z",
      listTitle: "First-tier Tribunal (War Pensions and Armed Forces Compensation) Weekly Hearing List"
    };

    // Act
    const result = renderWpafccWeeklyHearingListData(hearingList, options);

    // Assert
    expect(result.hearings).toHaveLength(2);
    expect(result.hearings[0].date).toBe("2 January 2025");
    expect(result.hearings[1].date).toBe("3 January 2025");
  });

  it("should handle empty hearing list", () => {
    // Arrange
    const hearingList: WpafccWeeklyHearingList = [];

    const options = {
      locale: "en",
      courtName: "First-tier Tribunal (War Pensions and Armed Forces Compensation)",
      contentDate: new Date(2025, 0, 2),
      lastReceivedDate: "2025-01-01T09:55:00Z",
      listTitle: "First-tier Tribunal (War Pensions and Armed Forces Compensation) Weekly Hearing List"
    };

    // Act
    const result = renderWpafccWeeklyHearingListData(hearingList, options);

    // Assert
    expect(result.hearings).toHaveLength(0);
    expect(result.header.listTitle).toBe("First-tier Tribunal (War Pensions and Armed Forces Compensation) Weekly Hearing List");
  });

  it("should format lastUpdated PM time correctly", () => {
    // Arrange
    const hearingList: WpafccWeeklyHearingList = [
      {
        date: "02/01/2025",
        hearingTime: "10:00am",
        caseReferenceNumber: "WPAFCC/2025/001",
        caseName: "A Vs B",
        judges: "Judge Smith",
        members: "",
        modeOfHearing: "Remote",
        venue: "WPAFCC Hearing Centre",
        additionalInformation: ""
      }
    ];

    const options = {
      locale: "en",
      courtName: "First-tier Tribunal (War Pensions and Armed Forces Compensation)",
      contentDate: new Date(2025, 0, 2),
      lastReceivedDate: "2025-01-01T14:30:00Z",
      listTitle: "First-tier Tribunal (War Pensions and Armed Forces Compensation) Weekly Hearing List"
    };

    // Act
    const result = renderWpafccWeeklyHearingListData(hearingList, options);

    // Assert
    expect(result.header.lastUpdatedTime).toBe("2:30pm");
  });
});
