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
import { generateCivilDailyCauseListExcel } from "./excel-generator.js";

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
                        { hearingType: "Trial", case: [{ caseNumber: "C1", caseName: "A v B", caseType: "Civil", reportingRestrictionDetail: [], party: [] }] }
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

describe("generateCivilDailyCauseListExcel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should write the seven civil columns with a Case ID column and no applicant or reporting restriction columns", async () => {
    // Arrange
    const options = { artefactId: "id", locationId: "1", contentDate: new Date("2025-01-13"), locale: "en", jsonData: buildJsonData() };

    // Act
    const result = await generateCivilDailyCauseListExcel(options);

    // Assert
    expect(result.success).toBe(true);
    const header = await readRow(1);
    expect(header).toEqual([
      en.excelColumns.courtHouse,
      en.excelColumns.courtRoom,
      en.excelColumns.judge,
      en.excelColumns.time,
      en.excelColumns.caseId,
      en.excelColumns.caseName,
      en.excelColumns.caseType,
      en.excelColumns.hearingType,
      en.excelColumns.location,
      en.excelColumns.duration
    ]);
  });

  it("should append the case sequence indicator to the case name", async () => {
    // Arrange
    const jsonData = buildJsonData();
    jsonData.courtLists[0].courtHouse.courtRoom[0].session[0].sittings[0].hearing[0].case[0].caseSequenceIndicator = "1 of 2";
    const options = { artefactId: "id", locationId: "1", contentDate: new Date("2025-01-13"), locale: "en", jsonData };

    // Act
    await generateCivilDailyCauseListExcel(options);

    // Assert
    const header = await readRow(1);
    const caseNameIdx = header.indexOf(en.excelColumns.caseName);
    const row = await readRow(2);
    expect(row[caseNameIdx]).toBe("A v B [1 of 2]");
  });

  it("should name the worksheet with a short name within Excel's 31-char limit", async () => {
    // Arrange
    const options = { artefactId: "id", locationId: "1", contentDate: new Date("2025-01-13"), locale: "en", jsonData: buildJsonData() };

    // Act
    await generateCivilDailyCauseListExcel(options);

    // Assert
    const name = await readWorksheetName();
    expect(name).toBe("Civil Daily Cause List");
    expect(name.length).toBeLessThanOrEqual(31);
  });

  it("should have matching en and cy excelColumns keys", () => {
    // Assert
    expect(Object.keys(en.excelColumns).sort()).toEqual(Object.keys(cy.excelColumns).sort());
  });
});
