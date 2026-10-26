import { execFileSync } from "node:child_process";
import type { CompareSummary, ReviewResult } from "@hmcts/ui-baseline";

// The PR comment for a parity check: verdict first, then what needs fixing, then what needs a human,
// with intended differences and per-page detail folded away. One comment per PR, found again by the
// marker and updated in place, so repeated runs never pile up comments. Evidence files are attached
// by the dev under the Evidence heading, since GitHub only takes attachments through its web editor.
export const COMMENT_MARKER = "<!-- parity-check -->";
const MAX_ROWS = 25;
const ICON = { defect: "❌", "needs-human": "⚠️", intended: "✅" } as const;

export function buildComment(input: CommentInput): string {
  const reviewed = input.reviews.length > 0;
  const items = input.reviews.flatMap((review) => review.items.filter((item) => item.review));
  const by = (verdict: keyof typeof ICON) => items.filter((item) => item.review?.verdict === verdict);
  const defects = by("defect");
  const needsHuman = by("needs-human");
  const intended = by("intended");

  const headline = reviewed
    ? `${defects.length ? `❌ ${defects.length} defect${defects.length === 1 ? "" : "s"}` : "✅ no defects"} · ⚠️ ${needsHuman.length} need${needsHuman.length === 1 ? "s" : ""} a human · ✅ ${intended.length} intended`
    : `${input.pagesDiffer.length} of ${input.pagesChecked} page${input.pagesChecked === 1 ? "" : "s"} differ from pip · not reviewed against a ticket`;

  const table = (rows: typeof items) =>
    [
      "| | Finding | Pages | Why |",
      "|---|---|---|---|",
      ...rows.slice(0, MAX_ROWS).map((item) => {
        const review = item.review as NonNullable<typeof item.review>;
        const why = review.evidence ? `${cell(review.reason)}<br>${quoteEvidence(review.evidence)}` : cell(review.reason);
        return `| ${ICON[review.verdict]} | **${cell(item.category)} · ${cell(item.change.replace(/-/g, " "))}**<br>${cell(truncate(item.detail, 220))} | ${cell(pagesLabel(item.pages))} | ${why} |`;
      }),
      ...(rows.length > MAX_ROWS ? [`| | _…and ${rows.length - MAX_ROWS} more in the full report_ | | |`] : [])
    ].join("\n");

  const pages = input.pages.map((page) => `| ${cell(page.label)} | ${page.english} | ${page.welsh} |`).join("\n");

  return [
    COMMENT_MARKER,
    `## Parity with pip${input.ticket ? `: ticket #${input.ticket}` : ""}`,
    `**${headline}**`,
    "",
    `Checked ${input.pagesChecked} page${input.pagesChecked === 1 ? "" : "s"} in English and Welsh against the pip baseline, with CaTH seeded from the same fixtures.`,
    "",
    reviewed && defects.length ? `### Defects\n${table(defects)}\n` : "",
    reviewed && needsHuman.length ? `### Needs a human\n${table(needsHuman)}\n` : "",
    reviewed && intended.length
      ? `<details><summary>${intended.length} intended difference${intended.length === 1 ? "" : "s"}</summary>\n\n${table(intended)}\n\n</details>\n`
      : "",
    !reviewed && input.comparisons.length ? `<details><summary>Findings by category</summary>\n\n${categorySummary(input.comparisons)}\n\n</details>\n` : "",
    `<details><summary>Pages checked</summary>\n\n| Page | English | Welsh |\n|---|---|---|\n${pages}\n\n</details>\n`,
    input.skipped.length
      ? `<details><summary>${input.skipped.length} not checked</summary>\n\n${input.skipped.map((s) => `- ${cell(s)}`).join("\n")}\n\n</details>\n`
      : "",
    "### Evidence",
    `<!-- Drag the files from the check's evidence folder below this line: ${input.evidence.join(", ")} -->`,
    `_Expected: ${input.evidence.map((file) => `\`${file}\``).join(", ")}. Unzip \`report.zip\` and open \`index.html\` for the full side-by-side report._\n`,
    "",
    "---",
    `Checked commit \`${input.commit}\` locally by ${input.ranBy} against \`${input.target}\` · baseline \`${input.baseline}\` · ${new Date(input.ranAt).toUTCString()}`,
    "",
    "<sub>Run it yourself: `yarn ui-baseline:check" +
      (input.ticket ? ` --ticket ${input.ticket}` : "") +
      "`. A difference is only *intended* when the ticket or a known pip defect explains it, quoted above.</sub>"
  ]
    .filter((line) => line !== "")
    .join("\n");
}

// Creates the parity comment on the PR, or updates it if one exists
export function postComment(repo: string, pr: number, body: string): string {
  const comments = JSON.parse(execFileSync("gh", ["api", `repos/${repo}/issues/${pr}/comments`, "--paginate"], { encoding: "utf-8" })) as {
    id: number;
    body: string;
    html_url: string;
  }[];
  const existing = comments.find((comment) => comment.body.includes(COMMENT_MARKER));
  const response = existing
    ? execFileSync("gh", ["api", "--method", "PATCH", `repos/${repo}/issues/comments/${existing.id}`, "-f", `body=${body}`], { encoding: "utf-8" })
    : execFileSync("gh", ["api", "--method", "POST", `repos/${repo}/issues/${pr}/comments`, "-f", `body=${body}`], { encoding: "utf-8" });
  return (JSON.parse(response) as { html_url: string }).html_url;
}

function categorySummary(comparisons: CompareSummary[]): string {
  const counts = new Map<string, number>();
  for (const summary of comparisons) {
    for (const result of summary.results)
      for (const finding of result.findings.filter((f) => f.category !== "axe-inherited"))
        counts.set(finding.category, (counts.get(finding.category) ?? 0) + 1);
  }
  return [
    "| Category | Findings |",
    "|---|---|",
    ...[...counts.entries()].sort((a, b) => b[1] - a[1]).map(([category, count]) => `| ${category} | ${count} |`)
  ].join("\n");
}

function pagesLabel(pages: string[]): string {
  const languages = (page: string) => (page.endsWith(" cy") ? "Welsh" : page.endsWith(" en") ? "English" : "");
  const ids = [...new Set(pages.map((page) => page.replace(/ (en|cy)( \(.*\))?$/, "")))];
  if (ids.length === 1) return `${ids[0]} (${[...new Set(pages.map(languages))].filter(Boolean).join(", ")})`;
  return `${ids.length} pages`;
}

function quoteEvidence(evidence: string): string {
  return `<sub>“${cell(truncate(evidence, 160))}”</sub>`;
}

function truncate(text: string, length: number): string {
  return text.length > length ? `${text.slice(0, length - 1)}…` : text;
}

// Table cells cannot contain pipes or newlines; angle brackets would be read as HTML
function cell(text: string): string {
  return text.replace(/\|/g, "\\|").replace(/\n/g, " ").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export interface CommentInput {
  ticket?: string;
  target: string;
  baseline: string;
  commit: string;
  ranBy: string;
  ranAt: string;
  evidence: string[];
  pagesChecked: number;
  pagesDiffer: string[];
  pages: { label: string; english: string; welsh: string }[];
  skipped: string[];
  comparisons: CompareSummary[];
  reviews: ReviewResult[];
}
