import { describe, expect, it } from "vitest";
import type { FttTaxChamberHearingList } from "../models/types.js";
import { renderFttTaxChamberData } from "./renderer.js";

describe("renderFttTaxChamberData", () => {
  it("should render hearing list with formatted dates", () => {
    // Arrange
    const hearingList: FttTaxChamberHearingList = [
      {
        date: "02/01/2025",
        hearingTime: "10:00am",
        caseName: "A Vs HMRC",
        caseReferenceNumber: "TC/00001/2025",
        judges: "Judge Smith",
        members: "Member Jones",
        venuePlatform: "London"
      }
    ];

    const options = {
      locale: "en",
      courtName: "First-tier Tribunal (Tax Chamber)",
      contentDate: new Date(2025, 0, 2),
      lastReceivedDate: "2025-01-01T09:55:00Z",
      listTitle: "First-tier Tribunal (Tax Chamber) Weekly Hearing List"
    };

    // Act
    const result = renderFttTaxChamberData(hearingList, options);

    // Assert
    expect(result.header.listTitle).toBe("First-tier Tribunal (Tax Chamber) Weekly Hearing List");
    expect(result.header.weekCommencingDate).toBe("2 January 2025");
    expect(result.header.lastUpdatedDate).toBe("1 January 2025");
    expect(result.header.lastUpdatedTime).toContain("am");

    expect(result.hearings).toHaveLength(1);
    expect(result.hearings[0].date).toBe("2 January 2025");
    expect(result.hearings[0].hearingTime).toBe("10:00am");
    expect(result.hearings[0].caseName).toBe("A Vs HMRC");
    expect(result.hearings[0].caseReferenceNumber).toBe("TC/00001/2025");
    expect(result.hearings[0].judges).toBe("Judge Smith");
    expect(result.hearings[0].members).toBe("Member Jones");
    expect(result.hearings[0].venuePlatform).toBe("London");
  });

  it("should render multiple hearings", () => {
    // Arrange
    const hearingList: FttTaxChamberHearingList = [
      {
        date: "02/01/2025",
        hearingTime: "10:00am",
        caseName: "A Vs HMRC",
        caseReferenceNumber: "TC/00001/2025",
        judges: "Judge Smith",
        members: "",
        venuePlatform: "London"
      },
      {
        date: "03/01/2025",
        hearingTime: "2:00pm",
        caseName: "B Vs HMRC",
        caseReferenceNumber: "TC/00002/2025",
        judges: "Judge Brown",
        members: "Member Jones",
        venuePlatform: "Manchester"
      }
    ];

    const options = {
      locale: "en",
      courtName: "First-tier Tribunal (Tax Chamber)",
      contentDate: new Date(2025, 0, 2),
      lastReceivedDate: "2025-01-01T09:55:00Z",
      listTitle: "First-tier Tribunal (Tax Chamber) Weekly Hearing List"
    };

    // Act
    const result = renderFttTaxChamberData(hearingList, options);

    // Assert
    expect(result.hearings).toHaveLength(2);
    expect(result.hearings[0].date).toBe("2 January 2025");
    expect(result.hearings[1].date).toBe("3 January 2025");
  });

  it("should handle empty hearing list", () => {
    // Arrange
    const hearingList: FttTaxChamberHearingList = [];

    const options = {
      locale: "en",
      courtName: "First-tier Tribunal (Tax Chamber)",
      contentDate: new Date(2025, 0, 2),
      lastReceivedDate: "2025-01-01T09:55:00Z",
      listTitle: "First-tier Tribunal (Tax Chamber) Weekly Hearing List"
    };

    // Act
    const result = renderFttTaxChamberData(hearingList, options);

    // Assert
    expect(result.hearings).toHaveLength(0);
    expect(result.header.listTitle).toBe("First-tier Tribunal (Tax Chamber) Weekly Hearing List");
  });

  it("should format lastUpdated time correctly", () => {
    // Arrange
    const hearingList: FttTaxChamberHearingList = [
      {
        date: "02/01/2025",
        hearingTime: "10:00am",
        caseName: "A Vs HMRC",
        caseReferenceNumber: "TC/00001/2025",
        judges: "Judge Smith",
        members: "",
        venuePlatform: "London"
      }
    ];

    const options = {
      locale: "en",
      courtName: "First-tier Tribunal (Tax Chamber)",
      contentDate: new Date(2025, 0, 2),
      lastReceivedDate: "2025-01-01T14:30:00Z",
      listTitle: "First-tier Tribunal (Tax Chamber) Weekly Hearing List"
    };

    // Act
    const result = renderFttTaxChamberData(hearingList, options);

    // Assert
    expect(result.header.lastUpdatedTime).toBe("2:30pm");
  });
});
