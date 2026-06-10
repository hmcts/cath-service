import type { SjpJson } from "@hmcts/list-types-common";
import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { generateSjpPublicListExcel } from "./sjp-public-list-excel-generator.js";

const FIXTURE: SjpJson = {
  document: { publicationDate: "2025-01-01T10:00:00Z" },
  courtLists: [
    {
      courtHouse: {
        courtRoom: [
          {
            session: [
              {
                sittings: [
                  {
                    hearing: [
                      {
                        case: [{ caseUrn: "URN-001" }],
                        party: [
                          {
                            partyRole: "ACCUSED",
                            individualDetails: {
                              individualForenames: "John",
                              individualSurname: "Smith",
                              address: { postCode: "SW1A 1AA" }
                            }
                          },
                          {
                            partyRole: "PROSECUTOR",
                            organisationDetails: { organisationName: "CPS London" }
                          }
                        ],
                        offence: [{ offenceTitle: "Speeding", offenceWording: "Exceeded 30mph limit" }]
                      },
                      {
                        case: [{ caseUrn: "URN-002" }],
                        party: [
                          {
                            partyRole: "ACCUSED",
                            individualDetails: {
                              individualForenames: "Jane",
                              individualSurname: "Doe",
                              address: { postCode: "EC1A 1BB" }
                            }
                          },
                          {
                            partyRole: "PROSECUTOR",
                            organisationDetails: { organisationName: "HMRC" }
                          }
                        ],
                        offence: [{ offenceTitle: "Tax evasion" }]
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

describe("generateSjpPublicListExcel", () => {
  it("should generate Excel with correct columns and data", async () => {
    const buffer = await generateSjpPublicListExcel(FIXTURE);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const worksheet = workbook.getWorksheet("SJP Public List");
    expect(worksheet).toBeDefined();

    const headerRow = worksheet!.getRow(1);
    expect(headerRow.getCell(1).value).toBe("Name");
    expect(headerRow.getCell(2).value).toBe("Postcode");
    expect(headerRow.getCell(3).value).toBe("Offence");
    expect(headerRow.getCell(4).value).toBe("Prosecutor");

    expect(headerRow.getCell(1).font?.bold).toBe(true);

    const row2 = worksheet!.getRow(2);
    expect(row2.getCell(1).value).toBe("John Smith");
    expect(row2.getCell(2).value).toBe("SW1A");
    expect(row2.getCell(3).value).toBe("Speeding");
    expect(row2.getCell(4).value).toBe("CPS London");

    const row3 = worksheet!.getRow(3);
    expect(row3.getCell(1).value).toBe("Jane Doe");
    expect(row3.getCell(2).value).toBe("EC1A");
    expect(row3.getCell(3).value).toBe("Tax evasion");
    expect(row3.getCell(4).value).toBe("HMRC");
  });

  it("should handle empty court lists", async () => {
    const emptyJson: SjpJson = {
      document: { publicationDate: "2025-01-01T10:00:00Z" },
      courtLists: []
    };

    const buffer = await generateSjpPublicListExcel(emptyJson);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const worksheet = workbook.getWorksheet("SJP Public List");
    expect(worksheet).toBeDefined();
    expect(worksheet!.rowCount).toBe(1);
  });

  it("should handle missing fields gracefully", async () => {
    const json: SjpJson = {
      document: { publicationDate: "2025-01-01T10:00:00Z" },
      courtLists: [
        {
          courtHouse: {
            courtRoom: [
              {
                session: [
                  {
                    sittings: [
                      {
                        hearing: [
                          {
                            case: [],
                            party: [{ partyRole: "ACCUSED" }],
                            offence: []
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

    const buffer = await generateSjpPublicListExcel(json);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const worksheet = workbook.getWorksheet("SJP Public List");
    const row2 = worksheet!.getRow(2);
    expect(row2.getCell(1).value).toBe("Unknown");
    expect(row2.getCell(2).value).toBe("");
    expect(row2.getCell(3).value).toBe("");
    expect(row2.getCell(4).value).toBe("");
  });
});
