import { describe, expect, it } from "vitest";
import type { SiacPoacPaacHearingList } from "../models/types.js";
import { renderSiacPoacPaacData } from "./renderer.js";

describe("renderSiacPoacPaacData", () => {
  it("should render hearing list with formatted dates", () => {
    // Arrange
    const hearingList: SiacPoacPaacHearingList = [
      {
        date: "02/01/2025",
        time: "10:00am",
        appellant: "A Vs B",
        caseReferenceNumber: "SC/00001/2025",
        hearingType: "Substantive hearing",
        courtroom: "Court 1",
        additionalInformation: "Remote hearing"
      }
    ];

    const options = {
      locale: "en",
      courtName: "Special Immigration Appeals Commission",
      contentDate: new Date(2025, 0, 2),
      lastReceivedDate: "2025-01-01T09:55:00Z",
      listTitle: "Special Immigration Appeals Commission Weekly Hearing List"
    };

    // Act
    const result = renderSiacPoacPaacData(hearingList, options);

    // Assert
    expect(result.header.listTitle).toBe("Special Immigration Appeals Commission Weekly Hearing List");
    expect(result.header.weekCommencingDate).toBe("2 January 2025");
    expect(result.header.lastUpdatedDate).toBe("1 January 2025");
    expect(result.header.lastUpdatedTime).toContain("am");

    expect(result.hearings).toHaveLength(1);
    expect(result.hearings[0].date).toBe("2 January 2025");
    expect(result.hearings[0].time).toBe("10:00am");
    expect(result.hearings[0].appellant).toBe("A Vs B");
    expect(result.hearings[0].caseReferenceNumber).toBe("SC/00001/2025");
    expect(result.hearings[0].hearingType).toBe("Substantive hearing");
    expect(result.hearings[0].courtroom).toBe("Court 1");
    expect(result.hearings[0].additionalInformation).toBe("Remote hearing");
  });

  it("should render multiple hearings", () => {
    // Arrange
    const hearingList: SiacPoacPaacHearingList = [
      {
        date: "02/01/2025",
        time: "10:00am",
        appellant: "A Vs B",
        caseReferenceNumber: "SC/00001/2025",
        hearingType: "Substantive hearing",
        courtroom: "Court 1",
        additionalInformation: ""
      },
      {
        date: "03/01/2025",
        time: "2:00pm",
        appellant: "C Vs D",
        caseReferenceNumber: "SC/00002/2025",
        hearingType: "Preliminary hearing",
        courtroom: "Court 2",
        additionalInformation: "In person"
      }
    ];

    const options = {
      locale: "en",
      courtName: "Special Immigration Appeals Commission",
      contentDate: new Date(2025, 0, 2),
      lastReceivedDate: "2025-01-01T09:55:00Z",
      listTitle: "Special Immigration Appeals Commission Weekly Hearing List"
    };

    // Act
    const result = renderSiacPoacPaacData(hearingList, options);

    // Assert
    expect(result.hearings).toHaveLength(2);
    expect(result.hearings[0].date).toBe("2 January 2025");
    expect(result.hearings[1].date).toBe("3 January 2025");
  });

  it("should format date with zero-padded day correctly", () => {
    // Arrange
    const hearingList: SiacPoacPaacHearingList = [
      {
        date: "01/01/2025",
        time: "10:00am",
        appellant: "A Vs B",
        caseReferenceNumber: "SC/00001/2025",
        hearingType: "Substantive hearing",
        courtroom: "Court 1",
        additionalInformation: ""
      }
    ];

    const options = {
      locale: "en",
      courtName: "Special Immigration Appeals Commission",
      contentDate: new Date(2025, 0, 1),
      lastReceivedDate: "2025-01-01T09:55:00Z",
      listTitle: "Special Immigration Appeals Commission Weekly Hearing List"
    };

    // Act
    const result = renderSiacPoacPaacData(hearingList, options);

    // Assert
    expect(result.hearings[0].date).toBe("1 January 2025");
  });

  it("should format lastUpdated with time", () => {
    // Arrange
    const hearingList: SiacPoacPaacHearingList = [
      {
        date: "02/01/2025",
        time: "10:00am",
        appellant: "A Vs B",
        caseReferenceNumber: "SC/00001/2025",
        hearingType: "Substantive hearing",
        courtroom: "Court 1",
        additionalInformation: ""
      }
    ];

    const options = {
      locale: "en",
      courtName: "Special Immigration Appeals Commission",
      contentDate: new Date(2025, 0, 2),
      lastReceivedDate: "2025-01-01T09:55:00Z",
      listTitle: "Special Immigration Appeals Commission Weekly Hearing List"
    };

    // Act
    const result = renderSiacPoacPaacData(hearingList, options);

    // Assert
    expect(result.header.lastUpdatedTime).toBe("9:55am");
  });

  it("should handle empty hearing list", () => {
    // Arrange
    const hearingList: SiacPoacPaacHearingList = [];

    const options = {
      locale: "en",
      courtName: "Special Immigration Appeals Commission",
      contentDate: new Date(2025, 0, 2),
      lastReceivedDate: "2025-01-01T09:55:00Z",
      listTitle: "Special Immigration Appeals Commission Weekly Hearing List"
    };

    // Act
    const result = renderSiacPoacPaacData(hearingList, options);

    // Assert
    expect(result.hearings).toHaveLength(0);
    expect(result.header.listTitle).toBe("Special Immigration Appeals Commission Weekly Hearing List");
  });

  it("should use the provided listTitle from translations", () => {
    // Arrange
    const hearingList: SiacPoacPaacHearingList = [
      {
        date: "02/01/2025",
        time: "10:00am",
        appellant: "A Vs B",
        caseReferenceNumber: "SC/00001/2025",
        hearingType: "Substantive hearing",
        courtroom: "Court 1",
        additionalInformation: ""
      }
    ];

    const optionsWelsh = {
      locale: "cy",
      courtName: "Special Immigration Appeals Commission",
      contentDate: new Date(2025, 0, 2),
      lastReceivedDate: "2025-01-01T09:55:00Z",
      listTitle: "Special Immigration Appeals Commission Weekly Hearing List"
    };

    // Act
    const result = renderSiacPoacPaacData(hearingList, optionsWelsh);

    // Assert
    expect(result.header.listTitle).toBe("Special Immigration Appeals Commission Weekly Hearing List");
  });
});
