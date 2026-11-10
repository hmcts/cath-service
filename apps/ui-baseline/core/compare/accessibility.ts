import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { type AriaNode, parseAria } from "./aria.js";

// Checks one capture on its own, against WCAG, whatever the other app does. Parity cannot see an
// issue both apps have, so these are reported beside the comparison rather than as differences.
// Each rule reads what a capture already records: the accessibility trees, the HTML, axe and the
// page details.
const RULES = {
  "label-in-name": { wcag: "2.5.3 Label in Name (A)" },
  "link-text-is-url": { wcag: "2.4.4 Link Purpose (A)" },
  "ambiguous-link-text": { wcag: "2.4.4 Link Purpose (A)" },
  "link-to-nowhere": { wcag: "2.4.3 Focus Order (A)" },
  "in-page-link-target": { wcag: "2.4.3 Focus Order (A)" },
  "error-summary-target": { wcag: "2.4.3 Focus Order (A)" },
  "ungrouped-choices": { wcag: "1.3.1 Info and Relationships (A)" },
  "legend-repeats-heading": { wcag: "1.3.1 Info and Relationships (A), advisory" },
  "no-h1": { wcag: "1.3.1 Info and Relationships (A)" },
  "empty-table-header": { wcag: "1.3.1 Info and Relationships (A)" },
  "table-without-caption": { wcag: "1.3.1 Info and Relationships (A), advisory" },
  "bold-as-heading": { wcag: "1.3.1 Info and Relationships (A)" },
  "error-without-summary": { wcag: "3.3.1 Error Identification (A)" },
  "multiple-labels": { wcag: "1.3.1 Info and Relationships (A)" },
  "sort-control-is-link": { wcag: "4.1.2 Name, Role, Value (A)" },
  "duplicate-id": { wcag: "4.1.2 Name, Role, Value (A)" },
  "new-tab-unannounced": { wcag: "3.2.5 Change on Request (AAA), advisory" },
  reflow: { wcag: "1.4.10 Reflow (AA)" }
} as const;
const REFLOW_WIDTH = 320;
const NEW_TAB_WARNING = /new (tab|window)|tab newydd|ffenestr newydd/i;
const ERROR_PREFIX = /^(Error|Gwall):/;
const ERROR_SUMMARY_TITLE = /^(There is a problem|Mae yna broblem|Mae problem)/i;
const SHORT_NAME = 2;
const HEADING_LIKE_LENGTH = 60;
// Per page and check: a list page can repeat one issue on every row, and each would be a finding
const MAX_PER_CHECK = 5;
// The fragment "top" scrolls to the top of the page whether or not anything has that id
const TOP_FRAGMENT = /^top$/i;
const FOCUSABLE_TAGS = new Set(["input", "select", "textarea", "button"]);
const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

export async function checkAccessibility(dir: string): Promise<AccessibilityFinding[]> {
  const read = (file: string) => (existsSync(path.join(dir, file)) ? readFile(path.join(dir, file), "utf-8") : Promise.resolve(null));
  const [regionAria, pageAria, pageHtml, regionHtml, axe, meta] = await Promise.all([
    read("aria.yml"),
    read("page.aria.yml"),
    read("page.html"),
    read("raw.html"),
    read("axe.json"),
    read("meta.json")
  ]);
  const main = parseAria(regionAria ?? "");
  const page = pageAria ? parseAria(pageAria) : main;
  // Older captures hold only the region's HTML, which cannot say where a link outside it leads
  const html = pageHtml ?? regionHtml ?? "";

  return capped(
    dedupe([
      ...labelInName(page),
      ...linkTextIsUrl(page),
      ...ambiguousLinks(main),
      ...linksToNowhere(html),
      ...(pageHtml ? inPageLinkTargets(pageHtml) : []),
      ...errorSummaryTargets(html),
      ...ungroupedChoices(main),
      ...legendRepeatsHeading(main),
      ...noH1(main),
      ...tableHeaders(main),
      ...boldAsHeadings(html),
      ...errorWithoutSummary(main),
      ...multipleLabels(html),
      ...sortLinks(html),
      ...duplicateIds(html),
      ...newTabUnannounced(html),
      ...axeFindings(axe),
      ...reflow(meta)
    ])
  );
}

function finding(rule: keyof typeof RULES, detail: string): AccessibilityFinding {
  return { category: "accessibility", change: rule, detail, wcag: RULES[rule].wcag };
}

// A link or button whose accessible name does not contain the words it shows. Voice control users
// say what they see, so "Cymraeg" named "Change language to Welsh" cannot be spoken to.
function labelInName(nodes: AriaNode[]): AccessibilityFinding[] {
  return walk(nodes)
    .filter(({ node }) => node.role === "link" || node.role === "button")
    .flatMap(({ node }) => {
      const visible = visibleText(node);
      if (!node.name || !visible || words(node.name).includes(words(visible))) return [];
      return [finding("label-in-name", `${node.role} shows "${visible}" but is named "${node.name}"`)];
    });
}

function linkTextIsUrl(nodes: AriaNode[]): AccessibilityFinding[] {
  return walk(nodes)
    .filter(({ node }) => node.role === "link" && /^(https?:\/\/|www\.)/i.test(node.name || node.text))
    .map(({ node }) => finding("link-text-is-url", `link text is the address "${node.name || node.text}"`));
}

// The same link text leading to different places, so the text alone cannot tell them apart
function ambiguousLinks(nodes: AriaNode[]): AccessibilityFinding[] {
  const links = walk(nodes).filter(({ node }) => node.role === "link");
  const byName = Map.groupBy(links, ({ node }) => node.name || node.text);
  return [...byName.entries()]
    .filter(([name, group]) => name.length > SHORT_NAME && new Set(group.map(({ node }) => urlOf(node))).size > 1)
    .map(([name, group]) => finding("ambiguous-link-text", `${group.length} links say "${name}" and lead to different places`));
}

// href="#" moves neither the page nor focus anywhere useful. A GOV.UK back link is the exception:
// its script takes users back.
function linksToNowhere(html: string): AccessibilityFinding[] {
  return anchors(html)
    .filter((a) => attribute(a.attributes, "href") === "#" && !/govuk-back-link/.test(attribute(a.attributes, "class") ?? ""))
    .map((a) => finding("link-to-nowhere", `"${a.text}" links to "#", so focus stays where it was`));
}

function inPageLinkTargets(html: string): AccessibilityFinding[] {
  const ids = new Set([...html.matchAll(/\s(?:id|name)="([^"]+)"/g)].map((m) => m[1]));
  return anchors(html)
    .map((a) => ({ a, target: attribute(a.attributes, "href")?.match(/^#(.+)$/)?.[1] }))
    .filter(({ target }) => target && !TOP_FRAGMENT.test(target) && !ids.has(decodedFragment(target)))
    .map(({ a, target }) => finding("in-page-link-target", `"${a.text}" links to #${target}, which is not on the page`));
}

// A link in GOV.UK's error summary moves focus to a form control with its id, as following any link
// to a focusable element does; a link to anything else just scrolls, leaving focus in the summary
function errorSummaryTargets(html: string): AccessibilityFinding[] {
  const summary = html.match(/class="[^"]*\bgovuk-error-summary\b[\s\S]*?<\/ul>/)?.[0];
  if (!summary) return [];
  return anchors(summary).flatMap((a) => {
    const target = attribute(a.attributes, "href")?.match(/^#(.+)$/)?.[1];
    if (!target) return [];
    const element = html.match(new RegExp(`<(\\w+)\\b([^>]*)\\sid="${escapeRegExp(decodedFragment(target))}"([^>]*)>`));
    const tag = element?.[1]?.toLowerCase();
    if (tag && (FOCUSABLE_TAGS.has(tag) || /\stabindex="/.test(`${element?.[2]}${element?.[3]}`))) return [];
    const where = tag ? `a <${tag}>` : "nothing on the page";
    return [finding("error-summary-target", `"${a.text}" links to #${target}, ${where}, so focus does not move to the field`)];
  });
}

// Radios, or checkboxes outside a table, with no fieldset and legend to say what they answer. A
// fieldset with no legend is a group with no name, which says no more than no fieldset does.
function ungroupedChoices(nodes: AriaNode[]): AccessibilityFinding[] {
  const outsideGroups = walk(nodes).filter(
    ({ node, ancestors }) => !ancestors.some((a) => (a.role === "group" || a.role === "radiogroup") && a.name) && node.role !== "root"
  );
  const radios = outsideGroups.filter(({ node }) => node.role === "radio");
  const checkboxes = outsideGroups.filter(
    ({ node, ancestors }) => node.role === "checkbox" && !ancestors.some((a) => ["table", "row", "cell"].includes(a.role))
  );
  return [
    ...(radios.length > 1 ? [finding("ungrouped-choices", `${radios.length} radios (${names(radios)}) are not in a fieldset with a legend`)] : []),
    ...(checkboxes.length > 1
      ? [finding("ungrouped-choices", `${checkboxes.length} checkboxes (${names(checkboxes)}) are not in a fieldset with a legend`)]
      : [])
  ];
}

// A legend that repeats a heading outside the fieldset is read twice; the heading belongs in the legend
function legendRepeatsHeading(nodes: AriaNode[]): AccessibilityFinding[] {
  const all = walk(nodes);
  return all
    .filter(({ node }) => node.role === "group" && node.name)
    .filter(({ node: group }) =>
      all.some(({ node, ancestors }) => node.role === "heading" && words(node.name || node.text) === words(group.name) && !ancestors.includes(group))
    )
    .map(({ node }) => finding("legend-repeats-heading", `the legend "${node.name}" repeats a heading outside its fieldset`));
}

function noH1(nodes: AriaNode[]): AccessibilityFinding[] {
  const headings = walk(nodes).filter(({ node }) => node.role === "heading");
  return headings.some(({ node }) => node.attributes.includes("level=1"))
    ? []
    : [finding("no-h1", headings.length ? `the page has no h1; its first heading is "${headings[0].node.name}"` : "the page has no headings")];
}

function tableHeaders(nodes: AriaNode[]): AccessibilityFinding[] {
  const tables = walk(nodes).filter(({ node }) => node.role === "table");
  const uncaptioned = tables.filter(({ node }) => !node.name).length;
  return [
    ...tables.flatMap(({ node: table }, index) => {
      const label = table.name ? `table "${table.name}"` : `table ${index + 1}`;
      const empty = walk(table.children).filter(({ node }) => node.role === "columnheader" && !node.name && !visibleText(node)).length;
      return empty ? [finding("empty-table-header", `${label} has ${empty} empty column header${empty === 1 ? "" : "s"}`)] : [];
    }),
    // One finding a page: the fix is usually one shared table macro
    ...(uncaptioned ? [finding("table-without-caption", `${uncaptioned} of ${tables.length} table${tables.length === 1 ? " has" : "s have"} no caption`)] : [])
  ];
}

// A short bold paragraph, or a bold line with a line break after it, is a heading in all but markup.
// Bold followed by text on the same line ("Judge: Jane Smith") is a label, and is not reported.
function boldAsHeadings(html: string): AccessibilityFinding[] {
  return [...html.matchAll(/<p\b[^>]*>\s*<(?:strong|b)\b[^>]*>([^<]{1,200})<\/(?:strong|b)>\s*(<br\s*\/?>|<\/p>)/g)]
    .map((m) => decodeEntities(m[1]).replace(/\s+/g, " ").trim())
    .filter((text) => text && text.length <= HEADING_LIKE_LENGTH && !text.endsWith(":"))
    .map((text) => finding("bold-as-heading", `"${text}" is a bold line on its own, so may need to be a heading`));
}

function errorWithoutSummary(nodes: AriaNode[]): AccessibilityFinding[] {
  const all = walk(nodes);
  const errors = all.filter(({ node }) => ERROR_PREFIX.test(node.text || node.name));
  const hasSummary = all.some(({ node }) => node.role === "heading" && ERROR_SUMMARY_TITLE.test(node.name || node.text));
  return errors.length && !hasSummary
    ? [finding("error-without-summary", `"${errors[0].node.text || errors[0].node.name}" is shown with no error summary at the top of the page`)]
    : [];
}

function multipleLabels(html: string): AccessibilityFinding[] {
  const targets = [...html.matchAll(/<label\b[^>]*\sfor="([^"]+)"/g)].map((m) => m[1]);
  return [...counted(targets).entries()]
    .filter(([, count]) => count > 1)
    .map(([id, count]) => finding("multiple-labels", `${count} labels are linked to the field #${id}`));
}

// A sortable column's control sorts in place, so it is a button; a link says it goes somewhere else
function sortLinks(html: string): AccessibilityFinding[] {
  const headers = [...html.matchAll(/<th\b[^>]*\saria-sort="[^"]*"[^>]*>([\s\S]*?)<\/th>/g)].filter((m) => /<a\b/.test(m[1]));
  if (!headers.length) return [];
  const names = headers.map(
    (m) =>
      `"${m[1]
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()}"`
  );
  return [
    finding(
      "sort-control-is-link",
      `${headers.length} sortable column${headers.length === 1 ? " is" : "s are"} sorted by a link, not a button (${names.slice(0, 3).join(", ")}${names.length > 3 ? ", …" : ""})`
    )
  ];
}

// Duplicate ids on form controls point labels and hints at the wrong control
function duplicateIds(html: string): AccessibilityFinding[] {
  const ids = [...html.matchAll(/<(?:input|select|textarea)\b[^>]*\sid="([^"]+)"/g)].map((m) => m[1]);
  const repeated = [...counted(ids).entries()].filter(([, count]) => count > 1);
  if (!repeated.length) return [];
  const listed = repeated
    .slice(0, 5)
    .map(([id, count]) => `#${id} ×${count}`)
    .join(", ");
  return [
    finding(
      "duplicate-id",
      `${repeated.length} form control id${repeated.length === 1 ? " is" : "s are"} used more than once (${listed}${repeated.length > 5 ? ", …" : ""})`
    )
  ];
}

function newTabUnannounced(html: string): AccessibilityFinding[] {
  return anchors(html)
    .filter((a) => attribute(a.attributes, "target") === "_blank")
    .filter((a) => !NEW_TAB_WARNING.test(`${a.text} ${attribute(a.attributes, "aria-label") ?? ""}`))
    .map((a) => finding("new-tab-unannounced", `"${a.text}" opens in a new tab without saying so`));
}

// Every axe violation on the page, including ones the other app has too, and the checks axe could
// not decide (colour contrast over images or disabled-looking text, say), which need a person
function axeFindings(json: string | null): AccessibilityFinding[] {
  const axe = parsed<AxeFile>(json);
  if (!axe) return [];
  return [
    ...(axe.violations ?? []).map((v) => ({
      category: "accessibility" as const,
      change: `axe-${v.id}`,
      detail: `${v.help} (${v.targets?.length ?? 1} element${v.targets?.length === 1 ? "" : "s"})`,
      wcag: `axe, ${v.impact ?? "unknown"} impact`
    })),
    ...(axe.incomplete ?? []).map((v) => ({
      category: "accessibility" as const,
      change: `axe-needs-review-${v.id}`,
      detail: `${v.help} (${v.targets?.length ?? 1} element${v.targets?.length === 1 ? "" : "s"}); axe could not decide, so check by hand`,
      wcag: "axe, needs review"
    }))
  ];
}

function reflow(json: string | null): AccessibilityFinding[] {
  const measured = parsed<{ reflow?: { width: number; scrollWidth: number } | null }>(json)?.reflow;
  if (!measured || measured.scrollWidth <= measured.width + 1) return [];
  return [finding("reflow", `at ${REFLOW_WIDTH}px wide the page is ${measured.scrollWidth}px wide, so it scrolls sideways`)];
}

function walk(nodes: AriaNode[], ancestors: AriaNode[] = []): { node: AriaNode; ancestors: AriaNode[] }[] {
  return nodes.flatMap((node) => [{ node, ancestors }, ...walk(node.children, [...ancestors, node])]);
}

function visibleText(node: AriaNode): string {
  return [node.text, ...node.children.filter((c) => c.role === "text").map((c) => c.text)].filter(Boolean).join(" ").trim();
}

function urlOf(node: AriaNode): string | null {
  return node.children.find((c) => c.role === "/url")?.text ?? null;
}

function words(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function names(items: { node: AriaNode }[]): string {
  const shown = items.slice(0, 3).map(({ node }) => `"${node.name}"`);
  return `${shown.join(", ")}${items.length > 3 ? ", …" : ""}`;
}

function anchors(html: string): { attributes: string; text: string }[] {
  return [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].map((m) => ({
    attributes: m[1],
    text: decodeEntities(m[2].replace(/<[^>]+>/g, " "))
      .replace(/\s+/g, " ")
      .trim()
  }));
}

// Text as the page shows it, so a detail read from HTML matches the same text read from the tree
function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, code: string) => {
    if (code.startsWith("#x") || code.startsWith("#X")) return String.fromCodePoint(Number.parseInt(code.slice(2), 16));
    if (code.startsWith("#")) return String.fromCodePoint(Number(code.slice(1)));
    return ENTITIES[code.toLowerCase()] ?? entity;
  });
}

// A fragment as an id: percent-decoded when it can be, as browsers do, and as written when it cannot
function decodedFragment(fragment: string): string {
  try {
    return decodeURIComponent(fragment);
  } catch {
    return fragment;
  }
}

// A capture's JSON, or null when it is missing or cannot be read, so one bad file loses only its own checks
function parsed<T>(json: string | null): T | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

// At most MAX_PER_CHECK findings of each check on a page, and one more saying how many were left out
function capped(findings: AccessibilityFinding[]): AccessibilityFinding[] {
  return [...Map.groupBy(findings, (f) => f.change).values()].flatMap((group) =>
    group.length <= MAX_PER_CHECK ? group : [...group.slice(0, MAX_PER_CHECK), { ...group[0], detail: `and ${group.length - MAX_PER_CHECK} more on this page` }]
  );
}

function attribute(attributes: string, name: string): string | undefined {
  return attributes.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];
}

function counted(items: string[]): Map<string, number> {
  return items.reduce((counts, item) => counts.set(item, (counts.get(item) ?? 0) + 1), new Map<string, number>());
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function dedupe(findings: AccessibilityFinding[]): AccessibilityFinding[] {
  const counts = counted(findings.map((f) => `${f.change}|${f.detail}`));
  const seen = new Set<string>();
  return findings.flatMap((f) => {
    const key = `${f.change}|${f.detail}`;
    if (seen.has(key)) return [];
    seen.add(key);
    const count = counts.get(key) ?? 1;
    return [count > 1 ? { ...f, detail: `${f.detail} (×${count})` } : f];
  });
}

export interface AccessibilityFinding {
  category: "accessibility";
  change: string;
  detail: string;
  wcag: string;
}

interface AxeFile {
  violations: { id: string; impact: string | null; help: string; targets?: string[] }[];
  incomplete?: { id: string; impact: string | null; help: string; targets?: string[] }[];
}
