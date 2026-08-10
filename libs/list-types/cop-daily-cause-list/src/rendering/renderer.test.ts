import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CauseListData, RenderOptions } from "../models/types.js";

const { mockRenderCommon } = vi.hoisted(() => ({
  mockRenderCommon: vi.fn()
}));

vi.mock("@hmcts/daily-cause-list-common", () => ({
  renderCauseListData: mockRenderCommon
}));

import { renderCauseListData } from "./renderer.js";

const RENDER_OPTIONS: RenderOptions = {
  locationId: "1",
  contentDate: new Date("2025-01-01"),
  locale: "en"
};

function buildData(caseOverrides: Record<string, unknown> = {}): CauseListData {
  return {
    document: { publicationDate: "2025-01-01T10:00:00.000Z" },
    venue: {
      venueName: "Test Court",
      venueAddress: { line: ["Line 1"], postCode: "AB1 2CD" },
      venueContact: { venueEmail: "test@example.com", venueTelephone: "01234567890" }
    },
    courtLists: [
      {
        courtHouse: {
          courtHouseName: "Test Court House",
          courtRoom: [
            {
              courtRoomName: "Room 1",
              session: [
                {
                  sittings: [
                    {
                      sittingStart: "2025-01-01T09:00:00.000Z",
                      sittingEnd: "2025-01-01T10:00:00.000Z",
                      hearing: [{ hearingType: "COP", case: [{ caseNumber: "12345", caseName: "Re X", ...caseOverrides }] }]
                    }
                  ]
                }
              ]
            }
          ]
        }
      }
    ]
  };
}

function buildDataWithLocation(locationDetails: Record<string, unknown>): CauseListData {
  return { ...buildData(), locationDetails } as CauseListData;
}

describe("renderCauseListData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRenderCommon.mockResolvedValue({
      header: { locationName: "Regional COP Court" },
      openJustice: { venueName: "Region Venue", email: "a@b.com", phone: "01234" },
      listData: {}
    });
  });

  it("should delegate to the shared renderer with the same render options", async () => {
    const data = buildData();

    await renderCauseListData(data, RENDER_OPTIONS);

    expect(mockRenderCommon).toHaveBeenCalledWith(expect.any(Object), RENDER_OPTIONS);
  });

  it("should set the court name from the shared renderer location name", async () => {
    const result = await renderCauseListData(buildData(), RENDER_OPTIONS);

    expect(result.header.courtName).toBe("Regional COP Court");
  });

  it("should set the open justice venue name to the court name, not the region venue", async () => {
    const result = await renderCauseListData(buildData(), RENDER_OPTIONS);

    expect(result.openJustice.venueName).toBe("Regional COP Court");
    expect(result.openJustice.email).toBe("a@b.com");
    expect(result.openJustice.phone).toBe("01234");
  });

  it("should expose the region name from locationDetails", async () => {
    const data = buildDataWithLocation({ region: { name: "North" } });

    const result = await renderCauseListData(data, RENDER_OPTIONS);

    expect(result.header.region).toBe("North");
  });

  it("should join multiple regional judiciary names into a comma-separated string", async () => {
    const data = buildDataWithLocation({
      region: { name: "North", regionalJOH: [{ johKnownAs: "Judge A" }, { johKnownAs: "Judge B" }] }
    });

    const result = await renderCauseListData(data, RENDER_OPTIONS);

    expect(result.header.regionalJoh).toBe("Judge A, Judge B");
  });

  it("should default region and regionalJoh to empty strings when locationDetails is missing", async () => {
    const result = await renderCauseListData(buildData(), RENDER_OPTIONS);

    expect(result.header.region).toBe("");
    expect(result.header.regionalJoh).toBe("");
  });

  it("should map the COP reportingRestrictions string onto reportingRestrictionDetail", async () => {
    const data = buildData({ reportingRestrictions: "Section 11 applies" });

    await renderCauseListData(data, RENDER_OPTIONS);

    const passed = mockRenderCommon.mock.calls[0][0] as CauseListData;
    const caseItem = passed.courtLists[0].courtHouse.courtRoom[0].session[0].sittings[0].hearing[0].case[0];
    expect(caseItem.reportingRestrictionDetail).toEqual(["Section 11 applies"]);
  });

  it("should not overwrite an existing reportingRestrictionDetail array", async () => {
    const data = buildData({ reportingRestrictions: "Should be ignored", reportingRestrictionDetail: ["Existing"] });

    await renderCauseListData(data, RENDER_OPTIONS);

    const passed = mockRenderCommon.mock.calls[0][0] as CauseListData;
    const caseItem = passed.courtLists[0].courtHouse.courtRoom[0].session[0].sittings[0].hearing[0].case[0];
    expect(caseItem.reportingRestrictionDetail).toEqual(["Existing"]);
  });

  it("should leave cases without reporting restrictions untouched", async () => {
    const data = buildData();

    await renderCauseListData(data, RENDER_OPTIONS);

    const passed = mockRenderCommon.mock.calls[0][0] as CauseListData;
    const caseItem = passed.courtLists[0].courtHouse.courtRoom[0].session[0].sittings[0].hearing[0].case[0];
    expect(caseItem.reportingRestrictionDetail).toBeUndefined();
  });
});
