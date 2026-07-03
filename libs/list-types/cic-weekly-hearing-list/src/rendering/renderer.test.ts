import { describe, expect, it } from "vitest";
import type { CicWeeklyHearingList } from "../models/types.js";
import { renderCicWeeklyHearingListData } from "./renderer.js";

describe("renderCicWeeklyHearingListData", () => {
  it("should render hearing list with header and hearings", () => {
    const hearingList: CicWeeklyHearingList = [
      {
        date: "02/01/2025",
        hearingTime: "10am",
        caseReferenceNumber: "CIC/2025/001",
        caseName: "Smith v CICA",
        "venue/platform": "Remote",
        judges: "Judge Smith",
        members: "Member A",
        additionalInformation: "Video hearing"
      }
    ];

    const options = {
      locale: "en",
      contentDate: new Date(2025, 0, 6),
      lastReceivedDate: "2025-01-01T09:55:00Z",
      listTitle: "Criminal Injuries Compensation Weekly Hearing List"
    };

    const result = renderCicWeeklyHearingListData(hearingList, options);

    expect(result.header.listTitle).toBe("Criminal Injuries Compensation Weekly Hearing List");
    expect(result.header.weekCommencingDate).toBe("06 January 2025");
    expect(result.header.lastUpdatedDate).toBe("01 January 2025");
    expect(result.header.lastUpdatedTime).toContain("am");
    expect(result.hearings).toHaveLength(1);
    expect(result.hearings[0].date).toBe("02 January 2025");
    expect(result.hearings[0].hearingTime).toBe("10am");
    expect(result.hearings[0].caseReferenceNumber).toBe("CIC/2025/001");
    expect(result.hearings[0].caseName).toBe("Smith v CICA");
    expect(result.hearings[0].venuePlatform).toBe("Remote");
    expect(result.hearings[0].judges).toBe("Judge Smith");
    expect(result.hearings[0].members).toBe("Member A");
    expect(result.hearings[0].additionalInformation).toBe("Video hearing");
  });

  it("should handle empty hearing list", () => {
    const hearingList: CicWeeklyHearingList = [];
    const options = {
      locale: "en",
      contentDate: new Date(2025, 0, 6),
      lastReceivedDate: "2025-01-01T09:55:00Z",
      listTitle: "CIC Weekly Hearing List"
    };

    const result = renderCicWeeklyHearingListData(hearingList, options);

    expect(result.hearings).toHaveLength(0);
    expect(result.header.listTitle).toBe("CIC Weekly Hearing List");
  });

  it("should use Welsh locale", () => {
    const hearingList: CicWeeklyHearingList = [];
    const options = {
      locale: "cy",
      contentDate: new Date(2025, 0, 6),
      lastReceivedDate: "2025-01-01T09:55:00Z",
      listTitle: "Rhestr Gwrandawiadau Wythnosol yr Iawndal am Anafiadau Troseddol"
    };

    const result = renderCicWeeklyHearingListData(hearingList, options);

    expect(result.header.listTitle).toBe("Rhestr Gwrandawiadau Wythnosol yr Iawndal am Anafiadau Troseddol");
  });

  it("should format PM times correctly", () => {
    const hearingList: CicWeeklyHearingList = [];
    const options = {
      locale: "en",
      contentDate: new Date(2025, 0, 6),
      lastReceivedDate: "2025-01-01T14:30:00Z",
      listTitle: "CIC Weekly Hearing List"
    };

    const result = renderCicWeeklyHearingListData(hearingList, options);

    expect(result.header.lastUpdatedTime).toBe("2:30pm");
  });

  it("should map venue/platform to venuePlatform", () => {
    const hearingList: CicWeeklyHearingList = [
      {
        date: "02/01/2025",
        hearingTime: "10am",
        caseReferenceNumber: "CIC/2025/001",
        caseName: "Test v CICA",
        "venue/platform": "London Tribunal Centre",
        judges: "Judge Test",
        members: "",
        additionalInformation: ""
      }
    ];

    const options = {
      locale: "en",
      contentDate: new Date(2025, 0, 6),
      lastReceivedDate: "2025-01-01T09:55:00Z",
      listTitle: "CIC Weekly Hearing List"
    };

    const result = renderCicWeeklyHearingListData(hearingList, options);

    expect(result.hearings[0].venuePlatform).toBe("London Tribunal Centre");
  });
});
