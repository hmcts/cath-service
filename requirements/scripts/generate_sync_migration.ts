// Generate a migration that reconciles the requirements database with the board.
//
// Reads board state (JSON Lines from fetch_board.sh) plus the built database, and
// emits SQL for the delta on stdout. Emits nothing and exits 1 when there is no
// drift, so a caller can distinguish "nothing to do" from "something to write".
//
// Everything here is mechanical: status comes from the board column, priority and
// granularity from labels, impl fields from merged closing PRs. Inferred
// requirement_link rows are deliberately NOT generated — those are judgement and
// are added as a separate reviewable step.
//
// Usage: tsx requirements/scripts/generate_sync_migration.ts <board.jsonl> <db> <today-iso>

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const CHANGED_BY = "github-actions[bot]";

// GitHub label -> requirement column. type:feature predates the epic/story/task
// convention and was mapped to 'epic' for REQ-0001 and REQ-0003; keep that.
const PRIORITY_BY_LABEL: Record<string, string> = {
  "1-highest": "highest",
  "2-high": "high",
  "3-medium": "medium",
  "4-low": "low",
  "5-lowest": "lowest"
};

const GRANULARITY_BY_LABEL: Record<string, string> = {
  epic: "epic",
  feature: "epic",
  story: "story",
  task: "task"
};

// Paths that describe how the repo is built rather than what it does.
const EXCLUDED_PATH_PATTERNS = [
  /(^|\/)yarn\.lock$/,
  /(^|\/)package-lock\.json$/,
  /^\.github\//,
  /(^|\/)helm\//,
  /\.md$/,
  /\.ya?ml$/,
  /(^|\/)(dist|build|generated|coverage)\//
];

function sqlString(value: string | null): string {
  if (value === null) return "NULL";
  return `'${value.replace(/'/g, "''")}'`;
}

function priorityOf(labels: string[]): string | null {
  for (const label of labels) {
    if (!label.startsWith("priority:")) continue;
    const mapped = PRIORITY_BY_LABEL[label.slice("priority:".length)];
    if (mapped) return mapped;
  }
  return null;
}

function granularityOf(labels: string[]): string | null {
  for (const label of labels) {
    if (!label.startsWith("type:")) continue;
    const mapped = GRANULARITY_BY_LABEL[label.slice("type:".length)];
    if (mapped) return mapped;
  }
  return null;
}

function implOf(mergedPrs: BoardItem["mergedPrs"]): { sha: string | null; paths: string | null } {
  if (mergedPrs.length === 0) return { sha: null, paths: null };

  const latest = [...mergedPrs].sort((a, b) => a.number - b.number).at(-1);
  const paths = [...new Set(mergedPrs.flatMap((pr) => pr.paths).filter((p) => !EXCLUDED_PATH_PATTERNS.some((re) => re.test(p))))].sort();

  return {
    sha: latest?.mergeCommitOid ?? null,
    paths: paths.length > 0 ? JSON.stringify(paths) : null
  };
}

function queryDb(dbPath: string, sql: string): DbRow[] {
  const out = execFileSync("sqlite3", ["-json", dbPath, sql], { encoding: "utf8" }).trim();
  return out === "" ? [] : JSON.parse(out);
}

const [boardPath, dbPath, today] = process.argv.slice(2);
if (!boardPath || !dbPath || !today) {
  console.error("Usage: generate_sync_migration.ts <board.jsonl> <db> <today-iso>");
  process.exit(2);
}

const board: BoardItem[] = readFileSync(boardPath, "utf8")
  .split("\n")
  .filter((line) => line.trim() !== "")
  .map((line) => JSON.parse(line));

if (board.length === 0) {
  console.error("error: board file is empty — refusing to generate a migration");
  process.exit(1);
}

const existing = queryDb(
  dbPath,
  "SELECT id, ref, issue_number, status, priority, granularity, impl_commit_sha, impl_paths, version FROM requirement WHERE issue_number IS NOT NULL"
);
const byIssue = new Map(existing.map((row) => [row.issue_number, row]));

const maxId = Number(queryDb(dbPath, "SELECT COALESCE(MAX(id), 0) AS m FROM requirement")[0].m);
const maxRef = Number(queryDb(dbPath, "SELECT COALESCE(MAX(CAST(substr(ref, 5) AS INTEGER)), 0) AS m FROM requirement WHERE ref LIKE 'REQ-%'")[0].m);

// Deduplicate by issue and order deterministically so a rerun produces identical SQL.
const items = [...new Map(board.map((item) => [item.issueNumber, item])).values()].sort((a, b) => a.issueNumber - b.issueNumber);

const created: string[] = [];
const updated: string[] = [];
const newRefs: string[] = [];
const statusMoves: string[] = [];

let nextId = maxId;
let nextRef = maxRef;

for (const item of items) {
  const impl = implOf(item.mergedPrs);
  const priority = priorityOf(item.labels);
  const granularity = granularityOf(item.labels);
  const row = byIssue.get(item.issueNumber);

  if (!row) {
    nextId += 1;
    nextRef += 1;
    const ref = `REQ-${String(nextRef).padStart(4, "0")}`;
    newRefs.push(`${ref} (#${item.issueNumber}, ${item.boardColumn})`);

    created.push(
      [
        "INSERT INTO requirement",
        "  (id, ref, title, statement, kind, status, priority, granularity,",
        "   issue_number, issue_url, impl_commit_sha, impl_paths,",
        "   created_at, updated_at, created_by, updated_by)",
        "VALUES",
        `  (${nextId}, ${sqlString(ref)}, ${sqlString(item.title)}, ${sqlString(item.body)},`,
        `   'functional', ${sqlString(item.status)}, ${sqlString(priority)}, ${sqlString(granularity)},`,
        `   ${item.issueNumber}, ${sqlString(item.url)}, ${sqlString(impl.sha)}, ${sqlString(impl.paths)},`,
        `   ${sqlString(item.createdAt)}, ${sqlString(item.createdAt)}, ${sqlString(CHANGED_BY)}, ${sqlString(CHANGED_BY)});`,
        "",
        "INSERT INTO requirement_change",
        "  (requirement_id, version, change_type, change_summary, changed_by, changed_at)",
        "VALUES",
        `  (${nextId}, 1, 'created', 'imported from GitHub issue', ${sqlString(CHANGED_BY)}, ${sqlString(item.createdAt)});`,
        ""
      ].join("\n")
    );
    continue;
  }

  // Existing row: collect only the fields that actually differ.
  const diffs: { field: string; from: string | null; to: string | null }[] = [];
  if (row.status !== item.status) diffs.push({ field: "status", from: row.status, to: item.status });
  if (row.priority !== priority) diffs.push({ field: "priority", from: row.priority, to: priority });
  if (row.granularity !== granularity) {
    diffs.push({ field: "granularity", from: row.granularity, to: granularity });
  }
  // Never clear an existing impl value just because a PR reference went missing.
  if (impl.sha !== null && row.impl_commit_sha !== impl.sha) {
    diffs.push({ field: "impl_commit_sha", from: row.impl_commit_sha, to: impl.sha });
  }
  if (impl.paths !== null && row.impl_paths !== impl.paths) {
    diffs.push({ field: "impl_paths", from: row.impl_paths, to: impl.paths });
  }
  if (diffs.length === 0) continue;

  const version = Number(row.version) + 1;
  const sets = diffs.map((d) => `${d.field} = ${sqlString(d.to)}`);

  const statusDiff = diffs.find((d) => d.field === "status");
  if (statusDiff) {
    statusMoves.push(`${row.ref} (#${item.issueNumber}): ${statusDiff.from} -> ${statusDiff.to} [${item.boardColumn}]`);
  }

  // One UPDATE and one version bump per requirement, with a change row per field.
  updated.push(
    [
      `UPDATE requirement SET ${sets.join(", ")},`,
      `  version = ${version}, updated_at = ${sqlString(today)}, updated_by = ${sqlString(CHANGED_BY)}`,
      `WHERE id = ${row.id};`,
      "",
      "INSERT INTO requirement_change",
      "  (requirement_id, version, field, old_value, new_value, change_type, change_summary, changed_by, changed_at)",
      "VALUES",
      `${diffs
        .map(
          (d) =>
            `  (${row.id}, ${version}, ${sqlString(d.field)}, ${sqlString(d.from)}, ${sqlString(d.to)}, ` +
            `${d.field === "status" ? "'status_changed'" : "'modified'"}, 'reconciled with board', ` +
            `${sqlString(CHANGED_BY)}, ${sqlString(today)})`
        )
        .join(",\n")};`,
      ""
    ].join("\n")
  );
}

if (created.length === 0 && updated.length === 0) {
  console.error("No drift: the database already matches the board.");
  process.exit(1);
}

const header = [
  `-- Reconciles the requirements database with GitHub Project #43 (CaTH Kanban)`,
  `-- as read on ${today}.`,
  "--",
  `-- ${created.length} new requirement(s), ${updated.length} updated.`,
  "--",
  "-- Board column -> status mapping covers the whole board, so a ticket moving",
  "-- backwards is mirrored like any other move and recorded in requirement_change.",
  "--",
  ...(newRefs.length > 0 ? ["-- New:", ...newRefs.map((r) => `--   ${r}`), "--"] : []),
  ...(statusMoves.length > 0 ? ["-- Status changes:", ...statusMoves.map((s) => `--   ${s}`), "--"] : []),
  "-- Generated by requirements/scripts/generate_sync_migration.ts — do not hand-edit.",
  "",
  "BEGIN TRANSACTION;",
  ""
].join("\n");

process.stdout.write(`${header}\n${[...created, ...updated].join("\n")}\nCOMMIT;\n`);

interface BoardItem {
  issueNumber: number;
  title: string;
  body: string;
  url: string;
  createdAt: string;
  boardColumn: string;
  status: string;
  labels: string[];
  mergedPrs: { number: number; mergeCommitOid: string | null; paths: string[] }[];
}

interface DbRow {
  [key: string]: string | number | null;
}
