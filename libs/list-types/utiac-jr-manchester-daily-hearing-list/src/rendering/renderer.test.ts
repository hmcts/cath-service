import { describe, expect, it } from "vitest";
import type { UtiacJrManchesterHearingList } from "../models/types.js";
import { renderUtiacJrManchesterDailyHearingListData } from "./renderer.js";

describe("renderUtiacJrManchesterDailyHearingListData", () => {
  it("should render hearing list with formatted display date", () => {
    // Arrange
    const hearingList: UtiacJrManchesterHearingList = [
      {
        hearingTime: "10:00am",
        caseTitle: "Smith v Secretary of State",
        representative: "Smith & Co",
        caseReferenceNumber: "JR/2025/001",
        judges: "Judge Smith",
        hearingType: "Permission",
        location: "Field House",
        additionalInformation: ""
      }
    ];

    const options = {
      locale: "en",
      courtName: "Upper Tribunal (Immigration and Asylum) Chamber",
      displayFrom: new Date(2025, 0, 15),
      lastReceivedDate: "2025-01-14T09:55:00Z",
      listTitle: "Upper Tribunal (Immigration and Asylum) Chamber - Judicial Review: Manchester Daily Hearing List"
    };

    // Act
    const result = renderUtiacJrManchesterDailyHearingListData(hearingList, options);

    // Assert
    expect(result.header.listTitle).toBe("Upper Tribunal (Immigration and Asylum) Chamber - Judicial Review: Manchester Daily Hearing List");
    expect(result.header.listForDate).toBe("15 January 2025");
    expect(result.header.lastUpdatedDate).toBe("14 January 2025");
    expect(result.header.lastUpdatedTime).toContain("am");

    expect(result.hearings).toHaveLength(1);
    expect(result.hearings[0].hearingTime).toBe("10:00am");
    expect(result.hearings[0].caseTitle).toBe("Smith v Secretary of State");
    expect(result.hearings[0].representative).toBe("Smith & Co");
    expect(result.hearings[0].caseReferenceNumber).toBe("JR/2025/001");
    expect(result.hearings[0].judges).toBe("Judge Smith");
    expect(result.hearings[0].hearingType).toBe("Permission");
    expect(result.hearings[0].location).toBe("Field House");
    expect(result.hearings[0].additionalInformation).toBe("");
  });

  it("should render multiple hearings", () => {
    // Arrange
    const hearingList: UtiacJrManchesterHearingList = [
      {
        hearingTime: "10:00am",
        caseTitle: "Smith v Secretary of State",
        representative: "",
        caseReferenceNumber: "JR/2025/001",
        judges: "Judge Smith",
        hearingType: "Permission",
        location: "Field House",
        additionalInformation: ""
      },
      {
        hearingTime: "2:00pm",
        caseTitle: "Brown v Home Office",
        representative: "Brown Solicitors",
        caseReferenceNumber: "JR/2025/002",
        judges: "Judge Brown",
        hearingType: "Full hearing",
        location: "Manchester",
        additionalInformation: "Remote"
      }
    ];

    const options = {
      locale: "en",
      courtName: "Upper Tribunal (Immigration and Asylum) Chamber",
      displayFrom: new Date(2025, 0, 15),
      lastReceivedDate: "2025-01-14T09:55:00Z",
      listTitle: "Upper Tribunal (Immigration and Asylum) Chamber - Judicial Review: Manchester Daily Hearing List"
    };

    // Act
    const result = renderUtiacJrManchesterDailyHearingListData(hearingList, options);

    // Assert
    expect(result.hearings).toHaveLength(2);
    expect(result.hearings[0].caseTitle).toBe("Smith v Secretary of State");
    expect(result.hearings[1].caseTitle).toBe("Brown v Home Office");
  });

  it("should handle empty hearing list", () => {
    // Arrange
    const hearingList: UtiacJrManchesterHearingList = [];

    const options = {
      locale: "en",
      courtName: "Upper Tribunal (Immigration and Asylum) Chamber",
      displayFrom: new Date(2025, 0, 15),
      lastReceivedDate: "2025-01-14T09:55:00Z",
      listTitle: "Upper Tribunal (Immigration and Asylum) Chamber - Judicial Review: Manchester Daily Hearing List"
    };

    // Act
    const result = renderUtiacJrManchesterDailyHearingListData(hearingList, options);

    // Assert
    expect(result.hearings).toHaveLength(0);
    expect(result.header.listTitle).toBe("Upper Tribunal (Immigration and Asylum) Chamber - Judicial Review: Manchester Daily Hearing List");
  });

  it("should format PM times correctly", () => {
    // Arrange
    const hearingList: UtiacJrManchesterHearingList = [
      {
        hearingTime: "10:00am",
        caseTitle: "Smith v Secretary of State",
        representative: "",
        caseReferenceNumber: "JR/2025/001",
        judges: "Judge Smith",
        hearingType: "Permission",
        location: "Field House",
        additionalInformation: ""
      }
    ];

    const options = {
      locale: "en",
      courtName: "Upper Tribunal (Immigration and Asylum) Chamber",
      displayFrom: new Date(2025, 0, 15),
      lastReceivedDate: "2025-01-14T14:30:00Z",
      listTitle: "Upper Tribunal (Immigration and Asylum) Chamber - Judicial Review: Manchester Daily Hearing List"
    };

    // Act
    const result = renderUtiacJrManchesterDailyHearingListData(hearingList, options);

    // Assert
    expect(result.header.lastUpdatedTime).toBe("2:30pm");
  });
});
