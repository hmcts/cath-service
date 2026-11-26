import ExcelJS from "exceljs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cyDaily } from "../locales/cy.js";
import { enDaily } from "../locales/en.js";
import type { MagistratesAdultCourtListData } from "../rendering/renderer.js";
import { generateMagistratesAdultCourtListExcel } from "./excel-generator.js";

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

describe("generateMagistratesAdultCourtListExcel with the real renderer", () => {
  beforeEach(() => {
    capturedBuffer = undefined;
  });

  it("should write the date of birth in long format", async () => {
    // Act
    await generateMagistratesAdultCourtListExcel({ ...baseOptions("13/01/1990"), locale: "en" });

    // Assert
    expect(await readColumn(enDaily.excelColumns.dateOfBirth)).toEqual(["13 January 1990"]);
  });

  it("should write the date of birth with a Welsh month name when locale is cy", async () => {
    // Act
    await generateMagistratesAdultCourtListExcel({ ...baseOptions("13/01/1990"), locale: "cy" });

    // Assert
    expect(await readColumn(cyDaily.excelColumns.dateOfBirth)).toEqual(["13 Ionawr 1990"]);
  });
});

function baseOptions(dateOfBirth: string) {
  return {
    artefactId: "test-id",
    locationId: "1",
    contentDate: new Date("2020-09-13"),
    listTypeName: "MAGISTRATES_ADULT_COURT_LIST_DAILY",
    jsonData: buildJsonData(dateOfBirth)
  };
}

function buildJsonData(dateOfBirth: string) {
  return {
    document: {
      data: {
        job: {
          sessions: {
            session: [
              {
                court: "North Shields Magistrates' Court",
                lja: "North Northumbria Magistrates' Court",
                room: 1,
                sstart: "09:00",
                blocks: { block: [{ bstart: "09:00", cases: { case: [{ caseno: "AB12345678", def_name: "Smith, John", def_dob: dateOfBirth }] } }] }
              }
            ]
          }
        }
      }
    }
  } as MagistratesAdultCourtListData;
}

async function readColumn(header: string): Promise<unknown[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(capturedBuffer as unknown as ArrayBuffer);
  const worksheet = workbook.worksheets[0];
  const columnNumber = (worksheet.getRow(1).values as unknown[]).indexOf(header);
  return (worksheet.getColumn(columnNumber).values as unknown[]).slice(2);
}
