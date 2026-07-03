import { describe, expect, it } from "vitest";
import type { FttLrtHearingList } from "../models/types.js";
import { renderFttLrtData } from "./renderer.js";

describe("renderFttLrtData", () => {
  it("should render hearing list with formatted dates", () => {
    // Arrange
    const hearingList: FttLrtHearingList = [
      {
        date: "02/01/2025",
        hearingTime: "10:00am",
        caseName: "A Vs B",
        caseReferenceNumber: "LRT/00001/2025",
        judge: "Judge Smith",
        venuePlatform: "London"
      }
    ];

    const options = {
      locale: "en",
      courtName: "First-tier Tribunal (Land Registration Tribunal)",
      contentDate: new Date(2025, 0, 2),
      lastReceivedDate: "2025-01-01T09:55:00Z",
      listTitle: "First-tier Tribunal (Land Registration Tribunal) Weekly Hearing List"
    };

    // Act
    const result = renderFttLrtData(hearingList, options);

    // Assert
    expect(result.header.listTitle).toBe("First-tier Tribunal (Land Registration Tribunal) Weekly Hearing List");
    expect(result.header.weekCommencingDate).toBe("02 January 2025");
    expect(result.header.lastUpdatedDate).toBe("01 January 2025");
    expect(result.header.lastUpdatedTime).toContain("am");

    expect(result.hearings).toHaveLength(1);
    expect(result.hearings[0].date).toBe("02 January 2025");
    expect(result.hearings[0].hearingTime).toBe("10:00am");
    expect(result.hearings[0].caseName).toBe("A Vs B");
    expect(result.hearings[0].caseReferenceNumber).toBe("LRT/00001/2025");
    expect(result.hearings[0].judge).toBe("Judge Smith");
    expect(result.hearings[0].venuePlatform).toBe("London");
  });

  it("should render multiple hearings", () => {
    // Arrange
    const hearingList: FttLrtHearingList = [
      {
        date: "02/01/2025",
        hearingTime: "10:00am",
        caseName: "A Vs B",
        caseReferenceNumber: "LRT/00001/2025",
        judge: "Judge Smith",
        venuePlatform: "London"
      },
      {
        date: "03/01/2025",
        hearingTime: "2:00pm",
        caseName: "C Vs D",
        caseReferenceNumber: "LRT/00002/2025",
        judge: "Judge Brown",
        venuePlatform: "Manchester"
      }
    ];

    const options = {
      locale: "en",
      courtName: "First-tier Tribunal (Land Registration Tribunal)",
      contentDate: new Date(2025, 0, 2),
      lastReceivedDate: "2025-01-01T09:55:00Z",
      listTitle: "First-tier Tribunal (Land Registration Tribunal) Weekly Hearing List"
    };

    // Act
    const result = renderFttLrtData(hearingList, options);

    // Assert
    expect(result.hearings).toHaveLength(2);
    expect(result.hearings[0].date).toBe("02 January 2025");
    expect(result.hearings[1].date).toBe("03 January 2025");
  });

  it("should handle empty hearing list", () => {
    // Arrange
    const hearingList: FttLrtHearingList = [];

    const options = {
      locale: "en",
      courtName: "First-tier Tribunal (Land Registration Tribunal)",
      contentDate: new Date(2025, 0, 2),
      lastReceivedDate: "2025-01-01T09:55:00Z",
      listTitle: "First-tier Tribunal (Land Registration Tribunal) Weekly Hearing List"
    };

    // Act
    const result = renderFttLrtData(hearingList, options);

    // Assert
    expect(result.hearings).toHaveLength(0);
    expect(result.header.listTitle).toBe("First-tier Tribunal (Land Registration Tribunal) Weekly Hearing List");
  });

  it("should format lastUpdated time correctly", () => {
    // Arrange
    const hearingList: FttLrtHearingList = [
      {
        date: "02/01/2025",
        hearingTime: "10:00am",
        caseName: "A Vs B",
        caseReferenceNumber: "LRT/00001/2025",
        judge: "Judge Smith",
        venuePlatform: "London"
      }
    ];

    const options = {
      locale: "en",
      courtName: "First-tier Tribunal (Land Registration Tribunal)",
      contentDate: new Date(2025, 0, 2),
      lastReceivedDate: "2025-01-01T14:30:00Z",
      listTitle: "First-tier Tribunal (Land Registration Tribunal) Weekly Hearing List"
    };

    // Act
    const result = renderFttLrtData(hearingList, options);

    // Assert
    expect(result.header.lastUpdatedTime).toBe("2:30pm");
  });
});
