import { describe, expect, it } from "vitest";
import type { PhtHearingList } from "../models/types.js";
import { renderPhtData } from "./renderer.js";

describe("renderPhtData", () => {
  it("should render hearing list with formatted dates", () => {
    const hearingList: PhtHearingList = [
      {
        date: "02/01/2025",
        caseName: "A Vs B",
        hearingLength: "1 hour",
        hearingType: "Substantive hearing",
        venue: "Primary Health Tribunal",
        additionalInformation: "Remote hearing"
      }
    ];

    const options = {
      locale: "en",
      courtName: "Primary Health Tribunal",
      contentDate: new Date(2025, 0, 2),
      lastReceivedDate: "2025-01-01T09:55:00Z",
      listTitle: "Primary Health Tribunal Weekly Hearing List"
    };

    const result = renderPhtData(hearingList, options);

    expect(result.header.listTitle).toBe("Primary Health Tribunal Weekly Hearing List");
    expect(result.header.weekCommencingDate).toBe("2 January 2025");
    expect(result.header.lastUpdatedDate).toBe("1 January 2025");
    expect(result.header.lastUpdatedTime).toContain("am");

    expect(result.hearings).toHaveLength(1);
    expect(result.hearings[0].date).toBe("02 January 2025");
    expect(result.hearings[0].caseName).toBe("A Vs B");
    expect(result.hearings[0].hearingLength).toBe("1 hour");
    expect(result.hearings[0].hearingType).toBe("Substantive hearing");
    expect(result.hearings[0].venue).toBe("Primary Health Tribunal");
    expect(result.hearings[0].additionalInformation).toBe("Remote hearing");
  });

  it("should render multiple hearings", () => {
    const hearingList: PhtHearingList = [
      {
        date: "02/01/2025",
        caseName: "A Vs B",
        hearingLength: "1 hour",
        hearingType: "Substantive hearing",
        venue: "Primary Health Tribunal",
        additionalInformation: "Remote hearing"
      },
      {
        date: "03/01/2025",
        caseName: "C Vs D",
        hearingLength: "Half day",
        hearingType: "Preliminary hearing",
        venue: "Health Tribunal Office",
        additionalInformation: "In person"
      }
    ];

    const options = {
      locale: "en",
      courtName: "Primary Health Tribunal",
      contentDate: new Date(2025, 0, 2),
      lastReceivedDate: "2025-01-01T09:55:00Z",
      listTitle: "Primary Health Tribunal Weekly Hearing List"
    };

    const result = renderPhtData(hearingList, options);

    expect(result.hearings).toHaveLength(2);
    expect(result.hearings[0].date).toBe("02 January 2025");
    expect(result.hearings[1].date).toBe("03 January 2025");
  });

  it("should format lastUpdated with time", () => {
    const hearingList: PhtHearingList = [
      {
        date: "02/01/2025",
        caseName: "A Vs B",
        hearingLength: "1 hour",
        hearingType: "Substantive hearing",
        venue: "Primary Health Tribunal",
        additionalInformation: "Remote hearing"
      }
    ];

    const options = {
      locale: "en",
      courtName: "Primary Health Tribunal",
      contentDate: new Date(2025, 0, 2),
      lastReceivedDate: "2025-01-01T09:55:00Z",
      listTitle: "Primary Health Tribunal Weekly Hearing List"
    };

    const result = renderPhtData(hearingList, options);

    expect(result.header.lastUpdatedTime).toBe("9:55am");
  });

  it("should format PM times correctly", () => {
    const hearingList: PhtHearingList = [
      {
        date: "02/01/2025",
        caseName: "A Vs B",
        hearingLength: "1 hour",
        hearingType: "Substantive hearing",
        venue: "Primary Health Tribunal",
        additionalInformation: "Remote hearing"
      }
    ];

    const options = {
      locale: "en",
      courtName: "Primary Health Tribunal",
      contentDate: new Date(2025, 0, 2),
      lastReceivedDate: "2025-01-01T14:30:00Z",
      listTitle: "Primary Health Tribunal Weekly Hearing List"
    };

    const result = renderPhtData(hearingList, options);

    expect(result.header.lastUpdatedTime).toBe("2:30pm");
  });

  it("should handle empty hearing list", () => {
    const hearingList: PhtHearingList = [];

    const options = {
      locale: "en",
      courtName: "Primary Health Tribunal",
      contentDate: new Date(2025, 0, 2),
      lastReceivedDate: "2025-01-01T09:55:00Z",
      listTitle: "Primary Health Tribunal Weekly Hearing List"
    };

    const result = renderPhtData(hearingList, options);

    expect(result.hearings).toHaveLength(0);
    expect(result.header.listTitle).toBe("Primary Health Tribunal Weekly Hearing List");
  });

  it("should use the provided Welsh listTitle", () => {
    const hearingList: PhtHearingList = [
      {
        date: "02/01/2025",
        caseName: "A Vs B",
        hearingLength: "1 hour",
        hearingType: "Substantive hearing",
        venue: "Primary Health Tribunal",
        additionalInformation: "Remote hearing"
      }
    ];

    const options = {
      locale: "cy",
      courtName: "Primary Health Tribunal",
      contentDate: new Date(2025, 0, 2),
      lastReceivedDate: "2025-01-01T09:55:00Z",
      listTitle: "Rhestr Gwrandawiadau Wythnosol y Tribiwnlys Iechyd Sylfaenol"
    };

    const result = renderPhtData(hearingList, options);

    expect(result.header.listTitle).toBe("Rhestr Gwrandawiadau Wythnosol y Tribiwnlys Iechyd Sylfaenol");
  });

  it("should preserve all hearing fields without modification", () => {
    const hearingList: PhtHearingList = [
      {
        date: "02/01/2025",
        caseName: "Case With Special Characters: A vs B & C",
        hearingLength: "2 hours 30 minutes",
        hearingType: "Final hearing - substantive",
        venue: "Primary Health Tribunal - London Office",
        additionalInformation: "Remote hearing via video link; contact primaryhealthlists@justice.gov.uk"
      }
    ];

    const options = {
      locale: "en",
      courtName: "Primary Health Tribunal",
      contentDate: new Date(2025, 0, 2),
      lastReceivedDate: "2025-01-01T09:55:00Z",
      listTitle: "Primary Health Tribunal Weekly Hearing List"
    };

    const result = renderPhtData(hearingList, options);

    expect(result.hearings[0].caseName).toBe("Case With Special Characters: A vs B & C");
    expect(result.hearings[0].hearingLength).toBe("2 hours 30 minutes");
    expect(result.hearings[0].hearingType).toBe("Final hearing - substantive");
    expect(result.hearings[0].venue).toBe("Primary Health Tribunal - London Office");
    expect(result.hearings[0].additionalInformation).toBe("Remote hearing via video link; contact primaryhealthlists@justice.gov.uk");
  });
});
