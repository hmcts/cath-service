import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { type AccessibilityFinding, checkAccessibility } from "./accessibility.js";
import { type AriaNode, type PageStructure, parseAria, structureOf } from "./aria.js";
import { type NormaliseContext, normalise } from "./normalise.js";

// Compares every capture in a source run (e.g. pip) with the capture of the same id, locale and
// state in a target run (e.g. CaTH). Deterministic: each pair gets a verdict and a list of
// categorised findings; judging whether a finding is intended comes later, against the ticket.
const REWORD_SIMILARITY = 0.5;
// capturePage's states: as a page first appears, and with its collapsed content opened, which is only
// captured when there is some. A page with nothing to open shows everything in its default state.
const DEFAULT_STATE = "default";
const EXPANDED_STATE = "expanded";
// capturePage's default region; the frame is the page around it
const DEFAULT_REGION = "main";
// Findings that do not by themselves make a page differ: accessibility issues CaTH inherits unchanged
// from pip, and differences in the header, banners and footer, which every page shares, so one change
// there would otherwise make every page differ
const NOT_DECIDING = new Set(["axe-inherited", "frame"]);
const OPENED_ONLY_IN_SOURCE: Finding = {
  category: "page",
  change: "collapsed-content",
  detail: "the source hides some of this page until it is opened and the target has nothing to open, so the target's page is compared as it first appears"
};
const OPENED_ONLY_IN_TARGET: Finding = {
  category: "page",
  change: "collapsed-content",
  detail: "the target hides some of this page until it is opened and the source has nothing to open, so the source's page is compared as it first appears"
};

export async function compareRuns(options: CompareOptions): Promise<CompareSummary> {
  const inScope = (entry: IndexEntry) => !options.only || options.only.includes(entry.id);
  const sourceEntries = (await readIndex(options.source)).filter(inScope);
  const sourceIndex = new Map(sourceEntries.map((entry) => [key(entry), entry]));
  const targetIndex = new Map((await readIndex(options.target)).filter(inScope).map((entry) => [key(entry), entry]));
  const defaultOf = (entry: IndexEntry) => key({ ...entry, state: DEFAULT_STATE });

  const results: PairResult[] = [];
  for (const sourceEntry of sourceEntries) {
    const targetEntry = targetIndex.get(key(sourceEntry));
    if (targetEntry) {
      results.push(await comparePair(options, sourceEntry, targetEntry));
      continue;
    }
    // Content the source collapses and the target shows outright (or leaves out) is in the target's
    // default state, so a page that lost its collapsed content differs rather than going uncompared
    const shownOutright = sourceEntry.state === EXPANDED_STATE ? targetIndex.get(defaultOf(sourceEntry)) : undefined;
    if (shownOutright) {
      // The target's default state is checked for accessibility in its own pair, so not again here
      const pair = await comparePair(options, sourceEntry, shownOutright, { checkTarget: false });
      results.push(withFinding({ ...pair, targetState: DEFAULT_STATE }, OPENED_ONLY_IN_SOURCE));
      continue;
    }
    results.push({ id: sourceEntry.id, locale: sourceEntry.locale, state: sourceEntry.state, verdict: "not-captured", findings: [] });
  }
  // And the other way: content only the target collapses, opened, against the source's whole page
  for (const targetEntry of targetIndex.values()) {
    if (targetEntry.state !== EXPANDED_STATE || sourceIndex.has(key(targetEntry))) continue;
    const sourceDefault = sourceIndex.get(defaultOf(targetEntry));
    if (!sourceDefault) continue;
    const pair = await comparePair(options, sourceDefault, targetEntry);
    results.push(withFinding({ ...pair, state: EXPANDED_STATE, sourceState: DEFAULT_STATE }, OPENED_ONLY_IN_TARGET));
  }
  // Captures only the target has (a page or journey step the source has no counterpart for) are not
  // compared, but are still checked for accessibility, which does not depend on the source
  const compared = (entry: IndexEntry) => sourceIndex.has(key(entry)) || (entry.state === EXPANDED_STATE && sourceIndex.has(defaultOf(entry)));
  const targetOnly: TargetOnlyResult[] = [];
  for (const targetEntry of targetIndex.values()) {
    if (compared(targetEntry)) continue;
    const dir = path.join(options.target, targetEntry.id, targetEntry.locale, targetEntry.state);
    targetOnly.push({ id: targetEntry.id, locale: targetEntry.locale, state: targetEntry.state, accessibility: await checkAccessibility(dir) });
  }

  const summary: CompareSummary = {
    source: options.source,
    target: options.target,
    comparedAt: new Date().toISOString(),
    patterns: patternsOf(results),
    accessibilityPatterns: accessibilityPatternsOf([...results, ...targetOnly]),
    totals: {
      pairs: results.length,
      match: results.filter((r) => r.verdict === "match").length,
      differs: results.filter((r) => r.verdict === "differs").length,
      notCaptured: results.filter((r) => r.verdict === "not-captured").length,
      accessibility: [...results, ...targetOnly].reduce((sum, r) => sum + (r.accessibility?.length ?? 0), 0)
    },
    results,
    targetOnly
  };
  await mkdir(options.out, { recursive: true });
  await writeFile(path.join(options.out, "compare.json"), `${JSON.stringify(summary, null, 2)}\n`);
  return summary;
}

// A pair compared across states always differs: one app collapses content the other does not
function withFinding(pair: PairResult, finding: Finding): PairResult {
  return { ...pair, verdict: "differs", findings: [finding, ...pair.findings] };
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

// Accessibility findings on the target, grouped like the differences, but every one kept: an issue
// on a single page matters as much as one on many
function accessibilityPatternsOf(results: (PairResult | TargetOnlyResult)[]): AccessibilityPattern[] {
  const byKey = new Map<string, AccessibilityPattern>();
  for (const result of results) {
    for (const finding of result.accessibility ?? []) {
      const detail = finding.detail.replace(/ \(×\d+\)$/, "");
      const key = `${finding.change}|${detail}`;
      const pattern = byKey.get(key) ?? { change: finding.change, detail, wcag: finding.wcag, pages: [] };
      const page = `${result.id} ${result.locale}${result.state === "default" ? "" : ` (${result.state})`}`;
      if (!pattern.pages.includes(page)) pattern.pages.push(page);
      byKey.set(key, pattern);
    }
  }
  return [...byKey.values()].sort((a, b) => b.pages.length - a.pages.length || a.change.localeCompare(b.change));
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

async function comparePair(options: CompareOptions, sourceEntry: IndexEntry, targetEntry: IndexEntry, { checkTarget = true } = {}): Promise<PairResult> {
  const sourceDir = path.join(options.source, sourceEntry.id, sourceEntry.locale, sourceEntry.state);
  const targetDir = path.join(options.target, targetEntry.id, targetEntry.locale, targetEntry.state);
  const [sourceCapture, targetCapture] = await Promise.all([readCapture(sourceDir), readCapture(targetDir)]);
  const source = sourceCapture.structure;
  const target = targetCapture.structure;
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
    ...compareTargets(sourceCapture, targetCapture, options.expectedTarget),
    ...compareText(source.text, target.text, source, target),
    ...compareFrame(sourceCapture, targetCapture),
    ...compareMeta(sourceCapture.meta, targetCapture.meta),
    ...(await compareAxe(sourceDir, targetDir))
  ];
  // The same finding can occur several times on one page (e.g. a heading repeated per court)
  const unique = dedupe(pairReworded(findings));
  const differences = unique.filter((f) => !NOT_DECIDING.has(f.category));
  return {
    id: sourceEntry.id,
    locale: sourceEntry.locale,
    state: sourceEntry.state,
    verdict: differences.length ? "differs" : "match",
    findings: unique,
    ...(checkTarget ? { accessibility: await checkAccessibility(targetDir) } : {})
  };
}

// A capture as compared: parsed first and normalised after, a string at a time, so a normalisation
// (curly quotes made straight, say) can never break the YAML or JSON it is read from. Link targets
// and form actions are kept as captured, for compareTargets to resolve against the page's URL.
async function readCapture(dir: string): Promise<Capture> {
  const provenance = JSON.parse(await readFile(path.join(dir, "provenance.json"), "utf-8").catch(() => "{}"));
  const context: NormaliseContext = {
    seededAt: provenance.source?.seededAt ?? provenance.capturedAt ?? null,
    runToken: provenance.source?.runToken ?? null,
    knownIds: provenance.source?.artefactId ? { [`<artefact:${provenance.source.fixture ?? provenance.id}>`]: provenance.source.artefactId } : {}
  };
  const nodes = parseAria(await readFile(path.join(dir, "aria.yml"), "utf-8"));
  const meta = JSON.parse(await readFile(path.join(dir, "meta.json"), "utf-8")) as RawMeta;
  const pageAria = path.join(dir, "page.aria.yml");
  // Only the main region can be taken out of the page's tree by its role, so a capture of another
  // region has no frame to compare
  const capturedMain = (meta.region ?? DEFAULT_REGION) === DEFAULT_REGION;
  const frame = capturedMain && existsSync(pageAria) ? withoutRegion(parseAria(await readFile(pageAria, "utf-8"))) : null;
  return {
    structure: structureOf(nodes.map((node) => normaliseNode(node, context))),
    frame: frame && structureOf(frame.map((node) => normaliseNode(node, context))),
    linkTargets: structureOf(nodes).links.map((link) => link.url),
    pageUrl: typeof provenance.url === "string" ? provenance.url : null,
    meta: {
      title: normalise(meta.title ?? "", context),
      lang: meta.lang,
      fields: (meta.forms ?? []).flatMap((form) => form.fields.map((field) => normalise(field.name, context))).sort((a, b) => a.localeCompare(b)),
      actions: (meta.forms ?? []).map((form) => form.action)
    }
  };
}

// The page around the compared region (header, banners, navigation, footer): the whole page's tree
// with the main region taken out
function withoutRegion(nodes: AriaNode[]): AriaNode[] {
  return nodes.filter((node) => node.role !== DEFAULT_REGION).map((node) => ({ ...node, children: withoutRegion(node.children) }));
}

// A screen-reader status region is captured mid-update, so what it says is not compared
function normaliseNode(node: AriaNode, context: NormaliseContext): AriaNode {
  return {
    ...node,
    name: normalise(node.name, context),
    text: node.role === "status" ? "" : normalise(node.text, context),
    children: node.children.map((child) => normaliseNode(child, context))
  };
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
    const rowsA = unorderedRows ? [...a.rows].map((r) => r.join(" | ")).sort((a, b) => a.localeCompare(b)) : a.rows.map((r) => r.join(" | "));
    const rowsB = unorderedRows ? [...b.rows].map((r) => r.join(" | ")).sort((a, b) => a.localeCompare(b)) : b.rows.map((r) => r.join(" | "));
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
  return [...findings, ...countedDifferences("form", source.controls.map(describe), target.controls.map(describe), (item) => item)];
}

function compareNamed(category: string, a: string[], b: string[]): Finding[] {
  return countedDifferences(category, a, b, (item) => `"${item}"`);
}

// Each item missing from or added to the target, and each the two have a different number of (three
// "Remove" buttons in one and one in the other), in the order they first appear
function countedDifferences(category: string, a: string[], b: string[], describe: (item: string) => string): Finding[] {
  const count = (items: string[]) => items.reduce((counts, item) => counts.set(item, (counts.get(item) ?? 0) + 1), new Map<string, number>());
  const inA = count(a);
  const inB = count(b);
  return [...new Set([...a, ...b])].flatMap((item): Finding[] => {
    const [ca, cb] = [inA.get(item) ?? 0, inB.get(item) ?? 0];
    if (!cb) return [{ category, change: "missing", detail: describe(item) }];
    if (!ca) return [{ category, change: "extra", detail: describe(item) }];
    return ca === cb ? [] : [{ category, change: "count", detail: `${describe(item)}: ${ca} → ${cb}` }];
  });
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
  // Each set built once, so a long list page is compared in linear time
  const inTarget = elsewhere(target);
  const inSource = elsewhere(source);
  const sourceLabels = labels(source);
  const targetLabels = labels(target);
  const textA = new Set(a);
  const textB = new Set(b);
  const missing = a.filter((x) => !textB.has(x) && !inTarget.has(x) && !sourceLabels.has(x));
  const extra = b.filter((x) => !textA.has(x) && !inSource.has(x) && !targetLabels.has(x));
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

// Links, buttons, headings and controls outside the main region, by name. Where they lead is not
// compared: their addresses carry each page's own path and query. Something that moved between the
// main region and the frame (a back link, say) is already reported by the region's checks, so not here.
function compareFrame(source: Capture, target: Capture): Finding[] {
  if (!source.frame || !target.frame) return [];
  const items = (structure: PageStructure) => [
    ...structure.links.map((l) => `link "${l.text}"`),
    ...structure.buttons.map((b) => `button "${b}"`),
    ...structure.headings.map((h) => `h${h.level} "${h.text}"`),
    ...structure.controls.map((c) => `${c.role} "${c.label}"`)
  ];
  const inSourceMain = new Set(items(source.structure));
  const inTargetMain = new Set(items(target.structure));
  return countedDifferences("frame", items(source.frame), items(target.frame), (item) => item).filter(
    (f) => !(f.change === "missing" && inTargetMain.has(f.detail)) && !(f.change === "extra" && inSourceMain.has(f.detail))
  );
}

function compareMeta(a: Capture["meta"], b: Capture["meta"]): Finding[] {
  const findings: Finding[] = [];
  if (a.title !== b.title) findings.push({ category: "page", change: "title", detail: `"${a.title}" → "${b.title}"` });
  if (a.lang !== b.lang) findings.push({ category: "page", change: "lang", detail: `${a.lang} → ${b.lang}` });
  const fieldsB = new Set(b.fields);
  const fieldsA = new Set(a.fields);
  for (const name of a.fields.filter((x) => !fieldsB.has(x))) findings.push({ category: "page", change: "form-field-missing", detail: `field "${name}"` });
  for (const name of b.fields.filter((x) => !fieldsA.has(x))) findings.push({ category: "page", change: "form-field-extra", detail: `field "${name}"` });
  return findings;
}

// Where each link and form leads, against where it should lead in the target: options.expectedTarget
// says, for a source URL, the target's path (or, for another site, its origin and path). Links are
// paired by text, in order, and forms by position; a target it cannot tell is not compared. Only
// paths are compared, as query values are ids each app was seeded with differently.
function compareTargets(source: Capture, target: Capture, expectedTarget: CompareOptions["expectedTarget"]): Finding[] {
  if (!expectedTarget || !source.pageUrl || !target.pageUrl) return [];
  const pages = { source: new URL(source.pageUrl), target: new URL(target.pageUrl) };
  const leadsWrong = (sourceHref: string | null, targetHref: string | null): string | null => {
    const from = resolved(sourceHref, pages.source);
    const to = resolved(targetHref, pages.target);
    if (!from || !to) return null;
    const expected = expectedTarget(from, pages);
    if (expected === undefined) return null;
    const actual = /^https?:\/\//.test(expected) ? `${to.origin}${to.pathname}` : to.pathname;
    return actual === expected ? null : `${expected} → ${actual}`;
  };
  const findings: Finding[] = [];
  const targetLinks = Map.groupBy(
    target.structure.links.map((link, index) => ({ text: link.text, href: target.linkTargets[index] })),
    (link) => link.text
  );
  const seen = new Map<string, number>();
  source.structure.links.forEach((link, index) => {
    const occurrence = seen.get(link.text) ?? 0;
    seen.set(link.text, occurrence + 1);
    const wrong = leadsWrong(source.linkTargets[index], targetLinks.get(link.text)?.[occurrence]?.href ?? null);
    if (wrong) findings.push({ category: "link", change: "target", detail: `"${link.text}": ${wrong}` });
  });
  source.meta.actions.forEach((action, index) => {
    if (index >= target.meta.actions.length) return;
    // A form with no action posts back to its own page
    const wrong = leadsWrong(action ?? "", target.meta.actions[index] ?? "");
    if (wrong) findings.push({ category: "form", change: "action", detail: `form ${index + 1}: ${wrong}` });
  });
  return findings;
}

function resolved(href: string | null, page: URL): URL | null {
  if (href === null) return null;
  try {
    return new URL(href, page);
  } catch {
    return null;
  }
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
  // Directories are the truth: a line whose capture was overwritten or removed (a retry clears the
  // folder it captures into first, and may fail) is dropped, so it is reported as not captured
  const captured = (entry: IndexEntry) => ["aria.yml", "meta.json"].every((file) => existsSync(path.join(dir, entry.id, entry.locale, entry.state, file)));
  return entries.filter(captured);
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
  // Where a link or form on a source page should lead on the target: the target path (or, for
  // another site, its origin and path), or undefined when it cannot be told. Without it, where links
  // and forms lead is not compared.
  expectedTarget?: (sourceUrl: URL, pages: { source: URL; target: URL }) => string | undefined;
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
  // The state each side was captured in, where it is not `state`: one app collapses content the
  // other shows outright, so its opened page is compared with the other's page as it first appears
  sourceState?: string;
  targetState?: string;
  findings: Finding[];
  // The target's own accessibility issues, whatever the source does; not part of the verdict
  accessibility?: AccessibilityFinding[];
}

// A capture only the target has: nothing to compare it with, but checked for accessibility all the same
export interface TargetOnlyResult {
  id: string;
  locale: string;
  state: string;
  accessibility: AccessibilityFinding[];
}

export interface AccessibilityPattern {
  change: string;
  detail: string;
  wcag: string;
  pages: string[];
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
  accessibilityPatterns?: AccessibilityPattern[];
  totals: { pairs: number; match: number; differs: number; notCaptured: number; accessibility?: number };
  results: PairResult[];
  // Absent from compare.json written before captures only the target has were checked
  targetOnly?: TargetOnlyResult[];
}

interface Capture {
  structure: PageStructure;
  frame: PageStructure | null;
  // Each link's target as captured, in the order of structure.links
  linkTargets: (string | null)[];
  pageUrl: string | null;
  meta: { title: string; lang: string; fields: string[]; actions: (string | null)[] };
}

interface RawMeta {
  title?: string;
  region?: string;
  lang: string;
  forms?: { action: string | null; fields: { name: string }[] }[];
}
