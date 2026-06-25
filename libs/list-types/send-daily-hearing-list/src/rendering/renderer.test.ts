import { describe, expect, it } from "vitest";
import type { SendDailyHearingList } from "../models/types.js";
import { renderSendDailyHearingListData } from "./renderer.js";

describe("renderSendDailyHearingListData", () => {
  it("should render hearing list with header and hearings", () => {
    const hearingList: SendDailyHearingList = [
      {
        time: "10am",
        caseReferenceNumber: "SEND/2025/001",
        respondent: "Local Authority",
        hearingType: "Final",
        venue: "Remote",
        timeEstimate: "2 hours"
      }
    ];

    const options = {
      locale: "en",
      contentDate: new Date("2025-06-20"),
      lastReceivedDate: "2025-01-01T09:55:00Z",
      listTitle: "First-tier Tribunal (Special Educational Needs and Disability) Daily Hearing List"
    };

    const result = renderSendDailyHearingListData(hearingList, options);

    expect(result.header.listTitle).toBe("First-tier Tribunal (Special Educational Needs and Disability) Daily Hearing List");
    expect(result.header.listForDate).toBe("20 June 2025");
    expect(result.header.lastUpdatedDate).toBe("1 January 2025");
    expect(result.header.lastUpdatedTime).toContain("am");
    expect(result.hearings).toHaveLength(1);
    expect(result.hearings[0].time).toBe("10am");
    expect(result.hearings[0].caseReferenceNumber).toBe("SEND/2025/001");
    expect(result.hearings[0].respondent).toBe("Local Authority");
    expect(result.hearings[0].hearingType).toBe("Final");
    expect(result.hearings[0].venue).toBe("Remote");
    expect(result.hearings[0].timeEstimate).toBe("2 hours");
  });

  it("should handle empty hearing list", () => {
    const hearingList: SendDailyHearingList = [];
    const options = {
      locale: "en",
      contentDate: new Date("2025-06-20"),
      lastReceivedDate: "2025-01-01T09:55:00Z",
      listTitle: "SEND Daily Hearing List"
    };

    const result = renderSendDailyHearingListData(hearingList, options);

    expect(result.hearings).toHaveLength(0);
    expect(result.header.listTitle).toBe("SEND Daily Hearing List");
  });

  it("should use Welsh locale", () => {
    const hearingList: SendDailyHearingList = [];
    const options = {
      locale: "cy",
      contentDate: new Date("2025-06-20"),
      lastReceivedDate: "2025-01-01T09:55:00Z",
      listTitle: "Rhestr Gwrandawiadau Dyddiol SEND"
    };

    const result = renderSendDailyHearingListData(hearingList, options);

    expect(result.header.listTitle).toBe("Rhestr Gwrandawiadau Dyddiol SEND");
  });

  it("should format PM times correctly", () => {
    const hearingList: SendDailyHearingList = [];
    const options = {
      locale: "en",
      contentDate: new Date("2025-06-20"),
      lastReceivedDate: "2025-01-01T14:30:00Z",
      listTitle: "SEND Daily Hearing List"
    };

    const result = renderSendDailyHearingListData(hearingList, options);

    expect(result.header.lastUpdatedTime).toBe("2:30pm");
  });
});
