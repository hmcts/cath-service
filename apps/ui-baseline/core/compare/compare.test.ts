import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { type CompareOptions, compareRuns, type Finding } from "./compare.js";

interface Capture {
  id: string;
  locale?: string;
  state?: string;
  aria: string;
  meta?: Partial<{ title: string; lang: string; forms: { action?: string | null; fields: { name: string }[] }[] }>;
  axe?: { id: string; impact: string | null; help: string }[];
  provenance?: Record<string, unknown>;
}

const META = { title: "Find a court", lang: "en", forms: [] };

async function writeRun(dir: string, captures: Capture[], extraIndexLines: object[] = []): Promise<void> {
  await mkdir(dir, { recursive: true });
  const lines = [...captures.map((c) => ({ id: c.id, locale: c.locale ?? "en", state: c.state ?? "default" })), ...extraIndexLines];
  await writeFile(path.join(dir, "index.jsonl"), lines.map((line) => `${JSON.stringify(line)}\n`).join(""));
  for (const capture of captures) {
    const captureDir = path.join(dir, capture.id, capture.locale ?? "en", capture.state ?? "default");
    await mkdir(captureDir, { recursive: true });
    await writeFile(path.join(captureDir, "aria.yml"), capture.aria);
    await writeFile(path.join(captureDir, "meta.json"), JSON.stringify({ ...META, ...capture.meta }));
    if (capture.axe) await writeFile(path.join(captureDir, "axe.json"), JSON.stringify({ violations: capture.axe }));
    if (capture.provenance) await writeFile(path.join(captureDir, "provenance.json"), JSON.stringify(capture.provenance));
  }
}

async function compareOne(
  source: Omit<Capture, "id">,
  target: Omit<Capture, "id">,
  unordered = false,
  expectedTarget?: CompareOptions["expectedTarget"]
): Promise<Finding[]> {
  const dir = await mkdtemp(path.join(tmpdir(), "compare-"));
  await writeRun(path.join(dir, "source"), [{ id: "page", ...source }]);
  await writeRun(path.join(dir, "target"), [{ id: "page", ...target }]);
  const summary = await compareRuns({
    source: path.join(dir, "source"),
    target: path.join(dir, "target"),
    out: path.join(dir, "out"),
    unorderedRows: unordered ? ["page"] : undefined,
    expectedTarget
  });
  return summary.results[0].findings;
}

const describeFindings = (findings: Finding[]) => findings.map((f) => `${f.category} ${f.change}: ${f.detail}`);

describe("compareRuns", () => {
  it("should pair captures by id, locale and state, and write compare.json, when given two runs", async () => {
    // Arrange
    const dir = await mkdtemp(path.join(tmpdir(), "compare-"));
    const aria = '- heading "Find a court" [level=1]\n- paragraph: Search by name';
    await writeRun(
      path.join(dir, "source"),
      [
        { id: "home", aria },
        { id: "home", locale: "cy", aria },
        { id: "faq", aria },
        { id: "skipped", aria }
      ],
      // An index line whose capture directory was overwritten is dropped
      [{ id: "gone", locale: "en", state: "default" }]
    );
    await writeRun(path.join(dir, "target"), [
      { id: "home", aria },
      { id: "faq", aria: '- heading "Find a court" [level=1]\n- paragraph: Search by postcode' }
    ]);
    const out = path.join(dir, "out");

    // Act
    const summary = await compareRuns({ source: path.join(dir, "source"), target: path.join(dir, "target"), out, only: ["home", "faq", "gone"] });

    // Assert
    expect(summary.results.map((r) => `${r.id} ${r.locale} ${r.verdict}`)).toEqual(["home en match", "home cy not-captured", "faq en differs"]);
    expect(summary.totals).toEqual({ pairs: 3, match: 1, differs: 1, notCaptured: 1 });
    expect(JSON.parse(await readFile(path.join(out, "compare.json"), "utf-8"))).toEqual(summary);
  });

  it("should compare nothing when the source run has no index", async () => {
    // Arrange
    const dir = await mkdtemp(path.join(tmpdir(), "compare-"));

    // Act
    const summary = await compareRuns({ source: path.join(dir, "missing"), target: path.join(dir, "missing"), out: path.join(dir, "out") });

    // Assert
    expect(summary.totals).toEqual({ pairs: 0, match: 0, differs: 0, notCaptured: 0 });
  });

  describe("headings", () => {
    it("should report missing, extra, relevelled and demoted headings and a change in h1 count", async () => {
      // Arrange
      const source = [
        '- heading "Find a court" [level=1]',
        '- heading "Results" [level=2]',
        '- heading "Opening times" [level=2]',
        '- heading "Contact details" [level=2]',
        '- heading "Second title" [level=1]'
      ].join("\n");
      const target = [
        '- heading "Find a court" [level=1]',
        '- heading "Results" [level=3]',
        "- paragraph: Opening times",
        '- heading "Contact details and hours" [level=2]'
      ].join("\n");

      // Act
      const findings = await compareOne({ aria: source }, { aria: target });

      // Assert
      expect(describeFindings(findings)).toEqual([
        'heading level: "Results" h2 → h3',
        'heading heading-to-text: "Opening times" (h2)',
        'heading reworded: "Contact details" (h2) → "Contact details and hours" (h2)',
        'heading missing: "Second title" (h1)',
        "heading h1-count: 2 → 1 level-1 headings"
      ]);
    });

    it("should report text that became a heading once when the target promotes it", async () => {
      // Arrange
      const source = '- heading "Title" [level=1]\n- paragraph: Before you start';
      const target = '- heading "Title" [level=1]\n- heading "Before you start" [level=2]';

      // Act
      const findings = await compareOne({ aria: source }, { aria: target });

      // Assert
      expect(describeFindings(findings)).toEqual(['heading text-to-heading: "Before you start" is text in the source and an h2 in the target']);
    });
  });

  describe("tables", () => {
    const table = (columns: string[], rows: string[][]) =>
      [
        "- table:",
        "  - rowgroup:",
        "    - row:",
        ...columns.map((c) => `      - columnheader "${c}"`),
        "  - rowgroup:",
        ...rows.flatMap((row) => ["    - row:", ...row.map((cell) => `      - cell "${cell}"`)])
      ].join("\n");

    it("should report table counts, columns, row counts and changed cells", async () => {
      // Arrange
      const source = [
        table(
          ["Time", "Court", "Case"],
          [
            ["10:00", "1", "A"],
            ["11:00", "2", "B"],
            ["12:00", "3", "C"]
          ]
        ),
        table(["X"], []),
        table(["Y"], [])
      ].join("\n");
      const target = [
        table(
          ["Time", "Room", "Case", "Judge"],
          [
            ["10:00", "1", "A"],
            ["11:30", "2", "B"]
          ]
        ),
        table(["X"], [])
      ].join("\n");

      // Act
      const findings = await compareOne({ aria: source }, { aria: target });

      // Assert
      expect(describeFindings(findings)).toEqual([
        "table count: 3 → 2 tables",
        'table columns: table 1: missing "Court"; extra "Room", "Judge"',
        "table rows: table 1: 3 → 2 rows",
        'table cells: table 1 row 2: "11:00 | 2 | B" → "11:30 | 2 | B"'
      ]);
    });

    it("should report columns in a different order and only missing or only extra columns", async () => {
      // Arrange
      const source = [table(["A", "B"], []), table(["A", "B"], []), table(["A"], [])].join("\n");
      const target = [table(["B", "A"], []), table(["A"], []), table(["A", "B"], [])].join("\n");

      // Act
      const findings = await compareOne({ aria: source }, { aria: target });

      // Assert
      expect(describeFindings(findings)).toEqual([
        "table columns: table 1: same columns in a different order",
        'table columns: table 2: missing "B"',
        'table columns: table 3: extra "B"'
      ]);
    });

    it("should ignore row order when the capture's rows are unordered", async () => {
      // Arrange
      const source = table(["Name"], [["b.json"], ["a.json"]]);
      const target = table(["Name"], [["a.json"], ["b.json"]]);

      // Act
      const ordered = await compareOne({ aria: source }, { aria: target });
      const unordered = await compareOne({ aria: source }, { aria: target }, true);

      // Assert
      expect(ordered.map((f) => f.change)).toEqual(["cells", "cells"]);
      expect(unordered).toEqual([]);
    });

    it("should read a cell's text from its value or its children when it has no name", async () => {
      // Arrange
      const rows = (cells: string[]) => ["- table:", "  - row:", '    - columnheader "Case"', "  - row:", ...cells.map((cell) => `    ${cell}`)].join("\n");
      const source = rows(["- cell: plain text", "- cell:", '  - link "AB123"', "  - text: Smith"]);
      const target = rows(["- cell: plain text", "- cell:", '  - link "AB124"', "  - text: Smith"]);

      // Act
      const findings = await compareOne({ aria: source }, { aria: target });

      // Assert
      expect(describeFindings(findings)).toEqual(['table cells: table 1 row 1: "plain text | AB123 Smith" → "plain text | AB124 Smith"']);
    });
  });

  describe("controls, buttons and links", () => {
    it("should report unlabelled, missing and extra controls, buttons and links", async () => {
      // Arrange
      const source = [
        '- textbox "Court name"',
        '- checkbox "Civil"',
        '- button "Search"',
        '- link "Home":',
        "  - /url: /",
        '- link "Help":',
        "  - /url: /help"
      ].join("\n");
      const target = ['- textbox "Court name"', "- combobox", '- button "Find"', '- link "Home":', "  - /url: /", "- link: Contact us"].join("\n");

      // Act
      const findings = await compareOne({ aria: source }, { aria: target });

      // Assert
      expect(describeFindings(findings)).toEqual([
        "form unlabelled: combobox has no accessible label",
        'form missing: checkbox "Civil"',
        'button missing: "Search"',
        'link missing: "Help"',
        'form extra: combobox ""',
        'button extra: "Find"',
        'link extra: "Contact us"'
      ]);
    });
  });

  describe("text", () => {
    it("should pair reworded text, report case-only changes once and leave unrelated text missing or extra", async () => {
      // Arrange
      const source = [
        "- paragraph: Data Source",
        "- paragraph: Find the hearing list for your court",
        "- paragraph: Removed entirely",
        '- textbox "Postcode"',
        "- paragraph: Postcode",
        '- link "Read more"'
      ].join("\n");
      const target = [
        "- paragraph: Data source",
        "- paragraph: Find the hearing list for a court",
        "- listitem: Brand new line",
        '- textbox "Postcode"',
        "- paragraph: Read more"
      ].join("\n");

      // Act
      const findings = await compareOne({ aria: source }, { aria: target });

      // Assert
      expect(describeFindings(findings)).toEqual([
        'link missing: "Read more"',
        'text capitalisation: "Data Source" → "Data source"',
        'text reworded: "Find the hearing list for your court" → "Find the hearing list for a court"',
        'text missing: "Removed entirely"',
        'text extra: "Brand new line"'
      ]);
    });

    it("should report a repeated finding once with its count", async () => {
      // Arrange
      const source = '- heading "Title" [level=1]';
      const target = ['- heading "Title" [level=1]', ...Array.from({ length: 3 }, () => '- heading "Court 1" [level=2]')].join("\n");

      // Act
      const findings = await compareOne({ aria: source }, { aria: target });

      // Assert
      expect(describeFindings(findings)).toEqual(['heading extra: "Court 1" (h2) (×3)']);
    });

    it("should parse quoted nodes, escaped quotes and attributes when reading the tree", async () => {
      // Arrange
      const source = ["- 'heading \"Note: read this\" [level=2]'", '- paragraph: "Say \\"hi\\""', "- 'paragraph: It''s open'"].join("\n");
      const target = ["- 'heading \"Note: read this\" [level=3]'", '- paragraph: "Say \\"hello\\""', "- 'paragraph: It''s open'"].join("\n");

      // Act
      const findings = await compareOne({ aria: source }, { aria: target });

      // Assert
      expect(describeFindings(findings)).toEqual(['heading level: "Note: read this" h2 → h3', 'text reworded: "Say "hi"" → "Say "hello""']);
    });
  });

  describe("page details", () => {
    it("should report title, language and form field changes", async () => {
      // Arrange
      const aria = '- heading "Title" [level=1]';

      // Act
      const findings = await compareOne(
        { aria, meta: { title: "Search", lang: "en", forms: [{ fields: [{ name: "q" }, { name: "court" }] }] } },
        { aria, meta: { title: "Search - GOV.UK", lang: "cy", forms: [{ fields: [{ name: "q" }, { name: "postcode" }] }] } }
      );

      // Assert
      expect(describeFindings(findings)).toEqual([
        'page title: "Search" → "Search - GOV.UK"',
        "page lang: en → cy",
        'page form-field-missing: field "court"',
        'page form-field-extra: field "postcode"'
      ]);
    });

    it("should mask IDs and dates from seeding using each capture's provenance", async () => {
      // Arrange
      const source = {
        aria: "- paragraph: Artefact 11111111-2222-3333-4444-555555555555 listed 30 October 2026",
        provenance: { id: "page", capturedAt: "2026-10-30T09:00:00Z", source: { fixture: "civil", artefactId: "art-pip-1" } }
      };
      const target = {
        aria: "- paragraph: Artefact aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee listed 31 October 2026",
        provenance: { id: "page", source: { seededAt: "2026-10-31T09:00:00Z" } }
      };

      // Act
      const findings = await compareOne(source, target);

      // Assert
      expect(findings).toEqual([]);
    });
  });

  describe("accessibility", () => {
    it("should separate new, inherited and fixed axe violations and not count inherited ones as differences", async () => {
      // Arrange
      const dir = await mkdtemp(path.join(tmpdir(), "compare-"));
      const aria = '- heading "Title" [level=1]';
      await writeRun(path.join(dir, "source"), [
        {
          id: "page",
          aria,
          axe: [
            { id: "color-contrast", impact: "serious", help: "Contrast" },
            { id: "label", impact: "critical", help: "Labels" }
          ]
        },
        { id: "same", aria, axe: [{ id: "region", impact: null, help: "Regions" }] }
      ]);
      await writeRun(path.join(dir, "target"), [
        {
          id: "page",
          aria,
          axe: [
            { id: "color-contrast", impact: "serious", help: "Contrast" },
            { id: "region", impact: null, help: "Regions" }
          ]
        },
        { id: "same", aria, axe: [{ id: "region", impact: null, help: "Regions" }] }
      ]);

      // Act
      const summary = await compareRuns({ source: path.join(dir, "source"), target: path.join(dir, "target"), out: path.join(dir, "out") });

      // Assert
      expect(describeFindings(summary.results[0].findings)).toEqual([
        "axe-new unknown: region: Regions",
        "axe-inherited serious: color-contrast: Contrast",
        "axe-fixed critical: label: Labels"
      ]);
      expect(summary.results[1]).toMatchObject({ id: "same", verdict: "match", findings: [{ category: "axe-inherited" }] });
    });
  });

  describe("patterns", () => {
    it("should group a finding repeated across pages, reduced to its shape, when it appears on more than one page", async () => {
      // Arrange
      const dir = await mkdtemp(path.join(tmpdir(), "compare-"));
      const page = (title: string) => ({ aria: '- heading "Title" [level=1]', meta: { title } });
      await writeRun(path.join(dir, "source"), [
        { id: "a", ...page("Alpha") },
        { id: "b", ...page("Beta") },
        { id: "b", state: "expanded", ...page("Beta") },
        { id: "c", ...page("Gamma") },
        { id: "d", ...page("Delta") },
        { id: "e", aria: '- heading "Title" [level=1]', axe: [{ id: "region", impact: "moderate", help: "Regions" }] },
        { id: "f", aria: '- heading "Title" [level=1]', axe: [{ id: "region", impact: "moderate", help: "Regions" }] }
      ]);
      await writeRun(path.join(dir, "target"), [
        { id: "a", ...page("Alpha - GOV.UK") },
        { id: "b", ...page("Beta - GOV.UK") },
        { id: "b", state: "expanded", ...page("Beta - GOV.UK") },
        { id: "c", ...page("Renamed - GOV.UK") },
        { id: "d", ...page("Other name - GOV.UK") },
        { id: "e", aria: '- heading "Title" [level=1]', axe: [{ id: "region", impact: "moderate", help: "Regions" }] },
        { id: "f", aria: '- heading "Title" [level=1]', axe: [{ id: "region", impact: "moderate", help: "Regions" }] }
      ]);

      // Act
      const summary = await compareRuns({ source: path.join(dir, "source"), target: path.join(dir, "target"), out: path.join(dir, "out") });

      // Assert
      expect(summary.patterns).toEqual([
        { category: "page", change: "title", detail: 'title gains suffix " - GOV.UK"', pages: ["a en", "b en", "b en (expanded)"] },
        { category: "page", change: "title", detail: 'title changes and gains suffix " - GOV.UK"', pages: ["c en", "d en"] }
      ]);
    });

    it("should group a heading level change by its levels when the same change is on several pages", async () => {
      // Arrange
      const dir = await mkdtemp(path.join(tmpdir(), "compare-"));
      const page = (name: string, level: number) => ({ aria: `- heading "Title" [level=1]\n- heading "${name}" [level=${level}]` });
      await writeRun(path.join(dir, "source"), [
        { id: "a", ...page("Opening times", 2) },
        { id: "b", ...page("Contact", 2) }
      ]);
      await writeRun(path.join(dir, "target"), [
        { id: "a", ...page("Opening times", 3) },
        { id: "b", ...page("Contact", 3) }
      ]);

      // Act
      const summary = await compareRuns({ source: path.join(dir, "source"), target: path.join(dir, "target"), out: path.join(dir, "out") });

      // Assert
      expect(summary.patterns).toEqual([{ category: "heading", change: "level", detail: "h2 → h3", pages: ["a en", "b en"] }]);
    });
  });
});

describe("compareRuns, reading and pairing captures", () => {
  it("should read curly quotes in the tree and the page's details, and count them the same as straight ones", async () => {
    // Act
    const findings = await compareOne(
      { aria: '- button "Select “Continue”"\n- link "pip’s guide":\n  - /url: /guide', meta: { title: "Select “Continue”" } },
      { aria: '- button "Select \\"Continue\\""\n- link "pip\'s guide":\n  - /url: /guide', meta: { title: 'Select "Continue"' } }
    );

    // Assert
    expect(describeFindings(findings)).toEqual([]);
  });

  it("should report a name with curly quotes in full when it differs", async () => {
    // Act
    const findings = await compareOne({ aria: '- button "Select “Continue”"' }, { aria: '- button "Select “Next”"' });

    // Assert
    expect(describeFindings(findings)).toEqual(['button reworded: "Select "Continue"" → "Select "Next""']);
  });

  it("should count a capture whose folder is gone as not captured, rather than fail the run", async () => {
    // Arrange
    const dir = await mkdtemp(path.join(tmpdir(), "compare-"));
    const aria = '- heading "Find a court" [level=1]';
    await writeRun(path.join(dir, "source"), [
      { id: "home", aria },
      { id: "home", locale: "cy", aria }
    ]);
    // The index still has a line for the Welsh capture, whose folder a failed retry removed
    await writeRun(path.join(dir, "target"), [{ id: "home", aria }], [{ id: "home", locale: "cy", state: "default" }]);

    // Act
    const summary = await compareRuns({ source: path.join(dir, "source"), target: path.join(dir, "target"), out: path.join(dir, "out") });

    // Assert
    expect(summary.results.map((r) => `${r.locale} ${r.verdict}`)).toEqual(["en match", "cy not-captured"]);
  });

  it("should report a button or link the target has a different number of", async () => {
    // Act
    const findings = await compareOne(
      { aria: '- button "Remove"\n- button "Remove"\n- button "Remove"\n- link "Back":\n  - /url: /' },
      { aria: '- button "Remove"\n- link "Back":\n  - /url: /\n- link "Back":\n  - /url: /' }
    );

    // Assert
    expect(describeFindings(findings)).toEqual(['button count: "Remove": 3 → 1', 'link count: "Back": 1 → 2']);
  });
});

describe("compareRuns, where links and forms lead", () => {
  // A capture at the given address, with the given tree and form actions
  const page = (url: string, aria: string, actions: (string | null)[] = []) => ({
    aria,
    provenance: { url } as Record<string, unknown>,
    meta: { forms: actions.map((action) => ({ action, fields: [] })) }
  });
  // pip's /a is CaTH's /alpha; the page itself is the page compared with it; other sites as they are
  const expectedTarget: CompareOptions["expectedTarget"] = (url, { source, target }) => {
    if (url.origin !== source.origin) return `${url.origin}${url.pathname}`;
    if (url.pathname === source.pathname) return target.pathname;
    return url.pathname === "/a" ? "/alpha" : undefined;
  };

  it("should report a link that leads somewhere other than the target page for it", async () => {
    // Act
    const findings = await compareOne(
      page("https://pip.test/list?lng=cy", '- link "Alpha":\n  - /url: a?artefactId=1\n- link "Courts":\n  - /url: https://courts.example/find'),
      page("http://cath.test/list", '- link "Alpha":\n  - /url: /beta?artefactId=9\n- link "Courts":\n  - /url: https://elsewhere.example/find'),
      false,
      expectedTarget
    );

    // Assert
    expect(describeFindings(findings)).toEqual([
      'link target: "Alpha": /alpha → /beta',
      'link target: "Courts": https://courts.example/find → https://elsewhere.example/find'
    ]);
  });

  it("should not count a link that leads to the right page with other ids, or one it cannot tell", async () => {
    // Act
    const findings = await compareOne(
      page("https://pip.test/list", '- link "Alpha":\n  - /url: /a?artefactId=1\n- link "Unknown":\n  - /url: /somewhere'),
      page("http://cath.test/list", '- link "Alpha":\n  - /url: /alpha?artefactId=9\n- link "Unknown":\n  - /url: /anywhere'),
      false,
      expectedTarget
    );

    // Assert
    expect(describeFindings(findings)).toEqual([]);
  });

  it("should report a form that posts somewhere other than the target page for it", async () => {
    // Act
    const findings = await compareOne(
      page("https://pip.test/search", '- heading "Search" [level=1]', [null, "/a"]),
      page("http://cath.test/find", '- heading "Search" [level=1]', ["/find", "/beta"]),
      false,
      expectedTarget
    );

    // Assert
    expect(describeFindings(findings)).toEqual(["form action: form 2: /alpha → /beta"]);
  });

  it("should not compare where links lead when it is not told how", async () => {
    // Act
    const findings = await compareOne(
      page("https://pip.test/list", '- link "Alpha":\n  - /url: /a'),
      page("http://cath.test/list", '- link "Alpha":\n  - /url: /beta')
    );

    // Assert
    expect(describeFindings(findings)).toEqual([]);
  });
});
