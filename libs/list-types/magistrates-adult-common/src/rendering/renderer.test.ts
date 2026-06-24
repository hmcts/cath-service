import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderMagistratesAdultList } from "./renderer.js";

vi.mock("@hmcts/location", () => ({
  getLocationById: vi.fn()
}));

import { getLocationById } from "@hmcts/location";

describe("renderMagistratesAdultList", () => {
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
    const result = await renderMagistratesAdultList(baseData([{ caseNumber: "MAG-001", party: [] }]), {
      locationId: "240",
      contentDate: new Date("2025-01-01"),
      locale: "en"
    });

    expect(result.header.locationName).toBe("Oxford Magistrates' Court");
    expect(result.header.addressLines).toEqual(["The Law Courts", "Oxford", "OX1 1TL"]);
    expect(result.header.contentDate).toBe("01 January 2025");
    expect(result.header.lastUpdated).toBe("12 November 2025 at 9am");
  });

  it("should build defendant rows with standard fields and offences", async () => {
    const result = await renderMagistratesAdultList(
      baseData([
        {
          caseNumber: "MAG-001",
          party: [
            {
              partyRole: "DEFENDANT",
              individualDetails: {
                individualForenames: "John",
                individualSurname: "Smith",
                dateOfBirth: "1990-05-01",
                age: 35,
                individualAddress: { line: ["1 High Street"], town: "Oxford", postCode: "OX1 2AB" }
              },
              offence: [{ offenceCode: "TH68001", offenceTitle: "Theft", offenceWording: "Stole goods" }]
            }
          ]
        }
      ]),
      { locationId: "240", contentDate: new Date("2025-01-01"), locale: "en" }
    );

    const session = result.listData.courtLists[0].courtHouse.courtRoom[0].session[0];
    const sitting = session.sittings[0] as { blockStart?: string };
    const caseItem = session.sittings[0].hearing[0].case[0] as { defendants?: Array<Record<string, unknown>> };

    expect(sitting.blockStart).toBe("10:30am");
    expect((session as { formattedJudiciaries?: string }).formattedJudiciaries).toBe("District Judge Smith");
    expect(caseItem.defendants?.[0]).toEqual({
      name: "John Smith",
      dateOfBirth: "01 May 1990",
      address: "1 High Street, Oxford, OX1 2AB",
      age: 35,
      offences: [{ offenceCode: "TH68001", offenceTitle: "Theft", offenceSummary: "Stole goods" }]
    });
  });

  it("should only include DEFENDANT parties as defendants", async () => {
    const result = await renderMagistratesAdultList(
      baseData([
        {
          caseNumber: "MAG-002",
          party: [
            { partyRole: "PROSECUTOR", individualDetails: { individualSurname: "Crown" } },
            { partyRole: "DEFENDANT", individualDetails: { individualSurname: "Jones" } }
          ]
        }
      ]),
      { locationId: "240", contentDate: new Date("2025-01-01"), locale: "en" }
    );

    const caseItem = result.listData.courtLists[0].courtHouse.courtRoom[0].session[0].sittings[0].hearing[0].case[0] as {
      defendants?: Array<Record<string, unknown>>;
    };

    expect(caseItem.defendants).toHaveLength(1);
    expect(caseItem.defendants?.[0]?.name).toBe("Jones");
  });

  it("should use Welsh location name when locale is cy and welshName is present", async () => {
    (getLocationById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 240,
      name: "Oxford Magistrates Court",
      welshName: "Llys Ynadon Rhydychen"
    });

    const result = await renderMagistratesAdultList(baseData([{ caseNumber: "MAG-001", party: [] }]), {
      locationId: "240",
      contentDate: new Date("2025-01-01"),
      locale: "cy"
    });

    expect(result.header.locationName).toBe("Llys Ynadon Rhydychen");
  });

  it("should format reporting restrictions when present", async () => {
    const result = await renderMagistratesAdultList(baseData([{ caseNumber: "MAG-003", reportingRestrictionDetail: ["Section 49"], party: [] }]), {
      locationId: "240",
      contentDate: new Date("2025-01-01"),
      locale: "en"
    });

    const caseItem = result.listData.courtLists[0].courtHouse.courtRoom[0].session[0].sittings[0].hearing[0].case[0];

    expect((caseItem as { formattedReportingRestriction?: string }).formattedReportingRestriction).toBe("Section 49");
  });
});
