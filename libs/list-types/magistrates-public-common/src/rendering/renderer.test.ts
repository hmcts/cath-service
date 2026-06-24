import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderMagistratesPublicList } from "./renderer.js";

vi.mock("@hmcts/location", () => ({
  getLocationById: vi.fn()
}));

import { getLocationById } from "@hmcts/location";

describe("renderMagistratesPublicList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getLocationById as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  });

  const baseData = (cases: object[]) => ({
    document: { publicationDate: "2025-11-12T09:00:00.000Z" },
    venue: {
      venueName: "Oxford Magistrates' Court",
      venueAddress: { line: ["The Law Courts"], town: "Oxford", postCode: "OX1 1TL" }
    },
    courtLists: [
      {
        courtHouse: {
          courtHouseName: "Oxford Magistrates' Court",
          courtRoom: [
            {
              courtRoomName: "Court 1",
              session: [
                {
                  judiciary: [{ johKnownAs: "District Judge Smith", isPresiding: true }],
                  sittings: [{ sittingStart: "2025-11-12T10:30:00.000Z", hearing: [{ case: cases }] }]
                }
              ]
            }
          ]
        }
      }
    ]
  });

  it("should render header information", async () => {
    const result = await renderMagistratesPublicList(baseData([{ caseNumber: "MAG-001", party: [] }]), {
      locationId: "240",
      contentDate: new Date("2025-01-01"),
      locale: "en"
    });

    expect(result.header.locationName).toBe("Oxford Magistrates' Court");
    expect(result.header.addressLines).toEqual(["The Law Courts", "Oxford", "OX1 1TL"]);
    expect(result.header.contentDate).toBe("01 January 2025");
    expect(result.header.lastUpdated).toBe("12 November 2025 at 9am");
  });

  it("should set sitting time and defendant name from DEFENDANT party", async () => {
    const result = await renderMagistratesPublicList(
      baseData([
        {
          caseNumber: "MAG-001",
          party: [{ partyRole: "DEFENDANT", individualDetails: { individualForenames: "John", individualSurname: "Smith" } }]
        }
      ]),
      { locationId: "240", contentDate: new Date("2025-01-01"), locale: "en" }
    );

    const session = result.listData.courtLists[0].courtHouse.courtRoom[0].session[0];
    const sitting = session.sittings[0] as { time?: string };
    const caseItem = sitting && session.sittings[0].hearing[0].case[0];

    expect(sitting.time).toBe("10:30am");
    expect((caseItem as { defendant?: string }).defendant).toBe("John Smith");
    expect((session as { formattedJudiciaries?: string }).formattedJudiciaries).toBe("District Judge Smith");
  });

  it("should use Welsh location name when locale is cy and welshName is present", async () => {
    (getLocationById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 240,
      name: "Oxford Magistrates Court",
      welshName: "Llys Ynadon Rhydychen"
    });

    const result = await renderMagistratesPublicList(baseData([{ caseNumber: "MAG-001", party: [] }]), {
      locationId: "240",
      contentDate: new Date("2025-01-01"),
      locale: "cy"
    });

    expect(result.header.locationName).toBe("Llys Ynadon Rhydychen");
  });

  it("should only expose DEFENDANT party as the defendant", async () => {
    const result = await renderMagistratesPublicList(
      baseData([
        {
          caseNumber: "MAG-004",
          party: [
            { partyRole: "PROSECUTOR", individualDetails: { individualSurname: "Crown" } },
            { partyRole: "DEFENDANT", individualDetails: { individualSurname: "Jones" } }
          ]
        }
      ]),
      { locationId: "240", contentDate: new Date("2025-01-01"), locale: "en" }
    );

    const caseItem = result.listData.courtLists[0].courtHouse.courtRoom[0].session[0].sittings[0].hearing[0].case[0];

    expect((caseItem as { defendant?: string }).defendant).toBe("Jones");
  });

  it("should format reporting restrictions when present", async () => {
    const result = await renderMagistratesPublicList(baseData([{ caseNumber: "MAG-002", reportingRestrictionDetail: ["Section 49"], party: [] }]), {
      locationId: "240",
      contentDate: new Date("2025-01-01"),
      locale: "en"
    });

    const caseItem = result.listData.courtLists[0].courtHouse.courtRoom[0].session[0].sittings[0].hearing[0].case[0];

    expect((caseItem as { formattedReportingRestriction?: string }).formattedReportingRestriction).toBe("Section 49");
  });

  it("should expose open justice contact details from venue", async () => {
    const data = baseData([{ caseNumber: "MAG-003", party: [] }]);
    data.venue.venueContact = { venueEmail: "court@justice.gov.uk", venueTelephone: "01865 000 000" };

    const result = await renderMagistratesPublicList(data, { locationId: "240", contentDate: new Date("2025-01-01"), locale: "en" });

    expect(result.openJustice).toEqual({
      venueName: "Oxford Magistrates' Court",
      email: "court@justice.gov.uk",
      phone: "01865 000 000"
    });
  });
});
