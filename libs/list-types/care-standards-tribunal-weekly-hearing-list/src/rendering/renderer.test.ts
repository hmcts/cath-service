import { describe, expect, it } from "vitest";
import type { CareStandardsTribunalHearingList } from "../models/types.js";
import { renderCareStandardsTribunalData } from "./renderer.js";

describe("renderCareStandardsTribunalData", () => {
  it("should render hearing list with formatted dates", () => {
    const hearingList: CareStandardsTribunalHearingList = [
      {
        date: "02/01/2025",
        caseName: "A Vs B",
        hearingLength: "1 hour",
        hearingType: "Substantive hearing",
        venue: "Care Standards Tribunal",
        additionalInformation: "Remote hearing"
      }
    ];

    const options = {
      locale: "en",
      courtName: "Care Standards Tribunal",
      displayFrom: new Date(2025, 0, 2),
      displayTo: new Date(2025, 0, 8),
      lastReceivedDate: "2025-01-01T09:55:00Z",
      listTitle: "Care Standards Tribunal Weekly Hearing List"
    };

    const result = renderCareStandardsTribunalData(hearingList, options);

    expect(result.header.listTitle).toBe("Care Standards Tribunal Weekly Hearing List");
    expect(result.header.weekCommencingDate).toBe("2 January 2025");
    expect(result.header.lastUpdatedDate).toBe("1 January 2025");
    expect(result.header.lastUpdatedTime).toContain("am");

    expect(result.hearings).toHaveLength(1);
    expect(result.hearings[0].date).toBe("2 January 2025");
    expect(result.hearings[0].caseName).toBe("A Vs B");
    expect(result.hearings[0].hearingLength).toBe("1 hour");
    expect(result.hearings[0].hearingType).toBe("Substantive hearing");
    expect(result.hearings[0].venue).toBe("Care Standards Tribunal");
    expect(result.hearings[0].additionalInformation).toBe("Remote hearing");
  });

  it("should render multiple hearings", () => {
    const hearingList: CareStandardsTribunalHearingList = [
      {
        date: "02/01/2025",
        caseName: "A Vs B",
        hearingLength: "1 hour",
        hearingType: "Substantive hearing",
        venue: "Care Standards Tribunal",
        additionalInformation: "Remote hearing"
      },
      {
        date: "03/01/2025",
        caseName: "C Vs D",
        hearingLength: "Half day",
        hearingType: "Preliminary hearing",
        venue: "Care Standards Office",
        additionalInformation: "In person"
      }
    ];

    const options = {
      locale: "en",
      courtName: "Care Standards Tribunal",
      displayFrom: new Date(2025, 0, 2),
      displayTo: new Date(2025, 0, 8),
      lastReceivedDate: "2025-01-01T09:55:00Z",
      listTitle: "Care Standards Tribunal Weekly Hearing List"
    };

    const result = renderCareStandardsTribunalData(hearingList, options);

    expect(result.hearings).toHaveLength(2);
    expect(result.hearings[0].date).toBe("2 January 2025");
    expect(result.hearings[1].date).toBe("3 January 2025");
  });

  it("should format date without leading zeros correctly (e.g., 01/01/2025 -> 1 January 2025)", () => {
    const hearingList: CareStandardsTribunalHearingList = [
      {
        date: "01/01/2025",
        caseName: "A Vs B",
        hearingLength: "1 hour",
        hearingType: "Substantive hearing",
        venue: "Care Standards Tribunal",
        additionalInformation: "Remote hearing"
      }
    ];

    const options = {
      locale: "en",
      courtName: "Care Standards Tribunal",
      displayFrom: new Date(2025, 0, 1),
      displayTo: new Date(2025, 0, 7),
      lastReceivedDate: "2025-01-01T09:55:00Z",
      listTitle: "Care Standards Tribunal Weekly Hearing List"
    };

    const result = renderCareStandardsTribunalData(hearingList, options);

    expect(result.hearings[0].date).toBe("1 January 2025");
  });

  it("should format lastUpdated with time", () => {
    const hearingList: CareStandardsTribunalHearingList = [
      {
        date: "02/01/2025",
        caseName: "A Vs B",
        hearingLength: "1 hour",
        hearingType: "Substantive hearing",
        venue: "Care Standards Tribunal",
        additionalInformation: "Remote hearing"
      }
    ];

    const options = {
      locale: "en",
      courtName: "Care Standards Tribunal",
      displayFrom: new Date(2025, 0, 2),
      displayTo: new Date(2025, 0, 8),
      lastReceivedDate: "2025-01-01T09:55:00Z",
      listTitle: "Care Standards Tribunal Weekly Hearing List"
    };

    const result = renderCareStandardsTribunalData(hearingList, options);

    expect(result.header.lastUpdatedTime).toBe("9:55am");
  });

  it("should format PM times correctly", () => {
    const hearingList: CareStandardsTribunalHearingList = [
      {
        date: "02/01/2025",
        caseName: "A Vs B",
        hearingLength: "1 hour",
        hearingType: "Substantive hearing",
        venue: "Care Standards Tribunal",
        additionalInformation: "Remote hearing"
      }
    ];

    const options = {
      locale: "en",
      courtName: "Care Standards Tribunal",
      displayFrom: new Date(2025, 0, 2),
      displayTo: new Date(2025, 0, 8),
      lastReceivedDate: "2025-01-01T14:30:00Z",
      listTitle: "Care Standards Tribunal Weekly Hearing List"
    };

    const result = renderCareStandardsTribunalData(hearingList, options);

    expect(result.header.lastUpdatedTime).toBe("2:30pm");
  });

  it("should handle empty hearing list", () => {
    const hearingList: CareStandardsTribunalHearingList = [];

    const options = {
      locale: "en",
      courtName: "Care Standards Tribunal",
      displayFrom: new Date(2025, 0, 2),
      displayTo: new Date(2025, 0, 8),
      lastReceivedDate: "2025-01-01T09:55:00Z",
      listTitle: "Care Standards Tribunal Weekly Hearing List"
    };

    const result = renderCareStandardsTribunalData(hearingList, options);

    expect(result.hearings).toHaveLength(0);
    expect(result.header.listTitle).toBe("Care Standards Tribunal Weekly Hearing List");
  });

  it("should use the provided listTitle from translations", () => {
    const hearingList: CareStandardsTribunalHearingList = [
      {
        date: "02/01/2025",
        caseName: "A Vs B",
        hearingLength: "1 hour",
        hearingType: "Substantive hearing",
        venue: "Care Standards Tribunal",
        additionalInformation: "Remote hearing"
      }
    ];

    const optionsWelsh = {
      locale: "cy",
      courtName: "Care Standards Tribunal",
      displayFrom: new Date(2025, 0, 2),
      displayTo: new Date(2025, 0, 8),
      lastReceivedDate: "2025-01-01T09:55:00Z",
      listTitle: "Rhestr Gwrandawiadau Wythnosol y Tribiwnlys Safonau Gofal"
    };

    const result = renderCareStandardsTribunalData(hearingList, optionsWelsh);

    expect(result.header.listTitle).toBe("Rhestr Gwrandawiadau Wythnosol y Tribiwnlys Safonau Gofal");
  });

  it("should preserve all hearing fields without modification", () => {
    const hearingList: CareStandardsTribunalHearingList = [
      {
        date: "02/01/2025",
        caseName: "Case With Special Characters: A vs B & C",
        hearingLength: "2 hours 30 minutes",
        hearingType: "Final hearing - substantive",
        venue: "Care Standards Tribunal - London Office",
        additionalInformation: "Remote hearing via video link; contact cst@justice.gov.uk"
      }
    ];

    const options = {
      locale: "en",
      courtName: "Care Standards Tribunal",
      displayFrom: new Date(2025, 0, 2),
      displayTo: new Date(2025, 0, 8),
      lastReceivedDate: "2025-01-01T09:55:00Z",
      listTitle: "Care Standards Tribunal Weekly Hearing List"
    };

    const result = renderCareStandardsTribunalData(hearingList, options);

    expect(result.hearings[0].caseName).toBe("Case With Special Characters: A vs B & C");
    expect(result.hearings[0].hearingLength).toBe("2 hours 30 minutes");
    expect(result.hearings[0].hearingType).toBe("Final hearing - substantive");
    expect(result.hearings[0].venue).toBe("Care Standards Tribunal - London Office");
    expect(result.hearings[0].additionalInformation).toBe("Remote hearing via video link; contact cst@justice.gov.uk");
  });
});
