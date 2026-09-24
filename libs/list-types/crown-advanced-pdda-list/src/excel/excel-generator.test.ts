import ExcelJS from "exceljs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateCrownAdvanceListExcel } from "./excel-generator.js";

let capturedBuffer: Buffer | undefined;

vi.mock("@hmcts/list-types-common", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@hmcts/list-types-common")>();
  return {
    ...actual,
    saveExcelToStorage: vi.fn(async (_artefactId: string, buffer: Buffer) => {
      capturedBuffer = buffer;
      return { excelPath: `${_artefactId}.xlsx` };
    })
  };
});

vi.mock("../rendering/renderer.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../rendering/renderer.js")>();
  return {
    ...actual,
    renderCrownAdvanceListData: vi.fn()
  };
});

import { saveExcelToStorage } from "@hmcts/list-types-common";
import { cy as cyLocale } from "../locales/cy.js";
import { en as enLocale } from "../locales/en.js";
import { renderCrownAdvanceListData, TO_BE_ALLOCATED_KEY } from "../rendering/renderer.js";

const baseOptions = {
  artefactId: "test-id",
  locationId: "1",
  contentDate: new Date("2025-01-13"),
  locale: "en",
  listTypeName: "CROWN_ADVANCED_PDDA_LIST",
  jsonData: {} as any
};

function buildRow(overrides: Record<string, unknown> = {}) {
  return {
    fixedFor: "13/01/2025",
    caseNumber: "T20250001",
    defendants: "Smith, John",
    prosecutingAuthority: "CPS",
    linkedCases: "T20250002, T20250003",
    listingNotes: "Note A",
    isInCustody: false,
    ...overrides
  };
}

function buildRendered(groupedCategories: unknown[]) {
  return { header: {}, openJustice: {}, groupedCategories };
}

async function readWorksheet() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(capturedBuffer as unknown as ArrayBuffer);
  return workbook.worksheets[0];
}

describe("generateCrownAdvanceListExcel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedBuffer = undefined;
  });

  it("should return success and name the worksheet 'Crown Advance List'", async () => {
    vi.mocked(renderCrownAdvanceListData).mockResolvedValue(buildRendered([{ category: "Trial", cases: [buildRow()] }]) as any);

    const result = await generateCrownAdvanceListExcel(baseOptions);
    const worksheet = await readWorksheet();

    expect(result.success).toBe(true);
    expect(result.excelPath).toBe("test-id.xlsx");
    expect(worksheet.name).toBe("Crown Advance List");
  });

  it("should write a bold English header row in the expected order", async () => {
    vi.mocked(renderCrownAdvanceListData).mockResolvedValue(buildRendered([{ category: "Trial", cases: [buildRow()] }]) as any);

    await generateCrownAdvanceListExcel(baseOptions);
    const worksheet = await readWorksheet();
    const header = worksheet.getRow(1);

    expect(header.values).toEqual([
      undefined,
      "Hearing Description",
      "Fixed For",
      "Case Reference",
      "Defendant Name(s)",
      "Prosecuting Authority",
      "Linked Cases",
      "Listing Notes"
    ]);
    expect(header.font?.bold).toBe(true);
  });

  it("should write Welsh header labels when the locale is cy", async () => {
    vi.mocked(renderCrownAdvanceListData).mockResolvedValue(buildRendered([{ category: "Trial", cases: [buildRow()] }]) as any);

    await generateCrownAdvanceListExcel({ ...baseOptions, locale: "cy" });
    const worksheet = await readWorksheet();
    const header = worksheet.getRow(1);

    expect(header.getCell(1).value).toBe("Disgrifiad o'r Gwrandawiad");
    expect(header.getCell(2).value).toBe("Wedi'i bennu ar gyfer");
    expect(header.getCell(6).value).toBe("Achosion Cysylltiedig");
  });

  it("should write one row per case with the category label and joined linked cases", async () => {
    vi.mocked(renderCrownAdvanceListData).mockResolvedValue(buildRendered([{ category: "Trial", cases: [buildRow()] }]) as any);

    await generateCrownAdvanceListExcel(baseOptions);
    const worksheet = await readWorksheet();
    const row = worksheet.getRow(2);

    expect(row.getCell(1).value).toBe("Trial");
    expect(row.getCell(2).value).toBe("13/01/2025");
    expect(row.getCell(3).value).toBe("T20250001");
    expect(row.getCell(4).value).toBe("Smith, John");
    expect(row.getCell(5).value).toBe("CPS");
    expect(row.getCell(6).value).toBe("T20250002, T20250003");
    expect(row.getCell(7).value).toBe("Note A");
  });

  it("should map the TO_BE_ALLOCATED key to the translated label", async () => {
    vi.mocked(renderCrownAdvanceListData).mockResolvedValue(buildRendered([{ category: TO_BE_ALLOCATED_KEY, cases: [buildRow()] }]) as any);

    await generateCrownAdvanceListExcel(baseOptions);
    const worksheet = await readWorksheet();

    expect(worksheet.getRow(2).getCell(1).value).toBe("To be allocated");
  });

  it("should not prefix the defendant name with an asterisk even when isInCustody is true", async () => {
    vi.mocked(renderCrownAdvanceListData).mockResolvedValue(buildRendered([{ category: "Trial", cases: [buildRow({ isInCustody: true })] }]) as any);

    await generateCrownAdvanceListExcel(baseOptions);
    const worksheet = await readWorksheet();

    expect(worksheet.getRow(2).getCell(4).value).toBe("Smith, John");
  });

  it("should not append a custody legend row beneath the data", async () => {
    vi.mocked(renderCrownAdvanceListData).mockResolvedValue(buildRendered([{ category: "Trial", cases: [buildRow({ isInCustody: true })] }]) as any);

    await generateCrownAdvanceListExcel(baseOptions);
    const worksheet = await readWorksheet();

    expect(worksheet.rowCount).toBe(2);
    expect(worksheet.getRow(2).getCell(1).value).toBe("Trial");
  });

  it("should keep en and cy excelColumns keys in parity", async () => {
    expect(Object.keys(enLocale.excelColumns).sort()).toEqual(Object.keys(cyLocale.excelColumns).sort());
  });

  it("should leave empty optional fields as empty cells", async () => {
    vi.mocked(renderCrownAdvanceListData).mockResolvedValue(
      buildRendered([{ category: "Trial", cases: [buildRow({ linkedCases: "", listingNotes: "" })] }]) as any
    );

    await generateCrownAdvanceListExcel(baseOptions);
    const worksheet = await readWorksheet();
    const row = worksheet.getRow(2);

    expect(row.getCell(6).value ?? "").toBe("");
    expect(row.getCell(7).value ?? "").toBe("");
  });

  it("should prefix a value beginning with an injection character with an apostrophe", async () => {
    vi.mocked(renderCrownAdvanceListData).mockResolvedValue(buildRendered([{ category: "Trial", cases: [buildRow({ listingNotes: "-danger" })] }]) as any);

    await generateCrownAdvanceListExcel(baseOptions);
    const worksheet = await readWorksheet();

    expect(worksheet.getRow(2).getCell(7).value).toBe("'-danger");
  });

  it("should produce a header-only workbook when there are no categories", async () => {
    vi.mocked(renderCrownAdvanceListData).mockResolvedValue(buildRendered([]) as any);

    const result = await generateCrownAdvanceListExcel(baseOptions);
    const worksheet = await readWorksheet();

    expect(result.success).toBe(true);
    expect(worksheet.rowCount).toBe(1);
    expect(worksheet.getRow(1).getCell(1).value).toBe("Hearing Description");
  });

  it("should return failure without throwing when the renderer rejects", async () => {
    vi.mocked(renderCrownAdvanceListData).mockRejectedValue(new Error("Render failed"));

    const result = await generateCrownAdvanceListExcel(baseOptions);

    expect(result.success).toBe(false);
    expect(result.error).toContain("Failed to generate Crown Advance List Excel: Render failed");
  });

  it("should return failure without throwing when the upload rejects", async () => {
    vi.mocked(renderCrownAdvanceListData).mockResolvedValue(buildRendered([{ category: "Trial", cases: [buildRow()] }]) as any);
    vi.mocked(saveExcelToStorage).mockRejectedValueOnce(new Error("Upload failed"));

    const result = await generateCrownAdvanceListExcel(baseOptions);

    expect(result.success).toBe(false);
    expect(result.error).toContain("Upload failed");
  });
});
