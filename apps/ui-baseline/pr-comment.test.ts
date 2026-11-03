import { execFileSync } from "node:child_process";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CompareSummary, ReviewResult } from "./core/index.js";
import { buildComment, COMMENT_MARKER, type CommentInput, postComment } from "./pr-comment.js";

vi.mock("node:child_process", () => ({ execFileSync: vi.fn() }));

type Item = ReviewResult["items"][number];
type VerdictName = NonNullable<Item["review"]>["verdict"];

const item = (verdict: VerdictName | null, overrides: Partial<Item> = {}): Item => ({
  id: `item-${verdict}`,
  category: "content",
  change: "text-changed",
  detail: "The heading differs",
  pages: ["civil-daily en", "civil-daily cy"],
  review: verdict ? { id: `item-${verdict}`, verdict, reason: `Because ${verdict}`, evidence: "" } : null,
  ...overrides
});

const review = (items: Item[]): ReviewResult => ({
  reviewedAt: "2026-11-03T10:00:00Z",
  totals: { items: items.length, intended: 0, defect: 0, needsHuman: 0 },
  items
});

const comparison = (categories: string[]): CompareSummary => ({
  source: "pip",
  target: "cath",
  comparedAt: "2026-11-03T10:00:00Z",
  patterns: [],
  totals: { pairs: 1, match: 0, differs: 1, notCaptured: 0 },
  results: [
    { id: "civil-daily", locale: "en", state: "default", verdict: "differs", findings: categories.map((category) => ({ category, change: "x", detail: "y" })) }
  ]
});

const input = (overrides: Partial<CommentInput> = {}): CommentInput => ({
  target: "http://localhost:8080",
  baseline: "apps/ui-baseline/output/baseline",
  commit: "abc1234",
  ranBy: "tester",
  ranAt: "2026-11-03T10:00:00Z",
  evidence: ["report.zip", "civil-daily-en.png"],
  pagesChecked: 1,
  pagesDiffer: ["civil-daily (English)"],
  pages: [{ label: "CIVIL_DAILY_CAUSE_LIST", english: "2 findings", welsh: "matches" }],
  skipped: [],
  comparisons: [],
  reviews: [],
  ...overrides
});

describe("pr-comment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("buildComment", () => {
    it("should lead with the marker and an unreviewed headline when there are no reviews", () => {
      // Arrange
      const comparisons = [comparison(["content", "content", "axe-inherited", "structure"])];

      // Act
      const body = buildComment(input({ comparisons }));

      // Assert
      const lines = body.split("\n");
      expect(lines[0]).toBe(COMMENT_MARKER);
      expect(lines[1]).toBe("## Parity with pip");
      expect(body).toContain("**1 of 1 page differ from pip · not reviewed against a ticket**");
      expect(body).toContain("Checked 1 page in English and Welsh");
      expect(body).toContain("| content | 2 |\n| structure | 1 |");
      expect(body).not.toContain("axe-inherited");
      expect(body).not.toContain("### Defects");
      expect(body).toContain("<sub>Run it yourself: `yarn ui-baseline:check`.");
    });

    it("should count defects, needs-human and intended items when reviewed against a ticket", () => {
      // Arrange
      const reviews = [review([item("defect"), item("needs-human"), item("intended"), item("intended"), item(null)])];

      // Act
      const body = buildComment(input({ ticket: "42", reviews, comparisons: [comparison(["content"])] }));

      // Assert
      expect(body).toContain("## Parity with pip: ticket #42");
      expect(body).toContain("**❌ 1 defect · ⚠️ 1 needs a human · ✅ 2 intended**");
      expect(body).toContain("### Defects\n| | Finding | Pages | Why |");
      expect(body).toContain("| ❌ | **content · text changed**<br>The heading differs | civil-daily (English, Welsh) | Because defect |");
      expect(body).toContain("### Needs a human");
      expect(body).toContain("<details><summary>2 intended differences</summary>");
      expect(body).not.toContain("Findings by category");
      expect(body).toContain("`yarn ui-baseline:check --ticket 42`");
    });

    it("should say there are no defects when every reviewed item is intended", () => {
      // Arrange
      const reviews = [review([item("intended")])];

      // Act
      const body = buildComment(input({ reviews }));

      // Assert
      expect(body).toContain("**✅ no defects · ⚠️ 0 need a human · ✅ 1 intended**");
      expect(body).toContain("<details><summary>1 intended difference</summary>");
      expect(body).not.toContain("### Needs a human");
    });

    it("should quote evidence, escape cells and label pages when a finding has them", () => {
      // Arrange
      const finding = item("defect", {
        category: "a|b",
        detail: `<b>${"x".repeat(300)}</b>`,
        pages: ["page--one en", "page--two cy (mobile)"]
      });
      (finding.review as NonNullable<Item["review"]>).evidence = "The ticket says\nso";

      // Act
      const body = buildComment(input({ reviews: [review([finding])] }));

      // Assert
      expect(body).toContain("**a\\|b · text changed**<br>&lt;b&gt;");
      expect(body).toContain(`${"x".repeat(214)}…`);
      expect(body).toContain("| 2 pages |");
      expect(body).toContain("Because defect<br><sub>“The ticket says so”</sub>");
    });

    it("should show only the first 25 rows when a table has more", () => {
      // Arrange
      const items = Array.from({ length: 27 }, (_, i) => item("defect", { id: `d${i}`, detail: `Defect ${i}` }));

      // Act
      const body = buildComment(input({ reviews: [review(items)] }));

      // Assert
      expect(body).toContain("Defect 24");
      expect(body).not.toContain("Defect 25");
      expect(body).toContain("| | _…and 2 more in the full report_ | | |");
    });

    it("should list differing files and journeys when they differ", () => {
      // Act
      const body = buildComment(
        input({
          files: { compared: 3, differ: ["civil-daily PDF (differs)"] },
          journeys: { compared: 2, differ: ["subscribe (English): 1 step page differs"] }
        })
      );

      // Assert
      expect(body).toContain("### PDF and Excel files\n1 of 3 files differ from pip (PDFs by text only):\n- civil-daily PDF (differs)");
      expect(body).toContain("### Journeys\n1 of 2 journey runs differ from pip:\n- subscribe (English): 1 step page differs");
      expect(body).toContain("**1 of 1 page and 1 of 2 journey runs differ from pip");
      expect(body).toContain("Checked 1 page and 2 journey runs");
    });

    it("should say files and journeys match when none differ", () => {
      // Act
      const body = buildComment(input({ files: { compared: 2, differ: [] }, journeys: { compared: 1, differ: [] } }));

      // Assert
      expect(body).toContain("All 2 files match pip (PDFs by text only).");
      expect(body).toContain("All 1 journey runs match pip, step by step.");
    });

    it("should describe journeys alone when a check has no pages", () => {
      // Act
      const body = buildComment(input({ pagesChecked: 0, pagesDiffer: [], pages: [], journeys: { compared: 1, differ: [] } }));

      // Assert
      expect(body).toContain("**0 of 1 journey run differ from pip · not reviewed against a ticket**");
      expect(body).toContain("Checked 1 journey run in English and Welsh");
      expect(body).not.toContain("Pages checked");
    });

    it("should fall back to 0 pages when nothing was checked", () => {
      // Act
      const body = buildComment(input({ pagesChecked: 0, pagesDiffer: [], pages: [] }));

      // Assert
      expect(body).toContain("**0 pages differ from pip");
      expect(body).toContain("Checked 0 pages in English");
    });

    it("should list pages checked, what was not checked and the evidence when given them", () => {
      // Act
      const body = buildComment(input({ pagesChecked: 2, skipped: ["/a: no CaTH page mapped", "journey x: not in the pip baseline"] }));

      // Assert
      expect(body).toContain("| Page | English | Welsh |\n|---|---|---|\n| CIVIL_DAILY_CAUSE_LIST | 2 findings | matches |");
      expect(body).toContain("<details><summary>2 not checked</summary>\n\n- /a: no CaTH page mapped\n- journey x: not in the pip baseline");
      expect(body).toContain("below this line: report.zip, civil-daily-en.png -->");
      expect(body).toContain("_Expected: `report.zip`, `civil-daily-en.png`.");
      expect(body).toContain(
        "Checked commit `abc1234` by tester against `http://localhost:8080` · baseline `apps/ui-baseline/output/baseline` · Tue, 03 Nov 2026 10:00:00 GMT"
      );
    });
  });

  describe("postComment", () => {
    it("should create a comment when the PR has no parity comment", () => {
      // Arrange
      vi.mocked(execFileSync)
        .mockReturnValueOnce(JSON.stringify([{ id: 1, body: "Unrelated", html_url: "u1" }]))
        .mockReturnValueOnce(JSON.stringify({ html_url: "https://github.com/c/new" }));

      // Act
      const url = postComment("hmcts/cath-service", 7, "body");

      // Assert
      expect(url).toBe("https://github.com/c/new");
      expect(execFileSync).toHaveBeenNthCalledWith(1, "gh", ["api", "repos/hmcts/cath-service/issues/7/comments", "--paginate"], { encoding: "utf-8" });
      expect(execFileSync).toHaveBeenNthCalledWith(2, "gh", ["api", "--method", "POST", "repos/hmcts/cath-service/issues/7/comments", "-f", "body=body"], {
        encoding: "utf-8"
      });
    });

    it("should update the marked comment when the PR already has one", () => {
      // Arrange
      vi.mocked(execFileSync)
        .mockReturnValueOnce(JSON.stringify([{ id: 99, body: `${COMMENT_MARKER}\nold`, html_url: "u99" }]))
        .mockReturnValueOnce(JSON.stringify({ html_url: "https://github.com/c/99" }));

      // Act
      const url = postComment("hmcts/cath-service", 7, "new body");

      // Assert
      expect(url).toBe("https://github.com/c/99");
      expect(execFileSync).toHaveBeenNthCalledWith(
        2,
        "gh",
        ["api", "--method", "PATCH", "repos/hmcts/cath-service/issues/comments/99", "-f", "body=new body"],
        {
          encoding: "utf-8"
        }
      );
    });
  });
});
