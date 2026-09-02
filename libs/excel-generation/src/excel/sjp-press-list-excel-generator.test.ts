import type { SjpJson } from "@hmcts/list-types-common";
import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { generateSjpPressListExcel } from "./sjp-press-list-excel-generator.js";

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
                              dateOfBirth: "01/01/1990",
                              age: 35,
                              address: {
                                line: ["123 Test Street"],
                                town: "London",
                                postCode: "SW1A 1AA"
                              }
                            }
                          },
                          {
                            partyRole: "PROSECUTOR",
                            organisationDetails: { organisationName: "CPS London" }
                          }
                        ],
                        offence: [
                          { offenceTitle: "Speeding", offenceWording: "Exceeded 30mph limit", reportingRestriction: true },
                          { offenceTitle: "No insurance", offenceWording: "Driving without insurance", reportingRestriction: false }
                        ]
                      },
                      {
                        case: [{ caseUrn: "URN-002" }],
                        party: [
                          {
                            partyRole: "ACCUSED",
                            individualDetails: {
                              individualForenames: "Jane",
                              individualSurname: "Doe",
                              dateOfBirth: "15/06/1985",
                              age: 39,
                              address: {
                                line: ["456 Another Road"],
                                town: "Manchester",
                                postCode: "M1 2AA"
                              }
                            }
                          },
                          {
                            partyRole: "PROSECUTOR",
                            organisationDetails: { organisationName: "HMRC" }
                          }
                        ],
                        offence: [{ offenceTitle: "Tax evasion", offenceWording: "Failed to declare income", reportingRestriction: false }]
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

describe("generateSjpPressListExcel", () => {
  it("should generate Excel with dynamic offence columns based on max offences", async () => {
    const buffer = await generateSjpPressListExcel(FIXTURE);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const worksheet = workbook.getWorksheet("SJP Press List");
    expect(worksheet).toBeDefined();

    const headerRow = worksheet!.getRow(1);
    expect(headerRow.getCell(1).value).toBe("Address");
    expect(headerRow.getCell(2).value).toBe("Case URN");
    expect(headerRow.getCell(3).value).toBe("Date of Birth");
    expect(headerRow.getCell(4).value).toBe("Defendant Name");
    expect(headerRow.getCell(5).value).toBe("Offence 1 Press Restriction Requested");
    expect(headerRow.getCell(6).value).toBe("Offence 1 Title");
    expect(headerRow.getCell(7).value).toBe("Offence 1 Wording");
    expect(headerRow.getCell(8).value).toBe("Offence 2 Press Restriction Requested");
    expect(headerRow.getCell(9).value).toBe("Offence 2 Title");
    expect(headerRow.getCell(10).value).toBe("Offence 2 Wording");
    expect(headerRow.getCell(11).value).toBe("Prosecutor Name");

    expect(headerRow.getCell(1).font?.bold).toBe(true);
  });

  it("should format DOB as dd/MM/yyyy (age)", async () => {
    const buffer = await generateSjpPressListExcel(FIXTURE);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const worksheet = workbook.getWorksheet("SJP Press List");
    const row2 = worksheet!.getRow(2);
    expect(row2.getCell(3).value).toBe("01/01/1990 (35)");
  });

  it("should map reporting restriction boolean to Active/None", async () => {
    const buffer = await generateSjpPressListExcel(FIXTURE);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const worksheet = workbook.getWorksheet("SJP Press List");
    const row2 = worksheet!.getRow(2);
    expect(row2.getCell(5).value).toBe("Active");
    expect(row2.getCell(8).value).toBe("None");

    const row3 = worksheet!.getRow(3);
    expect(row3.getCell(5).value).toBe("None");
    expect(row3.getCell(8).value).toBe("");
  });

  it("should populate address, case URN, defendant name, and prosecutor", async () => {
    const buffer = await generateSjpPressListExcel(FIXTURE);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const worksheet = workbook.getWorksheet("SJP Press List");
    const row2 = worksheet!.getRow(2);
    expect(row2.getCell(1).value).toBe("123 Test Street, London, SW1A 1AA");
    expect(row2.getCell(2).value).toBe("URN-001");
    expect(row2.getCell(4).value).toBe("John Smith");
    expect(row2.getCell(11).value).toBe("CPS London");
  });

  it("should handle empty court lists", async () => {
    const emptyJson: SjpJson = {
      document: { publicationDate: "2025-01-01T10:00:00Z" },
      courtLists: []
    };

    const buffer = await generateSjpPressListExcel(emptyJson);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const worksheet = workbook.getWorksheet("SJP Press List");
    expect(worksheet).toBeDefined();
    // With no cases, there's no max offences, so just the base columns + Prosecutor Name
    const headerRow = worksheet!.getRow(1);
    expect(headerRow.getCell(1).value).toBe("Address");
    expect(headerRow.getCell(5).value).toBe("Prosecutor Name");
  });

  it("should handle missing DOB", async () => {
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
                            party: [
                              {
                                partyRole: "ACCUSED",
                                individualDetails: { individualForenames: "Test", individualSurname: "Person" }
                              },
                              { partyRole: "PROSECUTOR", organisationDetails: { organisationName: "CPS" } }
                            ],
                            offence: [{ offenceTitle: "Test offence" }]
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

    const buffer = await generateSjpPressListExcel(json);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);

    const worksheet = workbook.getWorksheet("SJP Press List");
    const row2 = worksheet!.getRow(2);
    expect(row2.getCell(3).value).toBe("");
  });
});
