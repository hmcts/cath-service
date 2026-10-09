import ExcelJS from "exceljs";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@hmcts/azure-blob", () => ({
  CONTAINER: { PUBLICATIONS: "publications" },
  uploadBlob: vi.fn().mockResolvedValue(undefined)
}));

import { uploadBlob } from "@hmcts/azure-blob";
import { cy } from "../locales/cy.js";
import { en } from "../locales/en.js";
import { generateUtiacStatutoryAppealDailyHearingListExcel } from "./excel-generator.js";

const HEARING_A = {
  hearingTime: "10am",
  appellant: "A Person",
  representative: "Smith Solicitors",
  appealReferenceNumber: "UI-2025-000001",
  judges: "Judge Brown",
  hearingType: "Error of law",
  location: "Field House",
  additionalInformation: "None"
};

const HEARING_B = {
  hearingTime: "2pm",
  appellant: "B Person",
  representative: "Jones LLP",
  appealReferenceNumber: "UI-2025-000002",
  judges: "Judge White",
  hearingType: "Resumed",
  location: "Remote",
  additionalInformation: "Interpreter"
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

describe("generateUtiacStatutoryAppealDailyHearingListExcel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should save the workbook as <artefactId>.xlsx", async () => {
    // Act
    const result = await generateUtiacStatutoryAppealDailyHearingListExcel(buildOptions());

    // Assert
    expect(result).toEqual({ success: true, excelPath: "artefact-1.xlsx" });
    expect(uploadBlob).toHaveBeenCalledWith("artefact-1.xlsx", expect.any(Buffer), expect.any(String), "publications");
  });

  it("should write the English PDF table headers in PDF column order", async () => {
    // Act
    await generateUtiacStatutoryAppealDailyHearingListExcel(buildOptions());

    // Assert
    const worksheet = await loadWorksheet();
    expect(rowValues(worksheet, 1)).toEqual([
      en.tableHeaders.hearingTime,
      en.tableHeaders.appellant,
      en.tableHeaders.representative,
      en.tableHeaders.appealReferenceNumber,
      en.tableHeaders.judges,
      en.tableHeaders.hearingType,
      en.tableHeaders.location,
      en.tableHeaders.additionalInformation
    ]);
  });

  it("should write the Welsh table headers when the locale is cy", async () => {
    // Act
    await generateUtiacStatutoryAppealDailyHearingListExcel(buildOptions({ locale: "cy" }));

    // Assert
    const worksheet = await loadWorksheet();
    expect(rowValues(worksheet, 1)).toEqual([
      cy.tableHeaders.hearingTime,
      cy.tableHeaders.appellant,
      cy.tableHeaders.representative,
      cy.tableHeaders.appealReferenceNumber,
      cy.tableHeaders.judges,
      cy.tableHeaders.hearingType,
      cy.tableHeaders.location,
      cy.tableHeaders.additionalInformation
    ]);
  });

  it("should write one row per hearing with every field in column order", async () => {
    // Act
    await generateUtiacStatutoryAppealDailyHearingListExcel(buildOptions());

    // Assert
    const worksheet = await loadWorksheet();
    expect(worksheet.rowCount).toBe(3);
    expect(rowValues(worksheet, 2)).toEqual(["10am", "A Person", "Smith Solicitors", "UI-2025-000001", "Judge Brown", "Error of law", "Field House", "None"]);
    expect(rowValues(worksheet, 3)).toEqual(["2pm", "B Person", "Jones LLP", "UI-2025-000002", "Judge White", "Resumed", "Remote", "Interpreter"]);
  });

  it("should name the worksheet within Excel's 31 character limit", async () => {
    // Act
    await generateUtiacStatutoryAppealDailyHearingListExcel(buildOptions());

    // Assert
    const worksheet = await loadWorksheet();
    expect(worksheet.name).toBe("Sheet1");
    expect(worksheet.name.length).toBeLessThanOrEqual(31);
  });

  it("should return success false when the upload fails", async () => {
    // Arrange
    vi.mocked(uploadBlob).mockRejectedValueOnce(new Error("Upload failed"));

    // Act
    const result = await generateUtiacStatutoryAppealDailyHearingListExcel(buildOptions());

    // Assert
    expect(result).toEqual({ success: false, error: "Upload failed" });
  });
});
