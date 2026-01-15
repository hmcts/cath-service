import { describe, expect, it } from "vitest";
import type { StandardHearingList } from "../models/types.js";
import { renderStandardDailyCauseList } from "./renderer.js";

describe("renderStandardDailyCauseList", () => {
  const mockHearings: StandardHearingList = [
    {
      venue: "Court 1",
      judge: "Judge Smith",
      time: "10:00",
      caseNumber: "T20257890",
      caseDetails: "R v Jones",
      hearingType: "Trial",
      additionalInformation: "Bring exhibits"
    },
    {
      venue: "Court 2",
      judge: "Judge Brown",
      time: "14:30",
      caseNumber: "T20257891",
      caseDetails: "R v Wilson",
      hearingType: "Sentencing",
      additionalInformation: ""
    }
  ];

  it("should render hearing list with English locale", () => {
    const result = renderStandardDailyCauseList(mockHearings, {
      locale: "en",
      listTypeId: 10,
      listTitle: "Civil Courts at the RCJ Daily Cause List",
      displayFrom: new Date(2025, 0, 15),
      displayTo: new Date(2025, 0, 15),
      lastReceivedDate: "2025-01-15T09:30:00Z"
    });

    expect(result.header.listTitle).toBe("Civil Courts at the RCJ Daily Cause List");
    expect(result.header.listDate).toContain("15 January 2025");
    expect(result.header.lastUpdatedDate).toContain("15 January 2025");
    expect(result.header.lastUpdatedTime).toBeDefined();
    expect(result.hearings).toHaveLength(2);
    expect(result.hearings[0].venue).toBe("Court 1");
    expect(result.hearings[0].time).toBe("10:00");
  });

  it("should render hearing list with Welsh locale", () => {
    const result = renderStandardDailyCauseList(mockHearings, {
      locale: "cy",
      listTypeId: 10,
      listTitle: "Rhestr Achosion Dyddiol y Llysoedd Sifil yn y Llys Barn Brenhinol",
      displayFrom: new Date(2025, 0, 15),
      displayTo: new Date(2025, 0, 15),
      lastReceivedDate: "2025-01-15T09:30:00Z"
    });

    expect(result.header.listTitle).toBe("Rhestr Achosion Dyddiol y Llysoedd Sifil yn y Llys Barn Brenhinol");
    expect(result.header.listDate).toContain("Ionawr");
    expect(result.hearings).toHaveLength(2);
  });

  it("should handle empty additional information", () => {
    const result = renderStandardDailyCauseList(mockHearings, {
      locale: "en",
      listTypeId: 10,
      listTitle: "Civil Courts at the RCJ Daily Cause List",
      displayFrom: new Date(2025, 0, 15),
      displayTo: new Date(2025, 0, 15),
      lastReceivedDate: "2025-01-15T09:30:00Z"
    });

    expect(result.hearings[1].additionalInformation).toBe("");
  });

  it("should preserve all hearing data", () => {
    const result = renderStandardDailyCauseList(mockHearings, {
      locale: "en",
      listTypeId: 10,
      listTitle: "Test List",
      displayFrom: new Date(2025, 0, 15),
      displayTo: new Date(2025, 0, 15),
      lastReceivedDate: "2025-01-15T09:30:00Z"
    });

    const firstHearing = result.hearings[0];
    expect(firstHearing.venue).toBe("Court 1");
    expect(firstHearing.judge).toBe("Judge Smith");
    expect(firstHearing.time).toBe("10:00");
    expect(firstHearing.caseNumber).toBe("T20257890");
    expect(firstHearing.caseDetails).toBe("R v Jones");
    expect(firstHearing.hearingType).toBe("Trial");
    expect(firstHearing.additionalInformation).toBe("Bring exhibits");
  });
});
