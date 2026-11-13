import { execFileSync, spawn } from "node:child_process";
import { mkdtemp, readdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CompareSummary } from "../compare/compare.js";
import { type FakeReviewer, fakeReviewer } from "./fake-reviewer.test-helper.js";
import { buildPrompt, parseVerdicts, type ReviewItem, reviewFindings } from "./review.js";

vi.mock("node:child_process", () => ({ execFileSync: vi.fn(), spawn: vi.fn() }));
vi.mock("../../system-command.js", () => ({ systemCommand: (name: string) => name }));

const COMPARISON: CompareSummary = {
  source: "pip",
  target: "cath",
  comparedAt: "2026-11-01T00:00:00Z",
  patterns: [{ category: "page", change: "title", detail: 'title gains suffix " - GOV.UK"', pages: ["home en", "faq en"] }],
  totals: { pairs: 2, match: 0, differs: 2, notCaptured: 0 },
  results: [
    {
      id: "home",
      locale: "en",
      state: "default",
      verdict: "differs",
      findings: [
        { category: "page", change: "title", detail: 'title gains suffix " - GOV.UK"' },
        { category: "heading", change: "missing", detail: '"Welcome" (h2)' },
        { category: "axe-inherited", change: "serious", detail: "color-contrast: Contrast" }
      ]
    },
    {
      id: "faq",
      locale: "cy",
      state: "expanded",
      verdict: "differs",
      findings: [{ category: "axe-new", change: "serious", detail: "region: Regions" }]
    }
  ]
};

function reviewerSays(stdout: string, status = 0, stderr = "") {
  vi.mocked(spawn).mockImplementation((() => fakeReviewer({ status, stdout, stderr })) as never);
}

const spawned = (n: number) => {
  const [program, args] = vi.mocked(spawn).mock.calls[n] as unknown as [string, string[]];
  return { program, args, input: (vi.mocked(spawn).mock.results[n].value as FakeReviewer).input };
};

async function setUp(comparison: CompareSummary = COMPARISON) {
  const dir = await mkdtemp(path.join(tmpdir(), "review-"));
  const compare = path.join(dir, "compare.json");
  await writeFile(compare, JSON.stringify(comparison));
  return { dir, compare, out: path.join(dir, "out") };
}

describe("reviewFindings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should judge each pattern once and each other finding, skipping inherited axe findings, when the reviewer replies", async () => {
    // Arrange
    const { dir, compare, out } = await setUp();
    const requirements = path.join(dir, "ticket.md");
    await writeFile(requirements, "Page titles must end with - GOV.UK");
    const knownDefects = path.join(dir, "defects.md");
    await writeFile(knownDefects, "| pip shows a stray Welcome heading |");
    reviewerSays(
      `Here you go:\n${JSON.stringify({
        verdicts: [
          { id: "p1", verdict: "intended", reason: "ticket asks", evidence: "Page titles must end with - GOV.UK" },
          { id: "f2", verdict: "defect", reason: "heading lost" },
          { id: "f3", verdict: "needs-human", reason: "unsure", evidence: "" }
        ]
      })}\nDone.`
    );

    // Act
    const result = await reviewFindings({ compare, out, requirements, knownDefects, sourceName: "pip", targetName: "CaTH" });

    // Assert
    expect(result.totals).toEqual({ items: 3, intended: 1, defect: 1, needsHuman: 1 });
    expect(result.requirementsSource).toBe(requirements);
    expect(result.items.map((item) => `${item.id} ${item.category} ${item.pages.join(",")}`)).toEqual([
      "p1 page home en,faq en",
      "f2 heading home en",
      "f3 axe-new faq cy (expanded)"
    ]);
    expect(result.items[1].review).toEqual({ id: "f2", verdict: "defect", reason: "heading lost", evidence: "" });
    const { program, args, input } = spawned(0);
    expect(program).toBe("claude");
    expect(args.slice(0, 3)).toEqual(["-p", "--output-format", "json"]);
    expect(JSON.parse(args[args.indexOf("--json-schema") + 1]).required).toEqual(["verdicts"]);
    expect(args[args.indexOf("--tools") + 1]).toBe("");
    expect(args).not.toContain("--allowedTools");
    expect(result.failures).toEqual([]);
    expect(input).toContain("Page titles must end with - GOV.UK");
    expect(input).toContain("| pip shows a stray Welcome heading |");
    expect(input).toContain("between pip (the original service) and CaTH (its replacement)");
    expect(input).toContain("- id: f2\n  category: heading\n  change: missing");
    expect(input).not.toContain("color-contrast");
    expect(JSON.parse(await readFile(path.join(out, "review.json"), "utf-8"))).toEqual(result);
  });

  it("should use the given reviewer command when one is supplied", async () => {
    // Arrange
    const { compare, out } = await setUp();
    reviewerSays('{"verdicts":[]}');

    // Act
    const result = await reviewFindings({ compare, out, reviewer: ["my-llm", "--json"] });

    // Assert
    expect(spawn).toHaveBeenCalledWith("my-llm", ["--json"], expect.anything());
    expect(result.items.map((item) => item.review?.verdict)).toEqual(["needs-human", "needs-human", "needs-human"]);
    expect(result.items[0].review?.reason).toBe("The reviewer gave no usable verdict for this item.");
    expect(result.totals).toEqual({ items: 3, intended: 0, defect: 0, needsHuman: 3 });
  });

  it("should read the requirements from a GitHub issue when they are given as gh:owner/repo#N", async () => {
    // Arrange
    const { compare, out } = await setUp();
    vi.mocked(execFileSync).mockReturnValue(JSON.stringify({ title: "Migrate the home page", body: "Keep the welcome heading", author: { login: "x" } }));
    reviewerSays('{"verdicts":[]}');

    // Act
    await reviewFindings({ compare, out, requirements: "gh:hmcts/cath-service#312" });

    // Assert
    expect(execFileSync).toHaveBeenCalledWith("gh", ["issue", "view", "312", "--repo", "hmcts/cath-service", "--json", "title,body,author"], {
      encoding: "utf-8"
    });
    const prompt = spawned(0).input;
    expect(prompt).toContain("# Migrate the home page\n\nKeep the welcome heading");
  });

  it("should write the prompts in batches of 40 without calling the reviewer when promptOnly is set", async () => {
    // Arrange
    const many: CompareSummary = {
      ...COMPARISON,
      patterns: [],
      results: [
        {
          id: "list",
          locale: "en",
          state: "default",
          verdict: "differs",
          findings: Array.from({ length: 45 }, (_, i) => ({ category: "text", change: "missing", detail: `"line ${i}"` }))
        }
      ]
    };
    const { compare, out } = await setUp(many);

    // Act
    const result = await reviewFindings({ compare, out, promptOnly: true });

    // Assert
    expect(spawn).not.toHaveBeenCalled();
    expect(result.totals.items).toBe(45);
    expect((await readdir(out)).sort()).toEqual(["prompt-1.md", "prompt-2.md"]);
    const second = await readFile(path.join(out, "prompt-2.md"), "utf-8");
    expect(second).toContain("- id: f41");
    expect(second).not.toContain("- id: f40\n");
    expect(second).toContain("(no requirements were supplied)");
    expect(second).toContain("(none recorded)");
  });

  it("should send the whole batch to a human and record why when the reviewer exits non-zero", async () => {
    // Arrange
    const { compare, out } = await setUp();
    reviewerSays("", 2, "not logged in");

    // Act
    const result = await reviewFindings({ compare, out });

    // Assert
    expect(result.totals).toEqual({ items: 3, intended: 0, defect: 0, needsHuman: 3 });
    expect(result.failures).toEqual(['items p1–f3: reviewer "claude" failed (2): not logged in']);
    expect(result.items[2].review).toEqual({
      id: "f3",
      verdict: "needs-human",
      reason: 'The reviewer failed on this batch (reviewer "claude" failed (2): not logged in).',
      evidence: ""
    });
  });

  it("should not take a Claude Code result that reports an error as an answer, even when its subtype is success", async () => {
    // Arrange
    const { compare, out } = await setUp();
    reviewerSays(JSON.stringify({ type: "result", subtype: "success", is_error: true, num_turns: 1, result: "API Error: 401 No Bearer token was provided." }));

    // Act
    const result = await reviewFindings({ compare, out });

    // Assert
    expect(result.totals.needsHuman).toBe(3);
    expect(result.failures[0]).toBe("items p1–f3: reviewer stopped (success, is_error): API Error: 401 No Bearer token was provided.");
  });

  it("should take the verdicts from a Claude Code result's structured output, and send any it left out to a human", async () => {
    // Arrange
    const { compare, out } = await setUp();
    const verdicts = [
      { id: "p1", verdict: "defect", reason: "not asked for", evidence: "" },
      { id: "f3", verdict: "defect", reason: "new axe failure", evidence: "" }
    ];
    reviewerSays(JSON.stringify({ type: "result", subtype: "success", is_error: false, num_turns: 2, result: "", structured_output: { verdicts } }));

    // Act
    const result = await reviewFindings({ compare, out });

    // Assert
    expect(result.items.map((item) => `${item.id} ${item.review?.verdict}`)).toEqual(["p1 defect", "f2 needs-human", "f3 defect"]);
    expect(result.totals).toEqual({ items: 3, intended: 0, defect: 2, needsHuman: 1 });
    expect(result.failures).toEqual([]);
  });

  it("should send the batch to a human when the reviewer's output has no verdicts array", async () => {
    // Arrange
    const { compare, out } = await setUp();
    reviewerSays('{"answer":"all fine"}');

    // Act
    const result = await reviewFindings({ compare, out });

    // Assert
    expect(result.totals.needsHuman).toBe(3);
    expect(result.failures).toEqual(["items p1–f3: reviewer output has no verdicts array"]);
  });

  it("should send the batch to a human when the reviewer reaches its turn limit", async () => {
    // Arrange
    const { compare, out } = await setUp();
    reviewerSays(JSON.stringify({ type: "result", subtype: "error_max_turns", is_error: true, num_turns: 3 }));

    // Act
    const result = await reviewFindings({ compare, out });

    // Assert
    expect(result.totals.needsHuman).toBe(3);
    expect(result.failures).toEqual(["items p1–f3: hit the turn limit after 3 turns"]);
  });
});

describe("parseVerdicts", () => {
  const items: ReviewItem[] = [
    { id: "f1", category: "text", change: "missing", detail: '"a"', pages: ["home en"] },
    { id: "f2", category: "text", change: "extra", detail: '"b"', pages: ["home en"] }
  ];

  it("should drop unknown ids and verdicts, and distrust an intended verdict with no evidence", () => {
    // Arrange
    const answer = {
      verdicts: [
        { id: "f1", verdict: "intended", reason: "requested", evidence: "   " },
        { id: "f2", verdict: "approved", reason: "made up" },
        { id: "f9", verdict: "defect", reason: "not an item" },
        { verdict: "defect" },
        { id: "f2", verdict: "defect" }
      ]
    };

    // Act
    const verdicts = parseVerdicts(answer, items);

    // Assert
    expect(verdicts).toEqual([
      { id: "f1", verdict: "needs-human", reason: "requested", evidence: "   " },
      { id: "f2", verdict: "defect", reason: "", evidence: "" }
    ]);
  });

  it("should throw when the answer has no verdicts array", () => {
    // Act
    const parse = () => parseVerdicts(null, items);

    // Assert
    expect(parse).toThrow("reviewer output has no verdicts array");
  });
});

describe("buildPrompt", () => {
  it("should name the apps generically and shorten long page lists when no names are given", () => {
    // Arrange
    const pages = Array.from({ length: 10 }, (_, i) => `page${i} en`);

    // Act
    const prompt = buildPrompt({ requirements: "", knownDefects: "", items: [{ id: "p1", category: "page", change: "lang", detail: "en → cy", pages }] });

    // Assert
    expect(prompt).toContain("between the source app (the original service) and the target app (its replacement)");
    expect(prompt).toContain("pages (10): page0 en, page1 en, page2 en, page3 en, page4 en, page5 en, page6 en, page7 en, …");
    expect(prompt).not.toContain("page8 en");
  });
});
