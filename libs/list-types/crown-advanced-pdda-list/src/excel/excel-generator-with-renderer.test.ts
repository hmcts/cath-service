import ExcelJS from "exceljs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cy } from "../locales/cy.js";
import { en } from "../locales/en.js";
import { generateCrownAdvanceListExcel } from "./excel-generator.js";

let capturedBuffer: Buffer | undefined;

vi.mock("@hmcts/list-types-common", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@hmcts/list-types-common")>()),
  saveExcelToStorage: vi.fn(async (artefactId: string, buffer: Buffer) => {
    capturedBuffer = buffer;
    return { excelPath: `${artefactId}.xlsx` };
  })
}));

vi.mock("@hmcts/location", () => ({
  getLocationById: vi.fn().mockResolvedValue(undefined)
}));

const JSON_DATA = {
  WarnedList: {
    DocumentID: { UniqueID: "CWPL-2025-001", DocumentType: "crown_warned_pdda_list" },
    ListHeader: { StartDate: "2025-11-10", EndDate: "2025-11-11", PublishedTime: "2025-11-12T09:00:00", Version: "1.0" },
    CrownCourt: { CourtHouseName: "Crown Court at Birmingham", CourtHouseAddress: { Line: ["Newton Street"], PostCode: "B4 7NA" } },
    CourtLists: [
      {
        WithFixedDate: [
          {
            Fixture: [
              {
                FixedDate: "2025-11-02",
                Cases: [
                  {
                    CaseNumber: "T20250001",
                    Hearing: [{ HearingDescription: "Trial", ListNote: "" }],
                    Defendants: [{ PersonalDetails: { Name: { CitizenNameForename: ["Alice"], CitizenNameSurname: "Williams" }, IsMasked: "NO" as const } }],
                    Prosecution: { ProsecutingAuthority: "CPS" }
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  }
};

describe("generateCrownAdvanceListExcel with the real renderer", () => {
  beforeEach(() => {
    capturedBuffer = undefined;
  });

  it("should write the fixed for date in long format", async () => {
    // Act
    await generateCrownAdvanceListExcel({ ...baseOptions(), locale: "en" });

    // Assert
    expect(await readColumn(en.excelColumns.fixedFor)).toEqual(["2 November 2025"]);
  });

  it("should write the fixed for date with a Welsh month name when locale is cy", async () => {
    // Act
    await generateCrownAdvanceListExcel({ ...baseOptions(), locale: "cy" });

    // Assert
    expect(await readColumn(cy.excelColumns.fixedFor)).toEqual(["2 Tachwedd 2025"]);
  });
});

function baseOptions() {
  return { artefactId: "test-id", locationId: "1", contentDate: new Date("2025-11-10"), listTypeName: "CROWN_ADVANCED_PDDA_LIST", jsonData: JSON_DATA as any };
}

async function readColumn(header: string): Promise<unknown[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(capturedBuffer as unknown as ArrayBuffer);
  const worksheet = workbook.worksheets[0];
  const columnNumber = (worksheet.getRow(1).values as unknown[]).indexOf(header);
  return (worksheet.getColumn(columnNumber).values as unknown[]).slice(2);
}
