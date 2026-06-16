import { describe, expect, it } from "vitest";
import type { CicWeeklyHearingList } from "../models/types.js";
import { renderCicWeeklyHearingListData } from "./renderer.js";

describe("renderCicWeeklyHearingListData", () => {
  it("should render hearing list with formatted dates", () => {
    // Arrange
    const hearingList: CicWeeklyHearingList = [
      {
        date: "15/06/2026",
        hearingTime: "10:30am",
        caseReferenceNumber: "CIC/2026/001",
        caseName: "Smith v CICA",
        venuePlatform: "Video Hearing",
        judges: "Judge Williams",
        members: "Panel Member A, Panel Member B",
        additionalInformation: "Remote hearing via CVP"
      }
    ];

    const options = {
      locale: "en",
      courtName: "Criminal Injuries Compensation Tribunal",
      contentDate: new Date(2026, 5, 15),
      lastReceivedDate: "2026-06-15T10:00:00Z",
      listTitle: "Criminal Injuries Compensation Weekly Hearing List"
    };

    // Act
    const result = renderCicWeeklyHearingListData(hearingList, options);

    // Assert
    expect(result.header.listTitle).toBe("Criminal Injuries Compensation Weekly Hearing List");
    expect(result.header.weekCommencingDate).toBe("15 June 2026");
    expect(result.header.lastUpdatedDate).toBe("15 June 2026");
    expect(result.header.lastUpdatedTime).toContain("am");

    expect(result.hearings).toHaveLength(1);
    expect(result.hearings[0].date).toBe("15 June 2026");
    expect(result.hearings[0].hearingTime).toBe("10:30am");
    expect(result.hearings[0].caseReferenceNumber).toBe("CIC/2026/001");
    expect(result.hearings[0].caseName).toBe("Smith v CICA");
    expect(result.hearings[0].venuePlatform).toBe("Video Hearing");
    expect(result.hearings[0].judges).toBe("Judge Williams");
    expect(result.hearings[0].members).toBe("Panel Member A, Panel Member B");
    expect(result.hearings[0].additionalInformation).toBe("Remote hearing via CVP");
  });

  it("should render multiple hearings", () => {
    // Arrange
    const hearingList: CicWeeklyHearingList = [
      {
        date: "15/06/2026",
        hearingTime: "10:30am",
        caseReferenceNumber: "CIC/2026/001",
        caseName: "Smith v CICA",
        venuePlatform: "Video Hearing",
        judges: "Judge Williams",
        members: "Panel Member A",
        additionalInformation: "Remote hearing"
      },
      {
        date: "16/06/2026",
        hearingTime: "2:00pm",
        caseReferenceNumber: "CIC/2026/002",
        caseName: "Brown v CICA",
        venuePlatform: "Leicester Tribunal Centre",
        judges: "Judge Anderson",
        members: "Mr. Taylor",
        additionalInformation: ""
      }
    ];

    const options = {
      locale: "en",
      courtName: "Criminal Injuries Compensation Tribunal",
      contentDate: new Date(2026, 5, 15),
      lastReceivedDate: "2026-06-15T10:00:00Z",
      listTitle: "Criminal Injuries Compensation Weekly Hearing List"
    };

    // Act
    const result = renderCicWeeklyHearingListData(hearingList, options);

    // Assert
    expect(result.hearings).toHaveLength(2);
    expect(result.hearings[0].date).toBe("15 June 2026");
    expect(result.hearings[1].date).toBe("16 June 2026");
    expect(result.hearings[0].hearingTime).toBe("10:30am");
    expect(result.hearings[1].hearingTime).toBe("2:00pm");
  });

  it("should format date without leading zeros correctly (e.g., 01/06/2026 -> 1 June 2026)", () => {
    // Arrange
    const hearingList: CicWeeklyHearingList = [
      {
        date: "01/06/2026",
        hearingTime: "10:00am",
        caseReferenceNumber: "CIC/2026/001",
        caseName: "Test Case",
        venuePlatform: "Video Hearing",
        judges: "Judge Smith",
        members: "Member A",
        additionalInformation: ""
      }
    ];

    const options = {
      locale: "en",
      courtName: "Criminal Injuries Compensation Tribunal",
      contentDate: new Date(2026, 5, 1),
      lastReceivedDate: "2026-06-01T10:00:00Z",
      listTitle: "Criminal Injuries Compensation Weekly Hearing List"
    };

    // Act
    const result = renderCicWeeklyHearingListData(hearingList, options);

    // Assert
    expect(result.hearings[0].date).toBe("1 June 2026");
  });

  it("should format lastUpdated with time", () => {
    // Arrange
    const hearingList: CicWeeklyHearingList = [
      {
        date: "15/06/2026",
        hearingTime: "10:30am",
        caseReferenceNumber: "CIC/2026/001",
        caseName: "Smith v CICA",
        venuePlatform: "Video Hearing",
        judges: "Judge Williams",
        members: "Panel Member A",
        additionalInformation: ""
      }
    ];

    const options = {
      locale: "en",
      courtName: "Criminal Injuries Compensation Tribunal",
      contentDate: new Date(2026, 5, 15),
      lastReceivedDate: "2026-06-15T09:55:00Z",
      listTitle: "Criminal Injuries Compensation Weekly Hearing List"
    };

    // Act
    const result = renderCicWeeklyHearingListData(hearingList, options);

    // Assert
    expect(result.header.lastUpdatedTime).toBe("10:55am");
  });

  it("should format PM times correctly", () => {
    // Arrange
    const hearingList: CicWeeklyHearingList = [
      {
        date: "15/06/2026",
        hearingTime: "2:30pm",
        caseReferenceNumber: "CIC/2026/001",
        caseName: "Smith v CICA",
        venuePlatform: "Video Hearing",
        judges: "Judge Williams",
        members: "Panel Member A",
        additionalInformation: ""
      }
    ];

    const options = {
      locale: "en",
      courtName: "Criminal Injuries Compensation Tribunal",
      contentDate: new Date(2026, 5, 15),
      lastReceivedDate: "2026-06-15T14:30:00Z",
      listTitle: "Criminal Injuries Compensation Weekly Hearing List"
    };

    // Act
    const result = renderCicWeeklyHearingListData(hearingList, options);

    // Assert
    expect(result.header.lastUpdatedTime).toBe("3:30pm");
  });

  it("should handle empty hearing list", () => {
    // Arrange
    const hearingList: CicWeeklyHearingList = [];

    const options = {
      locale: "en",
      courtName: "Criminal Injuries Compensation Tribunal",
      contentDate: new Date(2026, 5, 15),
      lastReceivedDate: "2026-06-15T10:00:00Z",
      listTitle: "Criminal Injuries Compensation Weekly Hearing List"
    };

    // Act
    const result = renderCicWeeklyHearingListData(hearingList, options);

    // Assert
    expect(result.hearings).toHaveLength(0);
    expect(result.header.listTitle).toBe("Criminal Injuries Compensation Weekly Hearing List");
  });

  it("should use the provided listTitle from translations", () => {
    // Arrange
    const hearingList: CicWeeklyHearingList = [
      {
        date: "15/06/2026",
        hearingTime: "10:30am",
        caseReferenceNumber: "CIC/2026/001",
        caseName: "Smith v CICA",
        venuePlatform: "Video Hearing",
        judges: "Judge Williams",
        members: "Panel Member A",
        additionalInformation: ""
      }
    ];

    const optionsWelsh = {
      locale: "cy",
      courtName: "Tribiwnlys Iawndal am Anafiadau Troseddol",
      contentDate: new Date(2026, 5, 15),
      lastReceivedDate: "2026-06-15T10:00:00Z",
      listTitle: "Rhestr Gwrandawiadau Wythnosol y Tribiwnlys Digolledu am Anafiadau Troseddol"
    };

    // Act
    const result = renderCicWeeklyHearingListData(hearingList, optionsWelsh);

    // Assert
    expect(result.header.listTitle).toBe("Rhestr Gwrandawiadau Wythnosol y Tribiwnlys Digolledu am Anafiadau Troseddol");
  });

  it("should preserve all hearing fields without modification", () => {
    // Arrange
    const hearingList: CicWeeklyHearingList = [
      {
        date: "15/06/2026",
        hearingTime: "10:30am",
        caseReferenceNumber: "CIC/2026/12345",
        caseName: "Case With Special Characters: A vs B & C",
        venuePlatform: "Video Hearing - Teams",
        judges: "Judge Williams, Judge Roberts",
        members: "Dr. Smith, Ms. Jones, Mr. Taylor",
        additionalInformation: "Interpreter required; contact tribunal@justice.gov.uk"
      }
    ];

    const options = {
      locale: "en",
      courtName: "Criminal Injuries Compensation Tribunal",
      contentDate: new Date(2026, 5, 15),
      lastReceivedDate: "2026-06-15T10:00:00Z",
      listTitle: "Criminal Injuries Compensation Weekly Hearing List"
    };

    // Act
    const result = renderCicWeeklyHearingListData(hearingList, options);

    // Assert
    expect(result.hearings[0].caseReferenceNumber).toBe("CIC/2026/12345");
    expect(result.hearings[0].caseName).toBe("Case With Special Characters: A vs B & C");
    expect(result.hearings[0].venuePlatform).toBe("Video Hearing - Teams");
    expect(result.hearings[0].judges).toBe("Judge Williams, Judge Roberts");
    expect(result.hearings[0].members).toBe("Dr. Smith, Ms. Jones, Mr. Taylor");
    expect(result.hearings[0].additionalInformation).toBe("Interpreter required; contact tribunal@justice.gov.uk");
  });

  it("should handle empty strings in hearing fields", () => {
    // Arrange
    const hearingList: CicWeeklyHearingList = [
      {
        date: "15/06/2026",
        hearingTime: "10:30am",
        caseReferenceNumber: "",
        caseName: "",
        venuePlatform: "",
        judges: "",
        members: "",
        additionalInformation: ""
      }
    ];

    const options = {
      locale: "en",
      courtName: "Criminal Injuries Compensation Tribunal",
      contentDate: new Date(2026, 5, 15),
      lastReceivedDate: "2026-06-15T10:00:00Z",
      listTitle: "Criminal Injuries Compensation Weekly Hearing List"
    };

    // Act
    const result = renderCicWeeklyHearingListData(hearingList, options);

    // Assert
    expect(result.hearings).toHaveLength(1);
    expect(result.hearings[0].caseReferenceNumber).toBe("");
    expect(result.hearings[0].caseName).toBe("");
    expect(result.hearings[0].venuePlatform).toBe("");
    expect(result.hearings[0].judges).toBe("");
    expect(result.hearings[0].members).toBe("");
    expect(result.hearings[0].additionalInformation).toBe("");
  });

  it("should format weekCommencingDate correctly", () => {
    // Arrange
    const hearingList: CicWeeklyHearingList = [];

    const options = {
      locale: "en",
      courtName: "Criminal Injuries Compensation Tribunal",
      contentDate: new Date(2026, 11, 25),
      lastReceivedDate: "2026-12-25T10:00:00Z",
      listTitle: "Criminal Injuries Compensation Weekly Hearing List"
    };

    // Act
    const result = renderCicWeeklyHearingListData(hearingList, options);

    // Assert
    expect(result.header.weekCommencingDate).toBe("25 December 2026");
  });
});
