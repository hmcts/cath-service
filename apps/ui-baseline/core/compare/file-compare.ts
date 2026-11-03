import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Finding } from "./compare.js";
import { excelCells, type SheetContent } from "./excel-cells.js";
import { type NormaliseContext, normalise } from "./normalise.js";
import { pdfText } from "./pdf-text.js";
import { diffSequences } from "./sequence-diff.js";

// Compares the files each app generated for a publication, recorded by collectFiles. PDFs are
// styled differently by design, so only their text is compared, word by word in reading order:
// line wrapping and page breaks follow from styling and are ignored. Excel files should match
// exactly, so every sheet, cell (type and value) and merged range is compared.
const MAX_FINDINGS = 50;
const CONTEXT_WORDS = 4;

export async function compareFileRuns(options: FileCompareOptions): Promise<FileCompareSummary> {
  const sourceIndex = await readFileIndex(options.source);
  const targetIndex = await readFileIndex(options.target);
  const wanted = (entry: FileEntry) => !options.only || options.only.includes(entry.id);
  const keys = [...new Set([...sourceIndex.keys(), ...targetIndex.keys()])].filter((key) =>
    wanted((sourceIndex.get(key) ?? targetIndex.get(key)) as FileEntry)
  );

  const results: FileCompareResult[] = [];
  for (const key of keys.sort()) {
    const source = sourceIndex.get(key);
    const target = targetIndex.get(key);
    const { id, kind } = (source ?? target) as FileEntry;
    if (!source || !target) {
      results.push({ id, kind, verdict: source ? "missing" : "extra", findings: [], source: source && sizeOf(source), target: target && sizeOf(target) });
      continue;
    }
    const [sourceData, targetData] = await Promise.all([readFile(path.join(options.source, source.file)), readFile(path.join(options.target, target.file))]);
    const pair = await COMPARERS[kind](sourceData, targetData, source, target);
    if (pair.texts) {
      await mkdir(path.join(options.out, id), { recursive: true });
      await writeFile(path.join(options.out, id, `${kind}-source.txt`), `${pair.texts.source.join("\n")}\n`);
      await writeFile(path.join(options.out, id, `${kind}-target.txt`), `${pair.texts.target.join("\n")}\n`);
    }
    results.push({
      id,
      kind,
      verdict: pair.findings.length ? "differs" : "match",
      findings: pair.findings,
      source: { ...sizeOf(source), pages: pair.pages?.source },
      target: { ...sizeOf(target), pages: pair.pages?.target }
    });
  }

  const summary: FileCompareSummary = {
    source: options.source,
    target: options.target,
    comparedAt: new Date().toISOString(),
    totals: {
      files: results.length,
      match: results.filter((r) => r.verdict === "match").length,
      differs: results.filter((r) => r.verdict === "differs").length,
      missing: results.filter((r) => r.verdict === "missing").length,
      extra: results.filter((r) => r.verdict === "extra").length
    },
    results
  };
  await mkdir(options.out, { recursive: true });
  await writeFile(path.join(options.out, "files-compare.json"), `${JSON.stringify(summary, null, 2)}\n`);
  return summary;
}

// How each kind of file is compared; PDFs by text, spreadsheets by cell, CSV by line, the rest whole
const COMPARERS: Record<
  FileKind,
  (source: Uint8Array, target: Uint8Array, sourceContext: NormaliseContext, targetContext: NormaliseContext) => Promise<PairComparison>
> = {
  pdf: (...args) => comparePdf(...args),
  "pdf-welsh": (...args) => comparePdf(...args),
  excel: (...args) => compareExcel(...args),
  csv: async (...args) => compareCsv(...args),
  binary: async (source, target) => compareBinary(source, target)
};

export async function comparePdf(
  source: Uint8Array,
  target: Uint8Array,
  sourceContext: NormaliseContext = {},
  targetContext: NormaliseContext = {}
): Promise<PairComparison> {
  const [a, b] = await Promise.all([pdfText(source), pdfText(target)]);
  const sourceLines = a.lines.map((line) => normalise(line, sourceContext));
  const targetLines = b.lines.map((line) => normalise(line, targetContext));
  return {
    findings: capped(textFindings(pdfWords(sourceLines), pdfWords(targetLines))),
    pages: { source: a.pages, target: b.pages },
    texts: { source: sourceLines, target: targetLines }
  };
}

export async function compareExcel(
  source: Uint8Array,
  target: Uint8Array,
  sourceContext: NormaliseContext = {},
  targetContext: NormaliseContext = {}
): Promise<PairComparison> {
  const [a, b] = await Promise.all([excelCells(source), excelCells(target)]);
  const findings: Finding[] = [];
  for (let index = 0; index < Math.max(a.sheets.length, b.sheets.length); index++) {
    const sourceSheet = a.sheets[index];
    const targetSheet = b.sheets[index];
    if (!targetSheet) findings.push({ category: "excel", change: "sheet-missing", detail: `sheet ${index + 1} "${sourceSheet.name}"` });
    else if (!sourceSheet) findings.push({ category: "excel", change: "sheet-extra", detail: `sheet ${index + 1} "${targetSheet.name}"` });
    else {
      if (sourceSheet.name !== targetSheet.name)
        findings.push({ category: "excel", change: "sheet-name", detail: `sheet ${index + 1}: "${sourceSheet.name}" → "${targetSheet.name}"` });
      findings.push(...sheetFindings(sourceSheet, targetSheet, sourceContext, targetContext));
    }
  }
  return { findings: capped(findings) };
}

// A CSV file line by line, in order, with seed-time dates masked
export function compareCsv(source: Uint8Array, target: Uint8Array, sourceContext: NormaliseContext = {}, targetContext: NormaliseContext = {}): PairComparison {
  const lines = (data: Uint8Array, context: NormaliseContext) =>
    normalise(
      Buffer.from(data)
        .toString("utf-8")
        .replace(/^\uFEFF/, ""),
      context
    )
      .split(/\r?\n/)
      .filter((line) => line.trim() !== "");
  const a = lines(source, sourceContext);
  const b = lines(target, targetContext);
  const runs = diffSequences(a, b);
  if (!runs)
    return {
      findings: [{ category: "csv", change: "rewritten", detail: `the files differ throughout: ${a.length} lines against ${b.length}` }],
      texts: { source: a, target: b }
    };
  const findings: Finding[] = [];
  let line = 0;
  for (let index = 0; index < runs.length; index++) {
    const run = runs[index];
    if (run.kind === "equal") {
      line += run.items.length;
      continue;
    }
    const next = runs[index + 1];
    if (run.kind === "delete" && next?.kind === "insert") {
      run.items.forEach((item, i) => {
        findings.push(
          i < next.items.length
            ? { category: "csv", change: "line-changed", detail: `line ${line + i + 1}: "${item}" → "${next.items[i]}"` }
            : { category: "csv", change: "line-missing", detail: `line ${line + i + 1}: "${item}"` }
        );
      });
      for (const extra of next.items.slice(run.items.length)) findings.push({ category: "csv", change: "line-extra", detail: `"${extra}"` });
      line += run.items.length;
      index++;
    } else if (run.kind === "delete") {
      for (const item of run.items) findings.push({ category: "csv", change: "line-missing", detail: `line ${++line}: "${item}"` });
    } else for (const item of run.items) findings.push({ category: "csv", change: "line-extra", detail: `"${item}"` });
  }
  return { findings: capped(findings), texts: { source: a, target: b } };
}

// Anything else (an image) is the same only if it is byte for byte
export function compareBinary(source: Uint8Array, target: Uint8Array): PairComparison {
  const digest = (data: Uint8Array) => createHash("sha256").update(data).digest("hex");
  return digest(source) === digest(target)
    ? { findings: [] }
    : { findings: [{ category: "file", change: "content", detail: `the files differ: pip ${source.length} bytes, CaTH ${target.length} bytes` }] };
}

// The words of a PDF's lines in reading order. A word broken across lines at a hyphen ("non-" then
// "devolved", or a long URL) is one word: where a line wraps follows from styling.
function pdfWords(lines: string[]): string[] {
  const words: string[] = [];
  let joinNext = false;
  for (const line of lines) {
    const lineWords = line.split(" ").filter(Boolean);
    if (joinNext && lineWords.length) words.push(`${words.pop()}${lineWords.shift()}`);
    words.push(...lineWords);
    joinNext = /[\p{L}\d]-$/u.test(words.at(-1) ?? "");
  }
  return words;
}

// Each run of words that differs, with the words before it so a reader can find it
function textFindings(a: string[], b: string[]): Finding[] {
  const runs = diffSequences(a, b);
  if (!runs) {
    const remaining = new Map<string, number>();
    for (const word of b) remaining.set(word, (remaining.get(word) ?? 0) + 1);
    const shared = a.filter((word) => {
      const count = remaining.get(word) ?? 0;
      if (count) remaining.set(word, count - 1);
      return count > 0;
    }).length;
    return [{ category: "pdf", change: "rewritten", detail: `the text differs throughout: ${shared} of ${a.length} words in common` }];
  }

  const findings: Finding[] = [];
  for (let index = 0; index < runs.length; index++) {
    const run = runs[index];
    if (run.kind === "equal") continue;
    const next = runs[index + 1];
    const replaced = run.kind === "delete" && next?.kind === "insert" ? next.items : null;
    const before = runs[index - 1]?.kind === "equal" ? runs[index - 1].items.slice(-CONTEXT_WORDS).join(" ") : "";
    const context = before ? `after "${before}": ` : "at the start: ";
    if (replaced) {
      findings.push({ category: "pdf", change: "reworded", detail: `${context}"${run.items.join(" ")}" → "${replaced.join(" ")}"` });
      index++;
    } else findings.push({ category: "pdf", change: run.kind === "delete" ? "missing" : "extra", detail: `${context}"${run.items.join(" ")}"` });
  }
  return findings;
}

function sheetFindings(a: SheetContent, b: SheetContent, sourceContext: NormaliseContext, targetContext: NormaliseContext): Finding[] {
  const findings: Finding[] = [];
  const at = (address: string) => `${a.name}!${address}`;
  const addresses = [...new Set([...Object.keys(a.cells), ...Object.keys(b.cells)])].sort(byCell);
  for (const address of addresses) {
    const sourceCell = a.cells[address];
    const targetCell = b.cells[address];
    const sourceText = sourceCell && normalise(sourceCell.text, sourceContext);
    const targetText = targetCell && normalise(targetCell.text, targetContext);
    if (!targetCell) findings.push({ category: "excel", change: "cell-missing", detail: `${at(address)} "${sourceText}"` });
    else if (!sourceCell) findings.push({ category: "excel", change: "cell-extra", detail: `${at(address)} "${targetText}"` });
    else if (sourceText !== targetText) findings.push({ category: "excel", change: "cell-value", detail: `${at(address)}: "${sourceText}" → "${targetText}"` });
    else if (sourceCell.type !== targetCell.type)
      findings.push({ category: "excel", change: "cell-type", detail: `${at(address)} "${sourceText}": ${sourceCell.type} → ${targetCell.type}` });
  }
  for (const range of a.merges.filter((range) => !b.merges.includes(range))) findings.push({ category: "excel", change: "merge-missing", detail: at(range) });
  for (const range of b.merges.filter((range) => !a.merges.includes(range))) findings.push({ category: "excel", change: "merge-extra", detail: at(range) });
  return findings;
}

// Row by row, then column by column, so findings read in the order of the sheet
function byCell(a: string, b: string): number {
  const parse = (address: string) => {
    const [, letters, row] = address.match(/^([A-Z]+)(\d+)$/) ?? ["", "", "0"];
    return { row: Number(row), column: [...letters].reduce((column, letter) => column * 26 + letter.charCodeAt(0) - 64, 0) };
  };
  const x = parse(a);
  const y = parse(b);
  return x.row - y.row || x.column - y.column || a.localeCompare(b);
}

function capped(findings: Finding[]): Finding[] {
  if (findings.length <= MAX_FINDINGS) return findings;
  const [{ category }] = findings;
  return [...findings.slice(0, MAX_FINDINGS), { category, change: "more", detail: `${findings.length - MAX_FINDINGS} more differences` }];
}

async function readFileIndex(dir: string): Promise<Map<string, FileEntry>> {
  const file = path.join(dir, "index.jsonl");
  if (!existsSync(file)) return new Map();
  const entries = (await readFile(file, "utf-8"))
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as FileEntry);
  return new Map(entries.map((entry) => [`${entry.id} ${entry.kind}`, entry]));
}

function sizeOf(entry: FileEntry): { bytes: number } {
  return { bytes: entry.bytes };
}

export interface FileCompareOptions {
  source: string;
  target: string;
  out: string;
  only?: string[];
}

// pdf: the list's PDF. pdf-welsh: the additional Welsh PDF pip makes for bilingual lists
// (<artefactId>_cy.pdf). excel: the list's spreadsheet. csv and binary: other downloads
// (reference data, a proof of ID image).
export type FileKind = "pdf" | "pdf-welsh" | "excel" | "csv" | "binary";

export interface FileEntry extends NormaliseContext {
  id: string;
  kind: FileKind;
  // Relative to the run directory
  file: string;
  blob: string;
  bytes: number;
}

export interface PairComparison {
  findings: Finding[];
  pages?: { source: number; target: number };
  texts?: { source: string[]; target: string[] };
}

export interface FileCompareResult {
  id: string;
  kind: FileKind;
  // missing: the source app made the file and the target did not; extra: the other way round
  verdict: "match" | "differs" | "missing" | "extra";
  findings: Finding[];
  source?: { bytes: number; pages?: number };
  target?: { bytes: number; pages?: number };
}

export interface FileCompareSummary {
  source: string;
  target: string;
  comparedAt: string;
  totals: { files: number; match: number; differs: number; missing: number; extra: number };
  results: FileCompareResult[];
}
