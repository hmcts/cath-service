import { describe, expect, it } from "vitest";
import type { AdministrativeCourtHearingList } from "../models/types.js";
import { renderAdminCourt } from "./renderer.js";

describe("renderAdminCourt", () => {
  const mockHearings: AdministrativeCourtHearingList = [
    {
      venue: "Court 1",
      judge: "Judge Smith",
      time: "10:00am",
      caseNumber: "T20257890",
      caseDetails: "R v Jones",
      hearingType: "Trial",
      additionalInformation: "Bring exhibits"
    },
    {
      venue: "Court 2",
      judge: "Judge Brown",
      time: "2.30pm",
      caseNumber: "T20257891",
      caseDetails: "R v Wilson",
      hearingType: "Sentencing",
      additionalInformation: ""
    }
  ];

  it("should render hearing list with English locale", () => {
    const result = renderAdminCourt(mockHearings, {
      locale: "en",
      listTypeName: "BIRMINGHAM_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST",
      listTitle: "Birmingham Administrative Court Daily Cause List",
      contentDate: new Date(2025, 0, 15),
      lastReceivedDate: "2025-01-15T09:30:00Z"
    });

    expect(result.header.listTitle).toBe("Birmingham Administrative Court Daily Cause List");
    expect(result.header.listDate).toContain("15 January 2025");
    expect(result.header.lastUpdatedDate).toContain("15 January 2025");
    expect(result.header.lastUpdatedTime).toBeDefined();
    expect(result.hearings).toHaveLength(2);
    expect(result.hearings[0].venue).toBe("Court 1");
    expect(result.hearings[0].time).toBe("10:00am");
  });

  it("should render hearing list with Welsh locale", () => {
    const result = renderAdminCourt(mockHearings, {
      locale: "cy",
      listTypeName: "BIRMINGHAM_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST",
      listTitle: "Rhestr Achosion Dyddiol Llys Gweinyddol Birmingham",
      contentDate: new Date(2025, 0, 15),
      lastReceivedDate: "2025-01-15T09:30:00Z"
    });

    expect(result.header.listTitle).toBe("Rhestr Achosion Dyddiol Llys Gweinyddol Birmingham");
    expect(result.header.listDate).toContain("Ionawr");
    expect(result.hearings).toHaveLength(2);
  });

  it("should normalize time format from dot to colon", () => {
    const result = renderAdminCourt(mockHearings, {
      locale: "en",
      listTypeName: "BIRMINGHAM_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST",
      listTitle: "Test List",
      contentDate: new Date(2025, 0, 15),
      lastReceivedDate: "2025-01-15T09:30:00Z"
    });

    expect(result.hearings[0].time).toBe("10:00am");
    expect(result.hearings[1].time).toBe("2:30pm");
  });

  it("should handle empty additional information", () => {
    const result = renderAdminCourt(mockHearings, {
      locale: "en",
      listTypeName: "BIRMINGHAM_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST",
      listTitle: "Test List",
      contentDate: new Date(2025, 0, 15),
      lastReceivedDate: "2025-01-15T09:30:00Z"
    });

    expect(result.hearings[1].additionalInformation).toBe("");
  });

  it("should preserve all hearing data", () => {
    const result = renderAdminCourt(mockHearings, {
      locale: "en",
      listTypeName: "BIRMINGHAM_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST",
      listTitle: "Test List",
      contentDate: new Date(2025, 0, 15),
      lastReceivedDate: "2025-01-15T09:30:00Z"
    });

    const firstHearing = result.hearings[0];
    expect(firstHearing.venue).toBe("Court 1");
    expect(firstHearing.judge).toBe("Judge Smith");
    expect(firstHearing.time).toBe("10:00am");
    expect(firstHearing.caseNumber).toBe("T20257890");
    expect(firstHearing.caseDetails).toBe("R v Jones");
    expect(firstHearing.hearingType).toBe("Trial");
    expect(firstHearing.additionalInformation).toBe("Bring exhibits");
  });

  it("should format last updated with time", () => {
    const result = renderAdminCourt(mockHearings, {
      locale: "en",
      listTypeName: "BIRMINGHAM_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST",
      listTitle: "Test List",
      contentDate: new Date(2025, 0, 15),
      lastReceivedDate: "2025-01-15T14:30:00Z"
    });

    expect(result.header.lastUpdatedTime).toMatch(/2:30pm/);
  });

  it("should format last updated without minutes when on the hour", () => {
    const result = renderAdminCourt(mockHearings, {
      locale: "en",
      listTypeName: "BIRMINGHAM_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST",
      listTitle: "Test List",
      contentDate: new Date(2025, 0, 15),
      lastReceivedDate: "2025-01-15T14:00:00Z"
    });

    expect(result.header.lastUpdatedTime).toMatch(/2pm/);
  });

  it("should handle hearing with undefined additional information", () => {
    const hearingsWithUndefined: AdministrativeCourtHearingList = [
      {
        venue: "Court 1",
        judge: "Judge Smith",
        time: "10:00am",
        caseNumber: "T20257890",
        caseDetails: "R v Jones",
        hearingType: "Trial",
        additionalInformation: ""
      }
    ];

    const result = renderAdminCourt(hearingsWithUndefined, {
      locale: "en",
      listTypeName: "BIRMINGHAM_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST",
      listTitle: "Test List",
      contentDate: new Date(2025, 0, 15),
      lastReceivedDate: "2025-01-15T09:30:00Z"
    });

    expect(result.hearings[0].additionalInformation).toBe("");
  });

  it("should format dates correctly for different months", () => {
    const result = renderAdminCourt(mockHearings, {
      locale: "en",
      listTypeName: "BIRMINGHAM_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST",
      listTitle: "Test List",
      contentDate: new Date(2025, 11, 25),
      lastReceivedDate: "2025-12-25T09:30:00Z"
    });

    expect(result.header.listDate).toContain("25 December 2025");
    expect(result.header.lastUpdatedDate).toContain("25 December 2025");
  });

  it("should handle all supported list type names", () => {
    const listTypeNames = [
      "BIRMINGHAM_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST",
      "LEEDS_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST",
      "BRISTOL_CARDIFF_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST",
      "MANCHESTER_ADMINISTRATIVE_COURT_DAILY_CAUSE_LIST"
    ];

    for (const listTypeName of listTypeNames) {
      const result = renderAdminCourt(mockHearings, {
        locale: "en",
        listTypeName,
        listTitle: "Test List",
        contentDate: new Date(2025, 0, 15),
        lastReceivedDate: "2025-01-15T09:30:00Z"
      });

      expect(result).toBeDefined();
      expect(result.hearings).toHaveLength(2);
    }
  });
});
