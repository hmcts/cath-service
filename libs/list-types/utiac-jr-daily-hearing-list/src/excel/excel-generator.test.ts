import ExcelJS from "exceljs";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@hmcts/azure-blob", () => ({
  CONTAINER: { PUBLICATIONS: "publications" },
  uploadBlob: vi.fn().mockResolvedValue(undefined)
}));

import { uploadBlob } from "@hmcts/azure-blob";
import { cy } from "../locales/cy.js";
import { en } from "../locales/en.js";
import { generateUtiacJrDailyHearingListExcel } from "./excel-generator.js";

const HEARING_A = {
  venue: "Leeds Combined Court",
  judges: "Judge Brown",
  hearingTime: "10am",
  caseReferenceNumber: "JR-2025-LDS-000001",
  caseTitle: "R (A) v SSHD",
  hearingType: "Oral permission",
  additionalInformation: "None"
};

const HEARING_B = {
  venue: "Remote",
  judges: "Judge White",
  hearingTime: "2pm",
  caseReferenceNumber: "JR-2025-LDS-000002",
  caseTitle: "R (B) v SSHD",
  hearingType: "Substantive",
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

describe("generateUtiacJrDailyHearingListExcel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should save the workbook as <artefactId>.xlsx", async () => {
    // Act
    const result = await generateUtiacJrDailyHearingListExcel(buildOptions());

    // Assert
    expect(result).toEqual({ success: true, excelPath: "artefact-1.xlsx" });
    expect(uploadBlob).toHaveBeenCalledWith("artefact-1.xlsx", expect.any(Buffer), expect.any(String), "publications");
  });

  it("should write the English PDF table headers in PDF column order", async () => {
    // Act
    await generateUtiacJrDailyHearingListExcel(buildOptions());

    // Assert
    const worksheet = await loadWorksheet();
    expect(rowValues(worksheet, 1)).toEqual([
      en.tableHeaders.venue,
      en.tableHeaders.judges,
      en.tableHeaders.hearingTime,
      en.tableHeaders.caseReferenceNumber,
      en.tableHeaders.caseTitle,
      en.tableHeaders.hearingType,
      en.tableHeaders.additionalInformation
    ]);
  });

  it("should write the Welsh table headers when the locale is cy", async () => {
    // Act
    await generateUtiacJrDailyHearingListExcel(buildOptions({ locale: "cy" }));

    // Assert
    const worksheet = await loadWorksheet();
    expect(rowValues(worksheet, 1)).toEqual([
      cy.tableHeaders.venue,
      cy.tableHeaders.judges,
      cy.tableHeaders.hearingTime,
      cy.tableHeaders.caseReferenceNumber,
      cy.tableHeaders.caseTitle,
      cy.tableHeaders.hearingType,
      cy.tableHeaders.additionalInformation
    ]);
  });

  it("should write one row per hearing with every field in column order", async () => {
    // Act
    await generateUtiacJrDailyHearingListExcel(buildOptions());

    // Assert
    const worksheet = await loadWorksheet();
    expect(worksheet.rowCount).toBe(3);
    expect(rowValues(worksheet, 2)).toEqual(["Leeds Combined Court", "Judge Brown", "10am", "JR-2025-LDS-000001", "R (A) v SSHD", "Oral permission", "None"]);
    expect(rowValues(worksheet, 3)).toEqual(["Remote", "Judge White", "2pm", "JR-2025-LDS-000002", "R (B) v SSHD", "Substantive", "Video"]);
  });

  it("should name the worksheet within Excel's 31 character limit", async () => {
    // Act
    await generateUtiacJrDailyHearingListExcel(buildOptions());

    // Assert
    const worksheet = await loadWorksheet();
    expect(worksheet.name).toBe("UTIAC Judicial Review");
    expect(worksheet.name.length).toBeLessThanOrEqual(31);
  });

  it("should return success false when the upload fails", async () => {
    // Arrange
    vi.mocked(uploadBlob).mockRejectedValueOnce(new Error("Upload failed"));

    // Act
    const result = await generateUtiacJrDailyHearingListExcel(buildOptions());

    // Assert
    expect(result).toEqual({ success: false, error: "Upload failed" });
  });
});
