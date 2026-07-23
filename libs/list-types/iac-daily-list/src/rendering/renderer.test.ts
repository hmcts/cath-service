import { describe, expect, it } from "vitest";
import type { IacCourtList, IacDailyList, IacRenderOptions } from "../models/types.js";
import { renderIacDailyList } from "./renderer.js";

const OPTIONS: IacRenderOptions = {
  locale: "en",
  listTypeName: "IAC_DAILY_LIST",
  listTitle: "Immigration and Asylum Chamber Daily List",
  contentDate: new Date("2026-01-15T00:00:00Z"),
  lastReceivedDate: "2026-01-14T12:00:00Z"
};

function buildCourtList(overrides: Partial<IacCourtList> = {}): IacCourtList {
  return {
    courtListName: "Substantive List",
    courtHouse: {
      courtRoom: [
        {
          courtRoomName: "Court 1",
          session: [
            {
              sessionChannel: ["VIDEO HEARING"],
              judiciary: [{ johTitle: "Judge", johNameSurname: "Smith", isPresiding: false }],
              sittings: [
                {
                  sittingStart: "2026-01-15T09:30:00Z",
                  sittingEnd: "2026-01-15T12:30:00Z",
                  hearing: [
                    {
                      hearingType: "Substantive",
                      case: [
                        {
                          caseNumber: "45684548",
                          language: "English",
                          party: [
                            { partyRole: "APPELLANT", individualDetails: { individualForenames: "John", individualSurname: "Doe" } },
                            { partyRole: "RESPONDENT", organisationDetails: { organisationName: "Home Office" } },
                            {
                              partyRole: "APPELLANT_REPRESENTATIVE",
                              individualDetails: { individualForenames: "Jane", individualSurname: "Rep" }
                            }
                          ]
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    },
    ...overrides
  };
}

function buildList(courtLists: IacCourtList[]): IacDailyList {
  return {
    document: { publicationDate: "2026-01-14T12:00:00Z" },
    venue: { venueName: "Manchester" },
    courtLists
  };
}

describe("renderIacDailyList", () => {
  it("should populate the header from the venue and options", () => {
    const result = renderIacDailyList(buildList([buildCourtList()]), OPTIONS);

    expect(result.header.listTitle).toBe(OPTIONS.listTitle);
    expect(result.header.venueName).toBe("Manchester");
    expect(result.header.contentDate).toContain("2026");
    expect(result.header.lastUpdatedDate).toContain("2026");
    expect(result.header.lastUpdatedTime).toBeTruthy();
  });

  it("should map court rooms and sessions into rendered sessions", () => {
    const result = renderIacDailyList(buildList([buildCourtList()]), OPTIONS);

    expect(result.hearings.courtLists).toHaveLength(1);
    expect(result.hearings.courtLists[0].courtListName).toBe("Substantive List");
    expect(result.hearings.courtLists[0].session).toHaveLength(1);
    expect(result.hearings.courtLists[0].session[0].courtRoomName).toBe("Court 1");
  });

  it("should split parties into appellant, representative and prosecuting authority", () => {
    const result = renderIacDailyList(buildList([buildCourtList()]), OPTIONS);
    const renderedCase = result.hearings.courtLists[0].session[0].sittings[0].hearing[0].case[0];

    expect(renderedCase.appellant).toBe("John Doe");
    expect(renderedCase.appellantRepresentative).toBe("Jane Rep");
    expect(renderedCase.prosecutingAuthority).toBe("Home Office");
    expect(renderedCase.language).toBe("English");
  });

  it("should append the case sequence indicator to the case reference", () => {
    const courtList = buildCourtList();
    courtList.courtHouse.courtRoom[0].session[0].sittings[0].hearing[0].case[0].caseSequenceIndicator = "2 of 3";

    const result = renderIacDailyList(buildList([courtList]), OPTIONS);
    const renderedCase = result.hearings.courtLists[0].session[0].sittings[0].hearing[0].case[0];

    expect(renderedCase.caseRef).toBe("45684548 2 of 3");
  });

  it("should use the case number alone when there is no sequence indicator", () => {
    const result = renderIacDailyList(buildList([buildCourtList()]), OPTIONS);
    const renderedCase = result.hearings.courtLists[0].session[0].sittings[0].hearing[0].case[0];

    expect(renderedCase.caseRef).toBe("45684548");
  });

  it("should place the presiding judge first in the judiciary string", () => {
    const courtList = buildCourtList();
    courtList.courtHouse.courtRoom[0].session[0].judiciary = [
      { johTitle: "Judge", johNameSurname: "Adams", isPresiding: false },
      { johTitle: "Judge", johNameSurname: "Baker", isPresiding: true }
    ];

    const result = renderIacDailyList(buildList([courtList]), OPTIONS);

    expect(result.hearings.courtLists[0].session[0].formattedJudiciary).toBe("Judge Baker, Judge Adams");
  });

  it("should flag the bail list based on the court list name", () => {
    const bailList = buildCourtList({ courtListName: "Bail List" });

    const result = renderIacDailyList(buildList([bailList]), OPTIONS);

    expect(result.hearings.courtLists[0].session[0].isBailList).toBe(true);
  });

  it("should not flag a substantive list as a bail list", () => {
    const result = renderIacDailyList(buildList([buildCourtList()]), OPTIONS);

    expect(result.hearings.courtLists[0].session[0].isBailList).toBe(false);
  });

  it("should prefer the sitting channel over the session channel", () => {
    const courtList = buildCourtList();
    courtList.courtHouse.courtRoom[0].session[0].sittings[0].channel = ["IN PERSON"];

    const result = renderIacDailyList(buildList([courtList]), OPTIONS);

    expect(result.hearings.courtLists[0].session[0].sittings[0].caseHearingChannel).toBe("IN PERSON");
  });

  it("should fall back to the session channel when the sitting has no channel", () => {
    const result = renderIacDailyList(buildList([buildCourtList()]), OPTIONS);

    expect(result.hearings.courtLists[0].session[0].sittings[0].caseHearingChannel).toBe("VIDEO HEARING");
  });

  it("should return an empty court list array when there are no court lists", () => {
    const result = renderIacDailyList(buildList([]), OPTIONS);

    expect(result.hearings.courtLists).toHaveLength(0);
  });
});
