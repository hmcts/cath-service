import ExcelJS from "exceljs";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@hmcts/azure-blob", () => ({
  CONTAINER: { PUBLICATIONS: "publications" },
  uploadBlob: vi.fn().mockResolvedValue(undefined)
}));

import { uploadBlob } from "@hmcts/azure-blob";
import { cy } from "../locales/cy.js";
import { en } from "../locales/en.js";
import { generateUtccDailyHearingListExcel } from "./excel-generator.js";

const HEARING_A = {
  time: "10:30am",
  caseReferenceNumber: "UT/2025/001",
  caseName: "Smith v HMRC",
  judges: "Judge Brown",
  members: "Mr Green",
  hearingType: "Substantive",
  venue: "Rolls Building",
  additionalInformation: "In person"
};

const HEARING_B = {
  time: "2pm",
  caseReferenceNumber: "UT/2025/002",
  caseName: "Jones v HMRC",
  judges: "Judge White",
  members: "Ms Black",
  hearingType: "Permission",
  venue: "Remote",
  additionalInformation: "Video"
};

function buildOptions(overrides: { locale?: string } = {}) {
  return {
    artefactId: "artefact-1",
    contentDate: new Date("2025-01-13"),
    locale: "en",
    jsonData: JSON.parse(JSON.stringify([HEARING_A, HEARING_B])),
    ...overrides
  };
}

async function loadWorksheet(): Promise<ExcelJS.Worksheet> {
  const [, buffer] = vi.mocked(uploadBlob).mock.calls[0];
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as Buffer);
  return workbook.worksheets[0];
}

function rowValues(worksheet: ExcelJS.Worksheet, rowNumber: number): string[] {
  const values: string[] = [];
  worksheet.getRow(rowNumber).eachCell({ includeEmpty: true }, (cell) => {
    values.push(String(cell.value ?? ""));
  });
  return values;
}

describe("generateUtccDailyHearingListExcel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should save the workbook as <artefactId>.xlsx", async () => {
    // Act
    const result = await generateUtccDailyHearingListExcel(buildOptions());

    // Assert
    expect(result).toEqual({ success: true, excelPath: "artefact-1.xlsx" });
    expect(uploadBlob).toHaveBeenCalledWith("artefact-1.xlsx", expect.any(Buffer), expect.any(String), "publications");
  });

  it("should write the English PDF table headers in PDF column order", async () => {
    // Act
    await generateUtccDailyHearingListExcel(buildOptions());

    // Assert
    const worksheet = await loadWorksheet();
    expect(rowValues(worksheet, 1)).toEqual([
      en.tableHeaders.time,
      en.tableHeaders.caseReferenceNumber,
      en.tableHeaders.caseName,
      en.tableHeaders.judges,
      en.tableHeaders.members,
      en.tableHeaders.hearingType,
      en.tableHeaders.venue,
      en.tableHeaders.additionalInformation
    ]);
  });

  it("should write the Welsh table headers when the locale is cy", async () => {
    // Act
    await generateUtccDailyHearingListExcel(buildOptions({ locale: "cy" }));

    // Assert
    const worksheet = await loadWorksheet();
    expect(rowValues(worksheet, 1)).toEqual([
      cy.tableHeaders.time,
      cy.tableHeaders.caseReferenceNumber,
      cy.tableHeaders.caseName,
      cy.tableHeaders.judges,
      cy.tableHeaders.members,
      cy.tableHeaders.hearingType,
      cy.tableHeaders.venue,
      cy.tableHeaders.additionalInformation
    ]);
  });

  it("should write one row per hearing with every field in column order", async () => {
    // Act
    await generateUtccDailyHearingListExcel(buildOptions());

    // Assert
    const worksheet = await loadWorksheet();
    expect(worksheet.rowCount).toBe(3);
    expect(rowValues(worksheet, 2)).toEqual([
      "10:30am",
      "UT/2025/001",
      "Smith v HMRC",
      "Judge Brown",
      "Mr Green",
      "Substantive",
      "Rolls Building",
      "In person"
    ]);
    expect(rowValues(worksheet, 3)).toEqual(["2pm", "UT/2025/002", "Jones v HMRC", "Judge White", "Ms Black", "Permission", "Remote", "Video"]);
  });

  it("should name the worksheet within Excel's 31 character limit", async () => {
    // Act
    await generateUtccDailyHearingListExcel(buildOptions());

    // Assert
    const worksheet = await loadWorksheet();
    expect(worksheet.name).toBe("Sheet1");
    expect(worksheet.name.length).toBeLessThanOrEqual(31);
  });

  it("should return success false when the upload fails", async () => {
    // Arrange
    vi.mocked(uploadBlob).mockRejectedValueOnce(new Error("Upload failed"));

    // Act
    const result = await generateUtccDailyHearingListExcel(buildOptions());

    // Assert
    expect(result).toEqual({ success: false, error: "Upload failed" });
  });
});
