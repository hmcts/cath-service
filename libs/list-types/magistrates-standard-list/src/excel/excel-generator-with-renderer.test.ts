import ExcelJS from "exceljs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cy } from "../locales/cy.js";
import { en } from "../locales/en.js";
import type { MagistratesStandardList } from "../models/types.js";
import { generateMagistratesStandardListExcel } from "./excel-generator.js";

let capturedBuffer: Buffer | undefined;

vi.mock("@hmcts/list-types-common", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@hmcts/list-types-common")>()),
  saveExcelToStorage: vi.fn(async (artefactId: string, buffer: Buffer) => {
    capturedBuffer = buffer;
    return { excelPath: `${artefactId}.xlsx` };
  })
}));

vi.mock("@hmcts/location", () => ({
  getLocationById: vi.fn().mockResolvedValue({ name: "Manchester Magistrates Court", welshName: "Llys Ynadon Manceinion" })
}));

const JSON_DATA: MagistratesStandardList = {
  document: { publicationDate: "2025-01-13T09:30:00.000Z" },
  venue: { venueAddress: { line: ["THE LAW COURTS"], town: "Manchester", postCode: "M3 3FL" } },
  courtLists: [
    {
      courtHouse: {
        courtHouseName: "Manchester Magistrates Court",
        lja: "Greater Manchester",
        courtRoom: [
          {
            courtRoomName: "Court 1",
            session: [
              {
                sittings: [
                  {
                    sittingStart: "2025-01-13T10:00:00.000Z",
                    hearing: [
                      {
                        hearingType: "Trial",
                        case: [
                          {
                            caseUrn: "URN12345",
                            party: [
                              {
                                partyRole: "DEFENDANT",
                                individualDetails: {
                                  individualForenames: "John",
                                  individualSurname: "Smith",
                                  dateOfBirth: "1990-05-15"
                                },
                                offence: [
                                  {
                                    offenceCode: "DD01",
                                    offenceTitle: "Drink driving",
                                    pleaDate: "2025-01-02T00:00:00.000Z",
                                    convictionDate: "2025-01-03T00:00:00.000Z",
                                    adjournedDate: "2025-01-04T00:00:00.000Z"
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
          }
        ]
      }
    }
  ]
};

describe("generateMagistratesStandardListExcel with the real renderer", () => {
  beforeEach(() => {
    capturedBuffer = undefined;
  });

  it("should write each date in long format in its own column", async () => {
    // Act
    await generateMagistratesStandardListExcel({
      artefactId: "test-id",
      locationId: "1",
      contentDate: new Date("2025-01-13"),
      locale: "en",
      jsonData: JSON_DATA
    });

    // Assert
    expect(await readColumn(en.excelColumns.dob)).toEqual(["15 May 1990"]);
    expect(await readColumn(en.excelColumns.dateOfPlea)).toEqual(["2 January 2025"]);
    expect(await readColumn(en.excelColumns.convictedOn)).toEqual(["3 January 2025"]);
    expect(await readColumn(en.excelColumns.adjournedFrom)).toEqual([`4 January 2025 - ${en.adjournedText}`]);
  });

  it("should write each date with a Welsh month name in its own column when locale is cy", async () => {
    // Act
    await generateMagistratesStandardListExcel({
      artefactId: "test-id",
      locationId: "1",
      contentDate: new Date("2025-01-13"),
      locale: "cy",
      jsonData: JSON_DATA
    });

    // Assert
    expect(await readColumn(cy.excelColumns.dob)).toEqual(["15 Mai 1990"]);
    expect(await readColumn(cy.excelColumns.dateOfPlea)).toEqual(["2 Ionawr 2025"]);
    expect(await readColumn(cy.excelColumns.convictedOn)).toEqual(["3 Ionawr 2025"]);
    expect(await readColumn(cy.excelColumns.adjournedFrom)).toEqual([`4 Ionawr 2025 - ${cy.adjournedText}`]);
  });
});

describe("generateMagistratesStandardListExcel with a date that does not exist", () => {
  it("should write the plea date as it was sent", async () => {
    // Arrange
    const json = JSON.parse(JSON.stringify(JSON_DATA));
    json.courtLists[0].courtHouse.courtRoom[0].session[0].sittings[0].hearing[0].case[0].party[0].offence[0].pleaDate = "2025-02-31T00:00:00Z";

    // Act
    const result = await generateMagistratesStandardListExcel({
      artefactId: "test-id",
      locationId: "1",
      contentDate: new Date("2025-01-13"),
      locale: "en",
      jsonData: json
    });

    // Assert
    expect(result.success).toBe(true);
    expect(await readColumn(en.excelColumns.dateOfPlea)).toEqual(["2025-02-31T00:00:00Z"]);
  });
});

async function readColumn(header: string): Promise<unknown[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(capturedBuffer as unknown as ArrayBuffer);
  const worksheet = workbook.worksheets[0];
  const columnNumber = (worksheet.getRow(1).values as unknown[]).indexOf(header);
  return (worksheet.getColumn(columnNumber).values as unknown[]).slice(2);
}
