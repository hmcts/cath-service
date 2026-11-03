import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { compareBinary, compareCsv, compareExcel, compareFileRuns, comparePdf, type FileEntry } from "./file-compare.js";

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

  it("should find no differences where only line wrapping and a page footer differ", async () => {
    // Act
    const result = await comparePdf(await read("plain.pdf"), await read("wrapped.pdf"));

    // Assert
    expect(result.findings).toEqual([]);
    expect(result.texts?.target).toContain("England and Wales, and some non-");
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

  it("should report a sheet, cells and merges only one workbook has, in sheet order", async () => {
    // Arrange
    const a = await workbook((book) => {
      listSheet(book, ROWS);
      listSheet(book, ROWS, "Welsh");
    });
    const b = await workbook((book) => {
      const sheet = listSheet(book, ROWS);
      sheet.getCell("AA2").value = "far right";
      sheet.getCell("B2").value = "1";
      sheet.getCell("D2").value = "note";
      sheet.mergeCells("D3:E3");
      sheet.getCell("D3").value = "merged";
    });

    // Act
    const result = await compareExcel(a, b);

    // Assert
    expect(result.findings).toEqual([
      { category: "excel", change: "cell-type", detail: 'Hearings!B2 "1": number → text' },
      { category: "excel", change: "cell-extra", detail: 'Hearings!D2 "note"' },
      { category: "excel", change: "cell-extra", detail: 'Hearings!AA2 "far right"' },
      { category: "excel", change: "cell-extra", detail: 'Hearings!D3 "merged"' },
      { category: "excel", change: "merge-extra", detail: "Hearings!D3:E3" },
      { category: "excel", change: "sheet-missing", detail: 'sheet 2 "Welsh"' }
    ]);
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

describe("compareFileRuns with other kinds of file", () => {
  it("should compare CSV and binary files, report extra files, and keep only the listed publications", async () => {
    // Arrange
    const root = await mkdtemp(path.join(tmpdir(), "file-compare-"));
    const run = async (name: string, files: { id: string; kind: FileEntry["kind"]; data: string }[]) => {
      const dir = path.join(root, name);
      await mkdir(dir, { recursive: true });
      for (const file of files) {
        await mkdir(path.join(dir, file.id), { recursive: true });
        await writeFile(path.join(dir, file.id, file.kind), file.data);
      }
      const entries = files.map((file) => ({ id: file.id, kind: file.kind, file: `${file.id}/${file.kind}`, blob: "x", bytes: file.data.length }));
      await writeFile(path.join(dir, "index.jsonl"), entries.map((entry) => `${JSON.stringify(entry)}\n`).join(""));
      return dir;
    };
    const source = await run("pip", [
      { id: "ref", kind: "csv", data: "a,b\n1,2\n" },
      { id: "ref", kind: "binary", data: "png" },
      { id: "other", kind: "binary", data: "x" }
    ]);
    const target = await run("cath", [
      { id: "ref", kind: "csv", data: "a,b\n1,3\n" },
      { id: "ref", kind: "binary", data: "png" },
      { id: "ref", kind: "excel", data: "x" },
      { id: "other", kind: "binary", data: "y" }
    ]);
    const out = path.join(root, "compare");

    // Act
    const summary = await compareFileRuns({ source, target, out, only: ["ref"] });

    // Assert
    expect(summary.results.map((r) => `${r.id} ${r.kind} ${r.verdict}`)).toEqual(["ref binary match", "ref csv differs", "ref excel extra"]);
    expect(summary.results[2]).toMatchObject({ source: undefined, target: { bytes: 1 } });
    expect(await readFile(path.join(out, "ref/csv-source.txt"), "utf-8")).toBe("a,b\n1,2\n");
    expect(JSON.parse(await readFile(path.join(out, "files-compare.json"), "utf-8")).totals).toEqual({ files: 3, match: 1, differs: 1, missing: 0, extra: 1 });
  });

  it("should compare nothing when neither run has an index", async () => {
    // Arrange
    const root = await mkdtemp(path.join(tmpdir(), "file-compare-"));

    // Act
    const summary = await compareFileRuns({ source: path.join(root, "a"), target: path.join(root, "b"), out: path.join(root, "out") });

    // Assert
    expect(summary.totals.files).toBe(0);
  });
});

describe("compareCsv", () => {
  it("should report changed, missing and extra lines, and mask dates from seeding", () => {
    // Arrange
    const pip = Buffer.from("﻿Id,Name,Updated\n1,Oxford,30/10/2026 10:00:00\n2,Leeds,30/10/2026 10:00:00\n3,York,30/10/2026\n");
    const cath = Buffer.from("Id,Name,Updated\n1,Oxford,30/10/2026 11:30:00\n2,Leeds Combined,30/10/2026 11:30:00\n4,Bath,30/10/2026\n");

    // Act
    const result = compareCsv(pip, cath, { seededAt: "2026-10-30T10:00:00Z" }, { seededAt: "2026-10-30T11:30:00Z" });

    // Assert
    expect(result.findings).toEqual([
      { category: "csv", change: "line-changed", detail: 'line 3: "2,Leeds,<RUN_DATE> <RUN_TIME>" → "2,Leeds Combined,<RUN_DATE> <RUN_TIME>"' },
      { category: "csv", change: "line-changed", detail: 'line 4: "3,York,<RUN_DATE>" → "4,Bath,<RUN_DATE>"' }
    ]);
  });

  it("should find no differences between the same lines with different line endings", () => {
    // Act
    const result = compareCsv(Buffer.from("a,b\r\n1,2\r\n"), Buffer.from("a,b\n1,2\n"));

    // Assert
    expect(result.findings).toEqual([]);
  });
});

describe("compareCsv when lines are only added or removed", () => {
  it("should report removed lines by number and added lines by content", () => {
    // Arrange
    const pip = Buffer.from("h\n1\n2\n3\n4\n");
    const cath = Buffer.from("h\n1\n3\n4\n5\n6\n");

    // Act
    const result = compareCsv(pip, cath);

    // Assert
    expect(result.findings).toEqual([
      { category: "csv", change: "line-missing", detail: 'line 3: "2"' },
      { category: "csv", change: "line-extra", detail: '"5"' },
      { category: "csv", change: "line-extra", detail: '"6"' }
    ]);
  });

  it("should report the leftover lines of an uneven replacement as missing or extra", () => {
    // Act
    const fewer = compareCsv(Buffer.from("h\na\nb\nc\nz\n"), Buffer.from("h\nx\nz\n"));
    const more = compareCsv(Buffer.from("h\na\nz\n"), Buffer.from("h\nx\ny\nz\n"));

    // Assert
    expect(fewer.findings).toEqual([
      { category: "csv", change: "line-changed", detail: 'line 2: "a" → "x"' },
      { category: "csv", change: "line-missing", detail: 'line 3: "b"' },
      { category: "csv", change: "line-missing", detail: 'line 4: "c"' }
    ]);
    expect(more.findings).toEqual([
      { category: "csv", change: "line-changed", detail: 'line 2: "a" → "x"' },
      { category: "csv", change: "line-extra", detail: '"y"' }
    ]);
  });

  it("should report the files as rewritten when they differ too much to diff", () => {
    // Arrange
    const lines = (prefix: string) => Buffer.from(Array.from({ length: 1001 }, (_, i) => `${prefix}${i}`).join("\n"));

    // Act
    const result = compareCsv(lines("a"), lines("b"));

    // Assert
    expect(result.findings).toEqual([{ category: "csv", change: "rewritten", detail: "the files differ throughout: 1001 lines against 1001" }]);
  });
});

describe("compareBinary", () => {
  it("should match identical files and report different ones by size", () => {
    // Act
    const same = compareBinary(Buffer.from([1, 2, 3]), Buffer.from([1, 2, 3]));
    const different = compareBinary(Buffer.from([1, 2, 3]), Buffer.from([1, 2]));

    // Assert
    expect(same.findings).toEqual([]);
    expect(different.findings).toEqual([{ category: "file", change: "content", detail: "the files differ: pip 3 bytes, CaTH 2 bytes" }]);
  });
});
