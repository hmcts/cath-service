import ExcelJS from "exceljs";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@hmcts/azure-blob", () => ({
  CONTAINER: { PUBLICATIONS: "publications" },
  uploadBlob: vi.fn().mockResolvedValue(undefined)
}));

import { uploadBlob } from "@hmcts/azure-blob";
import { londonTableHeadersCy } from "../locales/cy.js";
import { londonTableHeaders } from "../locales/en.js";
import { generateUtiacJrLondonDailyHearingListExcel } from "./excel-generator-london.js";

const HEARING_A = {
  hearingTime: "10am",
  caseTitle: "R (A) v SSHD",
  representative: "Smith Solicitors",
  caseReferenceNumber: "JR-2025-LON-000001",
  judges: "Judge Brown",
  hearingType: "Oral permission",
  location: "Field House",
  additionalInformation: "None"
};

const HEARING_B = {
  hearingTime: "2pm",
  caseTitle: "R (B) v SSHD",
  representative: "Jones LLP",
  caseReferenceNumber: "JR-2025-LON-000002",
  judges: "Judge White",
  hearingType: "Substantive",
  location: "Remote",
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

describe("generateUtiacJrLondonDailyHearingListExcel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should save the workbook as <artefactId>.xlsx", async () => {
    // Act
    const result = await generateUtiacJrLondonDailyHearingListExcel(buildOptions());

    // Assert
    expect(result).toEqual({ success: true, excelPath: "artefact-1.xlsx" });
    expect(uploadBlob).toHaveBeenCalledWith("artefact-1.xlsx", expect.any(Buffer), expect.any(String), "publications");
  });

  it("should write the English PDF table headers in PDF column order", async () => {
    // Act
    await generateUtiacJrLondonDailyHearingListExcel(buildOptions());

    // Assert
    const worksheet = await loadWorksheet();
    expect(rowValues(worksheet, 1)).toEqual([
      londonTableHeaders.hearingTime,
      londonTableHeaders.caseTitle,
      londonTableHeaders.representative,
      londonTableHeaders.caseReferenceNumber,
      londonTableHeaders.judges,
      londonTableHeaders.hearingType,
      londonTableHeaders.location,
      londonTableHeaders.additionalInformation
    ]);
  });

  it("should write the Welsh table headers when the locale is cy", async () => {
    // Act
    await generateUtiacJrLondonDailyHearingListExcel(buildOptions({ locale: "cy" }));

    // Assert
    const worksheet = await loadWorksheet();
    expect(rowValues(worksheet, 1)).toEqual([
      londonTableHeadersCy.hearingTime,
      londonTableHeadersCy.caseTitle,
      londonTableHeadersCy.representative,
      londonTableHeadersCy.caseReferenceNumber,
      londonTableHeadersCy.judges,
      londonTableHeadersCy.hearingType,
      londonTableHeadersCy.location,
      londonTableHeadersCy.additionalInformation
    ]);
  });

  it("should write one row per hearing with every field in column order", async () => {
    // Act
    await generateUtiacJrLondonDailyHearingListExcel(buildOptions());

    // Assert
    const worksheet = await loadWorksheet();
    expect(worksheet.rowCount).toBe(3);
    expect(rowValues(worksheet, 2)).toEqual([
      "10am",
      "R (A) v SSHD",
      "Smith Solicitors",
      "JR-2025-LON-000001",
      "Judge Brown",
      "Oral permission",
      "Field House",
      "None"
    ]);
    expect(rowValues(worksheet, 3)).toEqual(["2pm", "R (B) v SSHD", "Jones LLP", "JR-2025-LON-000002", "Judge White", "Substantive", "Remote", "Video"]);
  });

  it("should name the worksheet within Excel's 31 character limit", async () => {
    // Act
    await generateUtiacJrLondonDailyHearingListExcel(buildOptions());

    // Assert
    const worksheet = await loadWorksheet();
    expect(worksheet.name).toBe("Sheet1");
    expect(worksheet.name.length).toBeLessThanOrEqual(31);
  });

  it("should return success false when the upload fails", async () => {
    // Arrange
    vi.mocked(uploadBlob).mockRejectedValueOnce(new Error("Upload failed"));

    // Act
    const result = await generateUtiacJrLondonDailyHearingListExcel(buildOptions());

    // Assert
    expect(result).toEqual({ success: false, error: "Upload failed" });
  });
});
