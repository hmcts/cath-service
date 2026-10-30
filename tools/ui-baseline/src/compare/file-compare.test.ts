import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { compareExcel, compareFileRuns, comparePdf, type FileEntry } from "./file-compare.js";

const TEST_FILES = path.join(path.dirname(fileURLToPath(import.meta.url)), "test-files");
const read = (name: string) => readFile(path.join(TEST_FILES, name));

async function workbook(build: (workbook: ExcelJS.Workbook) => void): Promise<Buffer> {
  const book = new ExcelJS.Workbook();
  build(book);
  return Buffer.from(await book.xlsx.writeBuffer());
}

function listSheet(book: ExcelJS.Workbook, rows: (string | number | Date)[][], name = "Hearings") {
  const sheet = book.addWorksheet(name);
  sheet.addRow(["Time", "Court", "Case"]).font = { bold: true };
  for (const row of rows) sheet.addRow(row);
  return sheet;
}

const ROWS = [
  ["10:00", 1, "AB1000"],
  ["11:00", 2, "AB1001"]
];

describe("comparePdf", () => {
  it("should find no differences between the same content styled differently", async () => {
    // Act
    const result = await comparePdf(await read("plain.pdf"), await read("styled.pdf"));

    // Assert
    expect(result.findings).toEqual([]);
    expect(result.pages?.target).toBeGreaterThan(result.pages?.source ?? 0);
  });

  it("should report a changed word with the words before it", async () => {
    // Act
    const result = await comparePdf(await read("plain.pdf"), await read("changed.pdf"));

    // Assert
    expect(result.findings).toEqual([{ category: "pdf", change: "reworded", detail: 'after "v Jones 10:03 Court": "3" → "9"' }]);
  });

  it("should not report dates that come from when each app was seeded", async () => {
    // Arrange
    const plain = await read("plain.pdf");

    // Act
    const result = await comparePdf(plain, plain, { seededAt: "2023-09-01T09:00:00Z" }, { seededAt: "2023-09-01T10:30:00Z" });

    // Assert
    expect(result.findings).toEqual([]);
    expect(result.texts?.source[1]).toBe("List for <RUN_DATE>");
  });
});

describe("compareExcel", () => {
  it("should find no differences when only styling and document properties differ", async () => {
    // Arrange
    const a = await workbook((book) => {
      book.creator = "Apache POI";
      listSheet(book, ROWS);
    });
    const b = await workbook((book) => {
      book.creator = "exceljs";
      book.created = new Date("2020-01-01");
      const sheet = listSheet(book, ROWS);
      sheet.getColumn(3).width = 40;
      sheet.getRow(1).font = { italic: true };
    });

    // Act
    const result = await compareExcel(a, b);

    // Assert
    expect(result.findings).toEqual([]);
  });

  it("should report changed values, types, missing cells, sheet names and merges", async () => {
    // Arrange
    const a = await workbook((book) => {
      const sheet = listSheet(book, [...ROWS, ["12:00", 3, "AB1002"]]);
      sheet.mergeCells("A5:C5");
      sheet.getCell("A5").value = "End of list";
    });
    const b = await workbook((book) => {
      listSheet(book, [["10:00", 1, "AB1000"], ["11:00", "2", "AB9999"], ["12:00"]], "Sheet1");
    });

    // Act
    const result = await compareExcel(a, b);

    // Assert
    expect(result.findings).toEqual([
      { category: "excel", change: "sheet-name", detail: 'sheet 1: "Hearings" → "Sheet1"' },
      { category: "excel", change: "cell-type", detail: 'Hearings!B3 "2": number → text' },
      { category: "excel", change: "cell-value", detail: 'Hearings!C3: "AB1001" → "AB9999"' },
      { category: "excel", change: "cell-missing", detail: 'Hearings!B4 "3"' },
      { category: "excel", change: "cell-missing", detail: 'Hearings!C4 "AB1002"' },
      { category: "excel", change: "cell-missing", detail: 'Hearings!A5 "End of list"' },
      { category: "excel", change: "merge-missing", detail: "Hearings!A5:C5" }
    ]);
  });

  it("should report a sheet only one workbook has", async () => {
    // Arrange
    const a = await workbook((book) => listSheet(book, ROWS));
    const b = await workbook((book) => {
      listSheet(book, ROWS);
      listSheet(book, ROWS, "Welsh");
    });

    // Act
    const result = await compareExcel(a, b);

    // Assert
    expect(result.findings).toEqual([{ category: "excel", change: "sheet-extra", detail: 'sheet 2 "Welsh"' }]);
  });

  it("should cap the findings for a workbook", async () => {
    // Arrange
    const many = Array.from({ length: 30 }, (_, i) => [`${i}`, i, `case ${i}`]);
    const a = await workbook((book) => listSheet(book, many));
    const b = await workbook((book) =>
      listSheet(
        book,
        many.map(([time]) => [time])
      )
    );

    // Act
    const result = await compareExcel(a, b);

    // Assert
    expect(result.findings).toHaveLength(51);
    expect(result.findings.at(-1)).toEqual({ category: "excel", change: "more", detail: "10 more differences" });
  });
});

describe("compareFileRuns", () => {
  it("should pair files by publication and kind, and report files only one app made", async () => {
    // Arrange
    const root = await mkdtemp(path.join(tmpdir(), "file-compare-"));
    const run = async (name: string, files: [FileEntry, Buffer][]) => {
      const dir = path.join(root, name);
      for (const [entry, data] of files) {
        await mkdir(path.dirname(path.join(dir, entry.file)), { recursive: true });
        await writeFile(path.join(dir, entry.file), data);
      }
      await writeFile(path.join(dir, "index.jsonl"), files.map(([entry]) => `${JSON.stringify(entry)}\n`).join(""));
      return dir;
    };
    const entry = (id: string, kind: FileEntry["kind"], data: Buffer): [FileEntry, Buffer] => [
      { id, kind, file: `${id}/${kind}.${kind === "excel" ? "xlsx" : "pdf"}`, blob: `x.${kind}`, bytes: data.length },
      data
    ];
    const plain = await read("plain.pdf");
    const source = await run("pip", [entry("civil", "pdf", plain), entry("civil", "pdf-welsh", plain), entry("sjp", "pdf", plain)]);
    const target = await run("cath", [entry("civil", "pdf", await read("styled.pdf")), entry("sjp", "pdf", await read("changed.pdf"))]);

    // Act
    const summary = await compareFileRuns({ source, target, out: path.join(root, "compare") });

    // Assert
    expect(summary.totals).toEqual({ files: 3, match: 1, differs: 1, missing: 1, extra: 0 });
    expect(summary.results.map((r) => `${r.id} ${r.kind} ${r.verdict}`)).toEqual(["civil pdf match", "civil pdf-welsh missing", "sjp pdf differs"]);
    expect(await readFile(path.join(root, "compare/sjp/pdf-target.txt"), "utf-8")).toContain("10:03 Court 9 AB1003 Smith v Jones");
  });
});
