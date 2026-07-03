import { describe, expect, it, vi } from "vitest";
import { renderSscsDailyHearingListData } from "./renderer.js";

vi.mock("@hmcts/list-types-common", () => ({
  formatDisplayDate: vi.fn((_date: Date) => "1 January 2026"),
  formatLastUpdatedDateTime: vi.fn(() => ({ date: "1 January 2026", time: "10:00am" }))
}));

describe("renderSscsDailyHearingListData", () => {
  const sampleHearings = [
    {
      venue: "Manchester Tribunal Centre",
      appealReferenceNumber: "SC/123/2025",
      hearingType: "Oral Hearing",
      appellant: "Smith, John",
      courtroom: "Room 1",
      hearingTime: "10:00am",
      tribunal: "SSCS",
      respondent: "Secretary of State for Work and Pensions",
      additionalInformation: "Video hearing"
    }
  ];

  const options = {
    locale: "en",
    courtName: "London Social Security and Child Support Tribunal",
    contentDate: new Date("2026-01-01"),
    lastReceivedDate: "2026-01-01T10:00:00Z",
    listTitle: "London Social Security and Child Support Tribunal Daily Hearing List"
  };

  it("should return correct header with formatted dates", () => {
    const result = renderSscsDailyHearingListData(sampleHearings, options);

    expect(result.header.listTitle).toBe("London Social Security and Child Support Tribunal Daily Hearing List");
    expect(result.header.listDate).toBe("1 January 2026");
    expect(result.header.lastUpdatedDate).toBe("1 January 2026");
    expect(result.header.lastUpdatedTime).toBe("10:00am");
  });

  it("should return the hearings unchanged", () => {
    const result = renderSscsDailyHearingListData(sampleHearings, options);

    expect(result.hearings).toHaveLength(1);
    expect(result.hearings[0].venue).toBe("Manchester Tribunal Centre");
    expect(result.hearings[0].appealReferenceNumber).toBe("SC/123/2025");
    expect(result.hearings[0].hearingType).toBe("Oral Hearing");
    expect(result.hearings[0].appellant).toBe("Smith, John");
    expect(result.hearings[0].courtroom).toBe("Room 1");
    expect(result.hearings[0].hearingTime).toBe("10:00am");
    expect(result.hearings[0].tribunal).toBe("SSCS");
    expect(result.hearings[0].respondent).toBe("Secretary of State for Work and Pensions");
    expect(result.hearings[0].additionalInformation).toBe("Video hearing");
  });

  it("should handle an empty hearing list", () => {
    const result = renderSscsDailyHearingListData([], options);

    expect(result.hearings).toHaveLength(0);
    expect(result.header.listTitle).toBe("London Social Security and Child Support Tribunal Daily Hearing List");
  });

  it("should handle Welsh locale", () => {
    const welshOptions = { ...options, locale: "cy" };
    const result = renderSscsDailyHearingListData(sampleHearings, welshOptions);

    expect(result.hearings).toHaveLength(1);
    expect(result.header.listTitle).toBe("London Social Security and Child Support Tribunal Daily Hearing List");
  });
});
