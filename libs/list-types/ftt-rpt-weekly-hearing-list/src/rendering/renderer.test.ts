import { describe, expect, it } from "vitest";
import type { FttRptHearingList } from "../models/types.js";
import { renderFttRptData } from "./renderer.js";

describe("renderFttRptData", () => {
  it("should render hearing list with formatted dates", () => {
    // Arrange
    const hearingList: FttRptHearingList = [
      {
        date: "02/01/2025",
        time: "10:00am",
        venue: "London",
        caseType: "Leasehold",
        caseReferenceNumber: "RPT/00001/2025",
        judges: "Judge Smith",
        members: "Member Jones",
        hearingMethod: "In person",
        additionalInformation: ""
      }
    ];

    const options = {
      locale: "en",
      courtName: "First-tier Tribunal (Residential Property Tribunal): Eastern region",
      contentDate: new Date(2025, 0, 2),
      lastReceivedDate: "2025-01-01T09:55:00Z",
      listTitle: "First-tier Tribunal (Residential Property Tribunal): Eastern region Weekly Hearing List"
    };

    // Act
    const result = renderFttRptData(hearingList, options);

    // Assert
    expect(result.header.listTitle).toBe("First-tier Tribunal (Residential Property Tribunal): Eastern region Weekly Hearing List");
    expect(result.header.weekCommencingDate).toBe("02 January 2025");
    expect(result.header.lastUpdatedDate).toBe("01 January 2025");
    expect(result.header.lastUpdatedTime).toContain("am");

    expect(result.hearings).toHaveLength(1);
    expect(result.hearings[0].date).toBe("02 January 2025");
    expect(result.hearings[0].time).toBe("10:00am");
    expect(result.hearings[0].venue).toBe("London");
    expect(result.hearings[0].caseType).toBe("Leasehold");
    expect(result.hearings[0].caseReferenceNumber).toBe("RPT/00001/2025");
    expect(result.hearings[0].judges).toBe("Judge Smith");
    expect(result.hearings[0].members).toBe("Member Jones");
    expect(result.hearings[0].hearingMethod).toBe("In person");
    expect(result.hearings[0].additionalInformation).toBe("");
  });

  it("should render multiple hearings", () => {
    // Arrange
    const hearingList: FttRptHearingList = [
      {
        date: "02/01/2025",
        time: "10:00am",
        venue: "London",
        caseType: "Leasehold",
        caseReferenceNumber: "RPT/00001/2025",
        judges: "Judge Smith",
        members: "",
        hearingMethod: "In person",
        additionalInformation: ""
      },
      {
        date: "03/01/2025",
        time: "2:00pm",
        venue: "Manchester",
        caseType: "Rent",
        caseReferenceNumber: "RPT/00002/2025",
        judges: "Judge Brown",
        members: "Member Jones",
        hearingMethod: "Video",
        additionalInformation: "Remote"
      }
    ];

    const options = {
      locale: "en",
      courtName: "First-tier Tribunal (Residential Property Tribunal): Northern region",
      contentDate: new Date(2025, 0, 2),
      lastReceivedDate: "2025-01-01T09:55:00Z",
      listTitle: "First-tier Tribunal (Residential Property Tribunal): Northern region Weekly Hearing List"
    };

    // Act
    const result = renderFttRptData(hearingList, options);

    // Assert
    expect(result.hearings).toHaveLength(2);
    expect(result.hearings[0].date).toBe("02 January 2025");
    expect(result.hearings[1].date).toBe("03 January 2025");
  });

  it("should handle empty hearing list", () => {
    // Arrange
    const hearingList: FttRptHearingList = [];

    const options = {
      locale: "en",
      courtName: "First-tier Tribunal (Residential Property Tribunal): London region",
      contentDate: new Date(2025, 0, 2),
      lastReceivedDate: "2025-01-01T09:55:00Z",
      listTitle: "First-tier Tribunal (Residential Property Tribunal): London region Weekly Hearing List"
    };

    // Act
    const result = renderFttRptData(hearingList, options);

    // Assert
    expect(result.hearings).toHaveLength(0);
    expect(result.header.listTitle).toBe("First-tier Tribunal (Residential Property Tribunal): London region Weekly Hearing List");
  });

  it("should format lastUpdated time correctly", () => {
    // Arrange
    const hearingList: FttRptHearingList = [
      {
        date: "02/01/2025",
        time: "10:00am",
        venue: "London",
        caseType: "Leasehold",
        caseReferenceNumber: "RPT/00001/2025",
        judges: "Judge Smith",
        members: "",
        hearingMethod: "In person",
        additionalInformation: ""
      }
    ];

    const options = {
      locale: "en",
      courtName: "First-tier Tribunal (Residential Property Tribunal): Southern region",
      contentDate: new Date(2025, 0, 2),
      lastReceivedDate: "2025-01-01T14:30:00Z",
      listTitle: "First-tier Tribunal (Residential Property Tribunal): Southern region Weekly Hearing List"
    };

    // Act
    const result = renderFttRptData(hearingList, options);

    // Assert
    expect(result.header.lastUpdatedTime).toBe("2:30pm");
  });
});
