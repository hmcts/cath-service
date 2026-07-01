import { describe, expect, it } from "vitest";
import type { UtiacStatutoryAppealHearingList } from "../models/types.js";
import { renderUtiacStatutoryAppealDailyHearingListData } from "./renderer.js";

describe("renderUtiacStatutoryAppealDailyHearingListData", () => {
  it("should render hearing list with formatted display date", () => {
    // Arrange
    const hearingList: UtiacStatutoryAppealHearingList = [
      {
        hearingTime: "10:00am",
        appellant: "John Smith",
        representative: "Smith & Co",
        appealReferenceNumber: "IA/2025/001",
        judges: "Judge Smith",
        hearingType: "Substantive",
        location: "Field House",
        additionalInformation: ""
      }
    ];

    const options = {
      locale: "en",
      courtName: "Upper Tribunal (Immigration and Asylum) Chamber",
      displayFrom: new Date(2025, 0, 15),
      lastReceivedDate: "2025-01-14T09:55:00Z",
      listTitle: "Upper Tribunal (Immigration and Asylum) Chamber Statutory Appeal Daily Hearing List"
    };

    // Act
    const result = renderUtiacStatutoryAppealDailyHearingListData(hearingList, options);

    // Assert
    expect(result.header.listTitle).toBe("Upper Tribunal (Immigration and Asylum) Chamber Statutory Appeal Daily Hearing List");
    expect(result.header.listForDate).toBe("15 January 2025");
    expect(result.header.lastUpdatedDate).toBe("14 January 2025");
    expect(result.header.lastUpdatedTime).toContain("am");

    expect(result.hearings).toHaveLength(1);
    expect(result.hearings[0].hearingTime).toBe("10:00am");
    expect(result.hearings[0].appellant).toBe("John Smith");
    expect(result.hearings[0].representative).toBe("Smith & Co");
    expect(result.hearings[0].appealReferenceNumber).toBe("IA/2025/001");
    expect(result.hearings[0].judges).toBe("Judge Smith");
    expect(result.hearings[0].hearingType).toBe("Substantive");
    expect(result.hearings[0].location).toBe("Field House");
    expect(result.hearings[0].additionalInformation).toBe("");
  });

  it("should render multiple hearings", () => {
    // Arrange
    const hearingList: UtiacStatutoryAppealHearingList = [
      {
        hearingTime: "10:00am",
        appellant: "John Smith",
        representative: "",
        appealReferenceNumber: "IA/2025/001",
        judges: "Judge Smith",
        hearingType: "Substantive",
        location: "Field House",
        additionalInformation: ""
      },
      {
        hearingTime: "2:00pm",
        appellant: "Jane Brown",
        representative: "Brown Solicitors",
        appealReferenceNumber: "IA/2025/002",
        judges: "Judge Brown",
        hearingType: "Preliminary",
        location: "Manchester",
        additionalInformation: "Remote"
      }
    ];

    const options = {
      locale: "en",
      courtName: "Upper Tribunal (Immigration and Asylum) Chamber",
      displayFrom: new Date(2025, 0, 15),
      lastReceivedDate: "2025-01-14T09:55:00Z",
      listTitle: "Upper Tribunal (Immigration and Asylum) Chamber Statutory Appeal Daily Hearing List"
    };

    // Act
    const result = renderUtiacStatutoryAppealDailyHearingListData(hearingList, options);

    // Assert
    expect(result.hearings).toHaveLength(2);
    expect(result.hearings[0].appellant).toBe("John Smith");
    expect(result.hearings[1].appellant).toBe("Jane Brown");
  });

  it("should handle empty hearing list", () => {
    // Arrange
    const hearingList: UtiacStatutoryAppealHearingList = [];

    const options = {
      locale: "en",
      courtName: "Upper Tribunal (Immigration and Asylum) Chamber",
      displayFrom: new Date(2025, 0, 15),
      lastReceivedDate: "2025-01-14T09:55:00Z",
      listTitle: "Upper Tribunal (Immigration and Asylum) Chamber Statutory Appeal Daily Hearing List"
    };

    // Act
    const result = renderUtiacStatutoryAppealDailyHearingListData(hearingList, options);

    // Assert
    expect(result.hearings).toHaveLength(0);
    expect(result.header.listTitle).toBe("Upper Tribunal (Immigration and Asylum) Chamber Statutory Appeal Daily Hearing List");
  });

  it("should format PM times correctly", () => {
    // Arrange
    const hearingList: UtiacStatutoryAppealHearingList = [
      {
        hearingTime: "10:00am",
        appellant: "John Smith",
        representative: "",
        appealReferenceNumber: "IA/2025/001",
        judges: "Judge Smith",
        hearingType: "Substantive",
        location: "Field House",
        additionalInformation: ""
      }
    ];

    const options = {
      locale: "en",
      courtName: "Upper Tribunal (Immigration and Asylum) Chamber",
      displayFrom: new Date(2025, 0, 15),
      lastReceivedDate: "2025-01-14T14:30:00Z",
      listTitle: "Upper Tribunal (Immigration and Asylum) Chamber Statutory Appeal Daily Hearing List"
    };

    // Act
    const result = renderUtiacStatutoryAppealDailyHearingListData(hearingList, options);

    // Assert
    expect(result.header.lastUpdatedTime).toBe("2:30pm");
  });
});
