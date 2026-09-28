import ExcelJS from "exceljs";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@hmcts/location", () => ({
  getLocationById: vi.fn().mockResolvedValue({ name: "Test Court", welshName: "Llys Prawf" })
}));

vi.mock("@hmcts/azure-blob", () => ({
  CONTAINER: { PUBLICATIONS: "publications" },
  uploadBlob: vi.fn().mockResolvedValue(undefined)
}));

import { uploadBlob } from "@hmcts/azure-blob";
import { cy } from "../locales/cy.js";
import { en } from "../locales/en.js";
import { generateCivilAndFamilyDailyCauseListExcel } from "./excel-generator.js";

function buildJsonData() {
  return {
    document: { publicationDate: "2025-01-13T10:00:00Z" },
    venue: { venueName: "Test Court" },
    courtLists: [
      {
        courtHouse: {
          courtHouseName: "Test Court House",
          courtRoom: [
            {
              courtRoomName: "Court 1",
              session: [
                {
                  judiciary: [{ johKnownAs: "Judge Smith", isPresiding: true }],
                  sessionChannel: ["In Person"],
                  sittings: [
                    {
                      sittingStart: "2025-01-13T10:00:00Z",
                      sittingEnd: "2025-01-13T11:00:00Z",
                      hearing: [
                        {
                          hearingType: "Trial",
                          case: [
                            {
                              caseNumber: "CF1",
                              caseName: "A v B",
                              caseType: "Civil",
                              reportingRestrictionDetail: [],
                              party: [
                                { partyRole: "APPLICANT_PETITIONER", individualDetails: { individualForenames: "Alice", individualSurname: "Applicant" } },
                                {
                                  partyRole: "APPLICANT_PETITIONER_REPRESENTATIVE",
                                  individualDetails: { individualForenames: "Adam", individualSurname: "Advisor" }
                                },
                                { partyRole: "RESPONDENT", individualDetails: { individualForenames: "Rob", individualSurname: "Respondent" } }
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
  } as never;
}

async function readRow(rowNumber: number): Promise<string[]> {
  const [, buffer] = vi.mocked(uploadBlob).mock.calls[0];
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as Buffer);
  const values: string[] = [];
  workbook.worksheets[0].getRow(rowNumber).eachCell({ includeEmpty: true }, (cell) => {
    values.push(String(cell.value ?? ""));
  });
  return values;
}

async function readWorksheetName(): Promise<string> {
  const [, buffer] = vi.mocked(uploadBlob).mock.calls[0];
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as Buffer);
  return workbook.worksheets[0].name;
}

describe("generateCivilAndFamilyDailyCauseListExcel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should combine each party with its legal advisor in a single column and not emit separate advisor columns", async () => {
    // Arrange
    const options = { artefactId: "id", locationId: "1", contentDate: new Date("2025-01-13"), locale: "en", jsonData: buildJsonData() };

    // Act
    const result = await generateCivilAndFamilyDailyCauseListExcel(options);

    // Assert
    expect(result.success).toBe(true);
    const header = await readRow(1);
    expect(header).toContain(en.excelColumns.applicant);
    expect(header).toContain(en.excelColumns.respondent);
    expect(header).toContain(en.excelColumns.reportingRestrictions);
    expect(header).not.toContain("Applicant/Petitioner Legal Advisor");
    expect(header).not.toContain("Respondent Legal Advisor");
    const applicantIdx = header.indexOf(en.excelColumns.applicant);
    const respondentIdx = header.indexOf(en.excelColumns.respondent);
    const row = await readRow(2);
    expect(row[applicantIdx]).toBe(`Alice Applicant, ${en.legalAdvisor}: Adam Advisor`);
    expect(row[respondentIdx]).toBe("Rob Respondent");
  });

  it("should name the worksheet with a short name that is not truncated by Excel's 31-char limit", async () => {
    // Arrange
    const options = { artefactId: "id", locationId: "1", contentDate: new Date("2025-01-13"), locale: "en", jsonData: buildJsonData() };

    // Act
    await generateCivilAndFamilyDailyCauseListExcel(options);

    // Assert
    const name = await readWorksheetName();
    expect(name).toBe("Civil and Family");
    expect(name.length).toBeLessThanOrEqual(31);
  });

  it("should have matching en and cy excelColumns keys", () => {
    // Assert
    expect(Object.keys(en.excelColumns).sort()).toEqual(Object.keys(cy.excelColumns).sort());
  });
});
