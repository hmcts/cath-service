import ExcelJS from "exceljs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cy } from "../locales/cy.js";
import { en } from "../locales/en.js";
import type { CrownFirmListData } from "../models/types.js";
import { generateCrownFirmListExcel } from "./excel-generator.js";

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

const JSON_DATA: CrownFirmListData = {
  FirmList: {
    DocumentID: { UniqueID: "CFPL-2025-001", DocumentType: "crown_firm_pdda_list" },
    ListHeader: { StartDate: "2025-04-22", PublishedTime: "2025-04-21T09:00:00", Version: "1.0" },
    CrownCourt: { CourtHouseName: "Crown Court at Manchester", CourtHouseAddress: { Line: ["Crown Square"], PostCode: "M3 3FL" } },
    CourtLists: [
      {
        SittingDate: "2025-04-22",
        CourtHouse: { CourtHouseName: "Test Court House", CourtHouseAddress: { Line: ["1 Test Street"], PostCode: "TE1 1ST" } },
        Sittings: [
          {
            CourtRoomNumber: 3,
            SittingAt: "10:00:00",
            Judiciary: { Judge: { CitizenNameTitle: "HHJ", CitizenNameForename: [], CitizenNameSurname: "Brown" } },
            Hearings: [{ HearingDetails: { HearingDescription: "Sentence" }, CaseNumber: "M20250001", Defendants: [] }]
          }
        ]
      }
    ]
  }
};

describe("generateCrownFirmListExcel with the real renderer", () => {
  beforeEach(() => {
    capturedBuffer = undefined;
  });

  it("should write the sitting date with the weekday, as the PDF and HTML show it", async () => {
    // Act
    await generateCrownFirmListExcel({ ...baseOptions(), locale: "en" });

    // Assert
    expect(await readColumn(en.excelColumns.date)).toEqual(["Tuesday 22 April 2025"]);
  });

  it("should write the sitting date with a Welsh weekday and month when locale is cy", async () => {
    // Act
    await generateCrownFirmListExcel({ ...baseOptions(), locale: "cy" });

    // Assert
    expect(await readColumn(cy.excelColumns.date)).toEqual(["Dydd Mawrth 22 Ebrill 2025"]);
  });
});

function baseOptions() {
  return { artefactId: "test-id", locationId: "1", contentDate: new Date("2025-04-22"), listTypeName: "CROWN_FIRM_PDDA_LIST", jsonData: JSON_DATA };
}

async function readColumn(header: string): Promise<unknown[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(capturedBuffer as unknown as ArrayBuffer);
  const worksheet = workbook.worksheets[0];
  const columnNumber = (worksheet.getRow(1).values as unknown[]).indexOf(header);
  return (worksheet.getColumn(columnNumber).values as unknown[]).slice(2);
}
