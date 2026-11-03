import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { type PageStructure, parseAria, structureOf } from "./aria.js";
import { type NormaliseContext, normalise } from "./normalise.js";

// Compares every capture in a source run (e.g. pip) with the capture of the same id, locale and
// state in a target run (e.g. CaTH). Deterministic: each pair gets a verdict and a list of
// categorised findings; judging whether a finding is intended comes later, against the ticket.
export async function compareRuns(options: CompareOptions): Promise<CompareSummary> {
  const sourceIndex = await readIndex(options.source);
  const targetIndex = new Map((await readIndex(options.target)).map((entry) => [key(entry), entry]));
  const pairs = sourceIndex.filter((entry) => !options.only || options.only.includes(entry.id));

  const results: PairResult[] = [];
  for (const sourceEntry of pairs) {
    const targetEntry = targetIndex.get(key(sourceEntry));
    if (!targetEntry) {
      results.push({ id: sourceEntry.id, locale: sourceEntry.locale, state: sourceEntry.state, verdict: "not-captured", findings: [] });
      continue;
    }
    results.push(await comparePair(options, sourceEntry, targetEntry));
  }

  const summary: CompareSummary = {
    source: options.source,
    target: options.target,
    comparedAt: new Date().toISOString(),
    patterns: patternsOf(results),
    totals: {
      pairs: results.length,
      match: results.filter((r) => r.verdict === "match").length,
      differs: results.filter((r) => r.verdict === "differs").length,
      notCaptured: results.filter((r) => r.verdict === "not-captured").length
    },
    results
  };
  await mkdir(options.out, { recursive: true });
  await writeFile(path.join(options.out, "compare.json"), `${JSON.stringify(summary, null, 2)}\n`);
  return summary;
}

function dedupe(findings: Finding[]): Finding[] {
  const counts = new Map<string, { finding: Finding; count: number }>();
  for (const finding of findings) {
    const key = `${finding.category}|${finding.change}|${finding.detail}`;
    const entry = counts.get(key);
    if (entry) entry.count++;
    else counts.set(key, { finding, count: 1 });
  }
  return [...counts.values()].map(({ finding, count }) => (count > 1 ? { ...finding, detail: `${finding.detail} (×${count})` } : finding));
}

// A "missing" and an "extra" of the same kind whose words mostly overlap are one reworded item, which
// is what a reviewer needs to judge: the before and the after side by side
function pairReworded(findings: Finding[]): Finding[] {
  const result: Finding[] = [];
  const extras = findings.filter((f) => f.change === "extra");
  const used = new Set<Finding>();
  for (const finding of findings) {
    if (finding.change === "extra") continue;
    if (finding.change !== "missing") {
      result.push(finding);
      continue;
    }
    const before = quoted(finding.detail);
    const match = extras
      .filter((extra) => extra.category === finding.category && !used.has(extra))
      .map((extra) => ({ extra, score: similarity(before, quoted(extra.detail)) }))
      .sort((a, b) => b.score - a.score)[0];
    if (match && match.score >= REWORD_SIMILARITY) {
      used.add(match.extra);
      result.push({ category: finding.category, change: "reworded", detail: `${finding.detail} → ${match.extra.detail}` });
    } else result.push(finding);
  }
  return [...result, ...extras.filter((extra) => !used.has(extra))];
}

const REWORD_SIMILARITY = 0.5;

function quoted(detail: string): string {
  return detail.match(/"(.*)"/)?.[1] ?? detail;
}

// Share of distinct words in common, ignoring case and punctuation
function similarity(a: string, b: string): number {
  const words = (text: string) =>
    new Set(
      text
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, " ")
        .split(/\s+/)
        .filter(Boolean)
    );
  const wa = words(a);
  const wb = words(b);
  if (!wa.size || !wb.size) return 0;
  const shared = [...wa].filter((w) => wb.has(w)).length;
  return shared / Math.max(wa.size, wb.size);
}

// Findings repeated across pages are usually one cause (a shared template, layout or locale setup),
// so they are reported once with every page they appear on
function patternsOf(results: PairResult[]): Pattern[] {
  const byKey = new Map<string, Pattern>();
  for (const result of results) {
    for (const finding of result.findings) {
      if (finding.category === "axe-inherited") continue;
      const detail = patternDetail(finding);
      const key = `${finding.category}|${finding.change}|${detail}`;
      const pattern = byKey.get(key) ?? { category: finding.category, change: finding.change, detail, pages: [] };
      const page = `${result.id} ${result.locale}${result.state === "default" ? "" : ` (${result.state})`}`;
      if (!pattern.pages.includes(page)) pattern.pages.push(page);
      byKey.set(key, pattern);
    }
  }
  return [...byKey.values()].filter((pattern) => pattern.pages.length > 1).sort((a, b) => b.pages.length - a.pages.length);
}

// Page-specific parts are reduced to their shape so the same change on different pages groups together
function patternDetail(finding: Finding): string {
  if (finding.category === "page" && finding.change === "title") {
    const [, before, after] = finding.detail.match(/^"(.*)" → "(.*)"$/) ?? [];
    if (before && after?.startsWith(before)) return `title gains suffix "${after.slice(before.length)}"`;
    if (before && after?.includes(" - ")) return `title changes and gains suffix "${after.slice(after.indexOf(" - "))}"`;
  }
  if (finding.category === "heading" && finding.change === "level") return finding.detail.replace(/^".*" /, "");
  return finding.detail;
}

async function comparePair(options: CompareOptions, sourceEntry: IndexEntry, targetEntry: IndexEntry): Promise<PairResult> {
  const sourceDir = path.join(options.source, sourceEntry.id, sourceEntry.locale, sourceEntry.state);
  const targetDir = path.join(options.target, targetEntry.id, targetEntry.locale, targetEntry.state);
  const [sourceAria, targetAria] = await Promise.all([readNormalised(sourceDir, "aria.yml"), readNormalised(targetDir, "aria.yml")]);
  const source = structureOf(parseAria(sourceAria));
  const target = structureOf(parseAria(targetAria));
  const unorderedRows = options.unorderedRows?.includes(sourceEntry.id) ?? false;

  const findings: Finding[] = [
    ...promotedText(source, target),
    ...compareHeadings(source, target),
    ...compareTables(source, target, unorderedRows),
    ...compareControls(source, target),
    ...compareNamed("button", source.buttons, target.buttons),
    ...compareNamed(
      "link",
      source.links.map((l) => l.text),
      target.links.map((l) => l.text)
    ),
    ...compareText(source.text, target.text, source, target),
    ...(await compareMeta(sourceDir, targetDir)),
    ...(await compareAxe(sourceDir, targetDir))
  ];
  // The same finding can occur several times on one page (e.g. a heading repeated per court)
  const unique = dedupe(pairReworded(findings));
  // Accessibility findings that CaTH inherits unchanged from pip are not differences between them
  const differences = unique.filter((f) => f.category !== "axe-inherited");
  return {
    id: sourceEntry.id,
    locale: sourceEntry.locale,
    state: sourceEntry.state,
    verdict: differences.length ? "differs" : "match",
    findings: unique
  };
}

async function readNormalised(dir: string, file: string): Promise<string> {
  const provenance = JSON.parse(await readFile(path.join(dir, "provenance.json"), "utf-8").catch(() => "{}"));
  const context: NormaliseContext = {
    seededAt: provenance.source?.seededAt ?? provenance.capturedAt ?? null,
    knownIds: provenance.source?.artefactId ? { [`<artefact:${provenance.source.fixture ?? provenance.id}>`]: provenance.source.artefactId } : {}
  };
  return normalise(await readFile(path.join(dir, file), "utf-8"), context);
}

function compareHeadings(source: PageStructure, target: PageStructure): Finding[] {
  const findings: Finding[] = [];
  const targetByText = new Map(target.headings.map((h) => [h.text, h]));
  for (const heading of source.headings) {
    const match = targetByText.get(heading.text);
    if (!match) findings.push({ category: "heading", change: "missing", detail: `"${heading.text}" (h${heading.level})` });
    else if (match.level !== heading.level)
      findings.push({ category: "heading", change: "level", detail: `"${heading.text}" h${heading.level} → h${match.level}` });
  }
  const sourceTexts = new Set(source.headings.map((h) => h.text));
  const sourcePlain = new Set(source.text);
  for (const heading of target.headings) {
    if (!sourceTexts.has(heading.text) && !sourcePlain.has(heading.text))
      findings.push({ category: "heading", change: "extra", detail: `"${heading.text}" (h${heading.level})` });
  }
  const targetPlain = new Set(target.text);
  for (const finding of findings.filter((f) => f.change === "missing")) {
    const text = finding.detail.match(/^"(.*)" \(h\d\)$/)?.[1];
    if (text && targetPlain.has(text)) finding.change = "heading-to-text";
  }
  const sourceH1 = source.headings.filter((h) => h.level === 1).length;
  const targetH1 = target.headings.filter((h) => h.level === 1).length;
  if (sourceH1 !== targetH1) findings.push({ category: "heading", change: "h1-count", detail: `${sourceH1} → ${targetH1} level-1 headings` });
  return findings;
}

function compareTables(source: PageStructure, target: PageStructure, unorderedRows: boolean): Finding[] {
  const findings: Finding[] = [];
  if (source.tables.length !== target.tables.length)
    findings.push({ category: "table", change: "count", detail: `${source.tables.length} → ${target.tables.length} tables` });
  const count = Math.min(source.tables.length, target.tables.length);
  for (let t = 0; t < count; t++) {
    const a = source.tables[t];
    const b = target.tables[t];
    const label = `table ${t + 1}`;
    if (a.columns.join("|") !== b.columns.join("|")) {
      const missing = a.columns.filter((c) => !b.columns.includes(c));
      const extra = b.columns.filter((c) => !a.columns.includes(c));
      findings.push({
        category: "table",
        change: "columns",
        detail: `${label}: ${missing.length ? `missing ${missing.map((c) => `"${c}"`).join(", ")}` : ""}${missing.length && extra.length ? "; " : ""}${extra.length ? `extra ${extra.map((c) => `"${c}"`).join(", ")}` : ""}${!missing.length && !extra.length ? "same columns in a different order" : ""}`
      });
    }
    const rowsA = unorderedRows ? [...a.rows].map((r) => r.join(" | ")).sort() : a.rows.map((r) => r.join(" | "));
    const rowsB = unorderedRows ? [...b.rows].map((r) => r.join(" | ")).sort() : b.rows.map((r) => r.join(" | "));
    if (rowsA.length !== rowsB.length) findings.push({ category: "table", change: "rows", detail: `${label}: ${rowsA.length} → ${rowsB.length} rows` });
    for (let r = 0; r < Math.min(rowsA.length, rowsB.length); r++) {
      if (rowsA[r] !== rowsB[r]) findings.push({ category: "table", change: "cells", detail: `${label} row ${r + 1}: "${rowsA[r]}" → "${rowsB[r]}"` });
    }
  }
  return findings;
}

function compareControls(source: PageStructure, target: PageStructure): Finding[] {
  const findings: Finding[] = [];
  for (const control of target.controls)
    if (!control.label) findings.push({ category: "form", change: "unlabelled", detail: `${control.role} has no accessible label` });
  const describe = (c: { role: string; label: string }) => `${c.role} "${c.label}"`;
  const a = source.controls.map(describe);
  const b = target.controls.map(describe);
  for (const item of a.filter((x) => !b.includes(x))) findings.push({ category: "form", change: "missing", detail: item });
  for (const item of b.filter((x) => !a.includes(x))) findings.push({ category: "form", change: "extra", detail: item });
  return findings;
}

function compareNamed(category: string, a: string[], b: string[]): Finding[] {
  const findings: Finding[] = [];
  for (const item of a.filter((x) => !b.includes(x))) findings.push({ category, change: "missing", detail: `"${item}"` });
  for (const item of b.filter((x) => !a.includes(x))) findings.push({ category, change: "extra", detail: `"${item}"` });
  return findings;
}

// Text that became a heading (or a heading that became text) is one change, reported once
function promotedText(source: PageStructure, target: PageStructure): Finding[] {
  const targetHeadings = new Map(target.headings.map((h) => [h.text, h.level]));
  const sourceHeadingTexts = new Set(source.headings.map((h) => h.text));
  return source.text
    .filter((text) => targetHeadings.has(text) && !sourceHeadingTexts.has(text))
    .map((text) => ({
      category: "heading",
      change: "text-to-heading",
      detail: `"${text}" is text in the source and an h${targetHeadings.get(text)} in the target`
    }));
}

function compareText(a: string[], b: string[], source?: PageStructure, target?: PageStructure): Finding[] {
  const findings: Finding[] = [];
  // Text that moved into or out of a heading, link, button or label is reported by those checks
  const elsewhere = (structure?: PageStructure) =>
    new Set(
      structure
        ? [...structure.headings.map((h) => h.text), ...structure.links.map((l) => l.text), ...structure.buttons, ...structure.controls.map((c) => c.label)]
        : []
    );
  const labels = (structure?: PageStructure) => new Set(structure?.controls.map((c) => c.label) ?? []);
  const inTarget = elsewhere(target);
  const inSource = elsewhere(source);
  const missing = a.filter((x) => !b.includes(x) && !inTarget.has(x) && !labels(source).has(x));
  const extra = b.filter((x) => !a.includes(x) && !inSource.has(x) && !labels(target).has(x));
  // A change of case only ("Data Source" → "Data source") is one finding, not a missing and an extra
  const extraByLowerCase = new Map(extra.map((x) => [x.toLowerCase(), x]));
  for (const item of missing) {
    const recased = extraByLowerCase.get(item.toLowerCase());
    if (recased !== undefined) {
      findings.push({ category: "text", change: "capitalisation", detail: `"${item}" → "${recased}"` });
      extraByLowerCase.delete(item.toLowerCase());
    } else findings.push({ category: "text", change: "missing", detail: `"${item}"` });
  }
  for (const item of extraByLowerCase.values()) findings.push({ category: "text", change: "extra", detail: `"${item}"` });
  return findings;
}

async function compareMeta(sourceDir: string, targetDir: string): Promise<Finding[]> {
  const [a, b] = await Promise.all([readNormalised(sourceDir, "meta.json"), readNormalised(targetDir, "meta.json")]).then((texts) =>
    texts.map((text) => JSON.parse(text))
  );
  const findings: Finding[] = [];
  if (a.title !== b.title) findings.push({ category: "page", change: "title", detail: `"${a.title}" → "${b.title}"` });
  if (a.lang !== b.lang) findings.push({ category: "page", change: "lang", detail: `${a.lang} → ${b.lang}` });
  const fields = (meta: { forms: { fields: { name: string }[] }[] }) => meta.forms.flatMap((f) => f.fields.map((x) => x.name)).sort();
  const fa = fields(a);
  const fb = fields(b);
  for (const name of fa.filter((x) => !fb.includes(x))) findings.push({ category: "page", change: "form-field-missing", detail: `field "${name}"` });
  for (const name of fb.filter((x) => !fa.includes(x))) findings.push({ category: "page", change: "form-field-extra", detail: `field "${name}"` });
  return findings;
}

async function compareAxe(sourceDir: string, targetDir: string): Promise<Finding[]> {
  const read = async (dir: string) =>
    existsSync(path.join(dir, "axe.json"))
      ? (JSON.parse(await readFile(path.join(dir, "axe.json"), "utf-8")).violations as { id: string; impact: string | null; help: string }[])
      : [];
  const [a, b] = await Promise.all([read(sourceDir), read(targetDir)]);
  const ids = (list: { id: string }[]) => new Set(list.map((v) => v.id));
  const sourceIds = ids(a);
  const targetIds = ids(b);
  return [
    ...b.filter((v) => !sourceIds.has(v.id)).map((v) => ({ category: "axe-new", change: v.impact ?? "unknown", detail: `${v.id}: ${v.help}` })),
    ...b.filter((v) => sourceIds.has(v.id)).map((v) => ({ category: "axe-inherited", change: v.impact ?? "unknown", detail: `${v.id}: ${v.help}` })),
    ...a.filter((v) => !targetIds.has(v.id)).map((v) => ({ category: "axe-fixed", change: v.impact ?? "unknown", detail: `${v.id}: ${v.help}` }))
  ];
}

async function readIndex(dir: string): Promise<IndexEntry[]> {
  const text = await readFile(path.join(dir, "index.jsonl"), "utf-8").catch(() => "");
  const entries = text
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as IndexEntry);
  // Directories are the truth: index lines from overwritten captures are dropped
  const present = new Set<string>();
  for (const id of await readdir(dir).catch(() => [])) present.add(id);
  return entries.filter((entry) => present.has(entry.id));
}

function key(entry: IndexEntry): string {
  return `${entry.id}|${entry.locale}|${entry.state}`;
}

export interface CompareOptions {
  source: string;
  target: string;
  out: string;
  only?: string[];
  // Captures whose tables list rows in no stable order (e.g. pip's blob explorer)
  unorderedRows?: string[];
}

interface IndexEntry {
  id: string;
  locale: string;
  state: string;
}

export interface Finding {
  category: string;
  change: string;
  detail: string;
}

export interface PairResult {
  id: string;
  locale: string;
  state: string;
  verdict: "match" | "differs" | "not-captured";
  findings: Finding[];
}

export interface Pattern {
  category: string;
  change: string;
  detail: string;
  pages: string[];
}

export interface CompareSummary {
  source: string;
  target: string;
  comparedAt: string;
  patterns: Pattern[];
  totals: { pairs: number; match: number; differs: number; notCaptured: number };
  results: PairResult[];
}
