import { execFileSync, spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { cp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { type CompareSummary, captureBatch, compareRuns, type ReviewResult, reviewFindings } from "@hmcts/ui-baseline";
import { chromium } from "playwright";
import { loadManifest, type PublicationFixture, type SeedResult } from "./fixtures/manifest.js";
import { buildComment, postComment } from "./pr-comment.js";

// One command for a developer or QA: does CaTH match the pip baseline for this ticket (or these
// list types / pages)? Seeds CaTH with the baseline's fixtures, captures CaTH, compares against the
// pip baseline, reviews the differences against the ticket, and writes a focused report.
// pip itself is not needed; only the baseline it produced. Writes the evidence for the PR
// (comment, zipped report, side-by-side screenshots), and posts the comment with --post-pr.
const PARITY_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_DIR = path.join(PARITY_DIR, "../..");
const DEFAULT_BASELINE = process.env.PARITY_BASELINE ?? path.join(PARITY_DIR, "output/baseline");
const LOCALES = ["en", "cy"];
const REPORT_PORT = 9500;
const SIDE_BY_SIDE_WIDTH = 1600;

const { values: args } = parseArgs({
  options: {
    ticket: { type: "string" },
    "list-type": { type: "string", multiple: true },
    route: { type: "string", multiple: true },
    target: { type: "string" },
    baseline: { type: "string" },
    locale: { type: "string" },
    out: { type: "string" },
    "no-seed": { type: "boolean", default: false },
    "no-review": { type: "boolean", default: false },
    reviewer: { type: "string" },
    serve: { type: "boolean", default: false },
    // Post (or update) the check's comment on this PR, using the dev's gh sign-in
    "post-pr": { type: "string" },
    repo: { type: "string", default: "hmcts/cath-service" }
  }
});

const apps = JSON.parse(await readFile(path.join(PARITY_DIR, "apps.json"), "utf-8"));
const targetBase = args.target ?? apps.cath.baseUrl;
const baseline = path.resolve(args.baseline ?? DEFAULT_BASELINE);
const locales = args.locale ? [args.locale] : LOCALES;
const manifest = await loadManifest();
const routeMap = JSON.parse(await readFile(path.join(PARITY_DIR, "routes/route-map.json"), "utf-8")).routes as RouteEntry[];
if (!existsSync(path.join(baseline, "lists/index.jsonl")))
  throw new Error(`no pip baseline at ${baseline}: record one with \`yarn ui-baseline:record-pip\` (or point --baseline at one)`);

// ---------- 1. What to check ----------
const requirements = args.ticket ? await ticketText(args.ticket) : null;
const scope = selectScope(requirements, args["list-type"] ?? [], args.route ?? []);
const name = args.ticket
  ? `ticket-${args.ticket}`
  : [...scope.publications.map((p) => p.id), ...scope.routes.map((r) => r.pip.replace(/^\//, "").replace(/\//g, "-"))].slice(0, 3).join("+") || "check";
const out = path.resolve(args.out ?? path.join(PARITY_DIR, "output/checks", name));
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
if (requirements) await writeFile(path.join(out, "requirements.md"), requirements);

step(`Checking ${targetBase} against the pip baseline (${path.relative(REPO_DIR, baseline)})`);
console.log(`  list types: ${scope.publications.map((p) => p.listType).join(", ") || "none"}`);
console.log(`  pages:      ${scope.routes.map((r) => `${r.pip} → ${r.cath}`).join(", ") || "none"}`);
for (const skipped of scope.skipped) console.log(`  skipped:    ${skipped}`);
if (!scope.publications.length && !scope.routes.length) {
  console.log("\nNothing to check: name a ticket that mentions list types or pages, or pass --list-type / --route.");
  process.exit(2);
}

// ---------- 2. Seed CaTH with the baseline's fixtures ----------
const seedFile = path.join(PARITY_DIR, "output/seed/cath-check.json");
if (scope.publications.length && !args["no-seed"]) {
  step("Seeding CaTH");
  const seeding = spawnSync(
    "npx",
    [
      "tsx",
      ...(existsSync(path.join(REPO_DIR, ".env")) ? ["--env-file=.env"] : []),
      "tools/ui-baseline/cath/seed.ts",
      `--only=${scope.publications.map((p) => p.id).join(",")}`
    ],
    {
      cwd: REPO_DIR,
      env: { ...process.env, PARITY_SEED_OUTPUT: seedFile },
      encoding: "utf-8"
    }
  );
  for (const line of `${seeding.stdout}${seeding.stderr}`.split("\n").filter((l) => /published|REJECTED|Error/.test(l))) console.log(`  ${line.trim()}`);
  if (seeding.status !== 0) throw new Error("seeding CaTH failed");
}
const seed = existsSync(seedFile) ? (JSON.parse(await readFile(seedFile, "utf-8")) as SeedResult) : null;

// ---------- 3. Capture CaTH ----------
step("Capturing CaTH");
const listTargets = scope.publications.flatMap((publication) => {
  const seeded = seed?.publications[publication.id];
  if (!seeded || !publication.paths.cath) return [];
  return [
    {
      id: publication.id,
      url: `${targetBase}${publication.paths.cath}?artefactId=${seeded.artefactId}`,
      locales,
      cookies: apps.cath.cookies,
      source: { app: "cath", fixture: publication.id, ingestion: seed?.ingestion, ...seeded }
    }
  ];
});
const pageTargets = await Promise.all(
  scope.routes.map(async (route) => {
    const baselineUrl = new URL(JSON.parse(await readFile(path.join(baseline, "pages", route.id, "en/default/provenance.json"), "utf-8")).url);
    return {
      id: route.id,
      url: `${targetBase}${route.cath}${baselineUrl.search}`,
      locales,
      cookies: apps.cath.cookies,
      source: { app: "cath", kind: "page", route: route.cath, pipRoute: route.pip }
    };
  })
);
const captured: Record<string, string> = {};
for (const [area, targets] of [
  ["lists", listTargets],
  ["pages", pageTargets]
] as const) {
  if (!targets.length) continue;
  const targetsFile = path.join(out, `targets-${area}.json`);
  await writeFile(targetsFile, JSON.stringify(targets, null, 2));
  const results = await captureBatch(targetsFile, { outDir: path.join(out, "cath", area) }, 4);
  console.log(`  ${area}: ${results.filter((r) => r.ok).length} captured, ${results.filter((r) => !r.ok).length} failed`);
  captured[area] = path.join(out, "cath", area);
}

// ---------- 4. Compare with the baseline ----------
step("Comparing with pip");
const comparisons: Record<string, CompareSummary> = {};
for (const area of Object.keys(captured)) {
  const ids = area === "lists" ? scope.publications.map((p) => p.id) : scope.routes.map((r) => r.id);
  comparisons[area] = await compareRuns({ source: path.join(baseline, area), target: captured[area], out: path.join(out, "compare", area), only: ids });
  const t = comparisons[area].totals;
  console.log(`  ${area}: ${t.pairs - t.notCaptured} page-language pairs compared, ${t.match} match, ${t.differs} differ`);
}

// ---------- 5. Review against the ticket ----------
const reviews: Record<string, ReviewResult> = {};
if (!args["no-review"] && requirements) {
  step("Reviewing differences against the ticket");
  for (const area of Object.keys(comparisons)) {
    try {
      reviews[area] = await reviewFindings({
        compare: path.join(out, "compare", area, "compare.json"),
        out: path.join(out, "review", area),
        requirements: path.join(out, "requirements.md"),
        knownDefects: path.join(PARITY_DIR, "pip/KNOWN-DEFECTS.md"),
        sourceName: "pip",
        targetName: "CaTH",
        reviewer: args.reviewer?.split(" ").filter(Boolean)
      });
      const t = reviews[area].totals;
      console.log(`  ${area}: ${t.defect} defects, ${t.needsHuman} need a human, ${t.intended} intended`);
    } catch (error) {
      console.log(`  ${area}: review skipped (${(error as Error).message.split("\n")[0]}). Run with --reviewer, or --no-review.`);
    }
  }
}

// ---------- 6. Report ----------
step("Writing the report");
const listsDir = path.join(out, "lists");
await mkdir(listsDir, { recursive: true });
await symlink(path.join(baseline, "lists"), path.join(listsDir, "pip"));
if (captured.lists) await symlink(captured.lists, path.join(listsDir, "cath"));
const reportArgs = [
  path.join(PARITY_DIR, "report/make-report.mjs"),
  "--lists",
  listsDir,
  "--manifest",
  path.join(PARITY_DIR, "fixtures/publications.json"),
  "--pages",
  path.join(baseline, "pages"),
  "--route-map",
  path.join(PARITY_DIR, "routes/route-map.json"),
  "--defects",
  path.join(PARITY_DIR, "pip/KNOWN-DEFECTS.md"),
  "--govuk",
  path.join(REPO_DIR, "node_modules/govuk-frontend/dist/govuk"),
  "--only",
  [...scope.publications.map((p) => p.id), ...scope.routes.map((r) => r.id)].join(","),
  "--title",
  args.ticket ? `Parity check: ticket ${args.ticket}` : "Parity check",
  "--out",
  path.join(out, "report"),
  ...(captured.pages ? ["--cath-pages", captured.pages] : []),
  ...(comparisons.lists ? ["--compare", path.join(out, "compare/lists/compare.json")] : []),
  ...(comparisons.pages ? ["--pages-compare", path.join(out, "compare/pages/compare.json")] : []),
  ...Object.keys(reviews).flatMap((area) => ["--review", path.join(out, "review", area, "review.json")])
];
execFileSync("node", reportArgs, { stdio: "ignore" });

// ---------- Summary ----------
const defects = Object.values(reviews).reduce((sum, r) => sum + r.totals.defect, 0);
const needsHuman = Object.values(reviews).reduce((sum, r) => sum + r.totals.needsHuman, 0);
// Each page is compared once per language; report pages, with the languages that differ
const pageVerdicts = new Map<string, string[]>();
for (const summary of Object.values(comparisons)) {
  for (const result of summary.results.filter((r) => r.state === "default" && r.verdict === "differs")) {
    pageVerdicts.set(result.id, [...(pageVerdicts.get(result.id) ?? []), result.locale === "cy" ? "Welsh" : "English"]);
  }
}
const differing = [...pageVerdicts.entries()].map(([id, languages]) => `${id} (${languages.join(" and ")})`);
const checkedCount = scope.publications.length + scope.routes.length;
const pagesDiffer = `${differing.length} of ${checkedCount} page${checkedCount === 1 ? "" : "s"} ${differing.length === 1 ? "differs" : "differ"} from pip`;
step("Result");
console.log(
  Object.keys(reviews).length
    ? `  ${defects} defect${defects === 1 ? "" : "s"}, ${needsHuman} need a human · ${pagesDiffer}`
    : `  ${pagesDiffer} (not reviewed against a ticket)`
);
for (const line of differing) console.log(`    ${line}`);

// ---------- Evidence for the PR ----------
// GitHub only takes attachments through its web editor, so the dev drags these into the comment
step("Writing the evidence");
const evidence = path.join(out, "evidence");
await mkdir(evidence, { recursive: true });
const bundle = await bundleReport();
execFileSync("zip", ["-qr", path.join(evidence, "report.zip"), "."], { cwd: bundle });
const screenshots = await sideBySide(evidence);
const verdictLabel = (id: string, locale: string) => {
  const result = Object.values(comparisons)
    .flatMap((c) => c.results)
    .find((r) => r.id === id && r.locale === locale && r.state === "default");
  if (!result || result.verdict === "not-captured") return "not compared";
  const count = result.findings.filter((f) => f.category !== "axe-inherited").length;
  return count ? `${count} finding${count === 1 ? "" : "s"}` : "matches";
};
const body = buildComment({
  ticket: args.ticket,
  target: targetBase,
  baseline: path.relative(REPO_DIR, baseline),
  commit: checkedCommit(),
  ranBy: process.env.GITHUB_USER ?? process.env.USER ?? "a developer",
  ranAt: new Date().toISOString(),
  pagesChecked: checkedCount,
  pagesDiffer: differing,
  pages: [
    ...scope.publications.map((p) => ({ label: p.listType, english: verdictLabel(p.id, "en"), welsh: verdictLabel(p.id, "cy") })),
    ...scope.routes.map((r) => ({ label: `${r.pip} → ${r.cath}`, english: verdictLabel(r.id, "en"), welsh: verdictLabel(r.id, "cy") }))
  ],
  skipped: scope.skipped,
  evidence: ["report.zip", ...screenshots],
  comparisons: Object.values(comparisons),
  reviews: Object.values(reviews)
});
await writeFile(path.join(evidence, "pr-comment.md"), body);
if (args["post-pr"]) console.log(`  PR comment: ${postComment(args.repo, Number(args["post-pr"]), body)}`);
console.log(`  evidence: ${evidence}`);
console.log(
  `    ${args["post-pr"] ? "edit the comment and drag" : "paste pr-comment.md into a PR comment, then drag"} report.zip${screenshots.length ? ` and the ${screenshots.length} screenshot${screenshots.length === 1 ? "" : "s"}` : ""} into it`
);
console.log(`  report: ${path.join(out, "report/index.html")}`);
if (args.serve) {
  spawn("node", [path.join(PARITY_DIR, "report/serve.mjs"), path.join(out, "report"), String(REPORT_PORT)], { stdio: "inherit", detached: false });
  console.log(`  serving on http://localhost:${REPORT_PORT}/ (Ctrl+C to stop)`);
} else {
  process.exit(defects > 0 ? 1 : 0);
}

// ---------- helpers ----------
// The report reaches its captures through symlinks into the whole baseline; the bundle copies just
// the pages this check covers, so it can be zipped and attached to the PR
async function bundleReport(): Promise<string> {
  const bundle = path.join(out, "bundle");
  await cp(path.join(out, "report"), bundle, { recursive: true, filter: (source) => !source.startsWith(path.join(out, "report/data")) });
  const copies: [string, string][] = [
    ...scope.publications.flatMap((p): [string, string][] => [
      [path.join(baseline, "lists", p.id), path.join(bundle, "data/lists/pip", p.id)],
      ...(captured.lists ? [[path.join(captured.lists, p.id), path.join(bundle, "data/lists/cath", p.id)] as [string, string]] : [])
    ]),
    ...scope.routes.flatMap((r): [string, string][] => [
      [path.join(baseline, "pages", r.id), path.join(bundle, "data/pages", r.id)],
      ...(captured.pages ? [[path.join(captured.pages, r.id), path.join(bundle, "data/cath-pages", r.id)] as [string, string]] : [])
    ])
  ];
  for (const [from, to] of copies.filter(([from]) => existsSync(from))) await cp(from, to, { recursive: true, dereference: true });
  return bundle;
}

// One pip | CaTH image per page and language that differs, small enough to attach to a comment
async function sideBySide(dir: string): Promise<string[]> {
  const pairs = Object.entries(comparisons).flatMap(([area, summary]) =>
    summary.results
      .filter((r) => r.state === "default" && r.verdict === "differs")
      .map((r) => ({
        name: `${r.id}-${r.locale}.png`,
        label: `${r.id} (${r.locale === "cy" ? "Welsh" : "English"})`,
        pip: path.join(baseline, area, r.id, r.locale, "default/page.png"),
        cath: path.join(captured[area], r.id, r.locale, "default/page.png")
      }))
  );
  if (!pairs.length) return [];
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: SIDE_BY_SIDE_WIDTH, height: 800 } });
  for (const pair of pairs) {
    const side = (app: string, file: string) =>
      `<figure><figcaption>${app}</figcaption>${existsSync(file) ? `<img src="${pathToFileURL(file).href}">` : `<p>No ${app} screenshot in the baseline</p>`}</figure>`;
    const html = path.join(dir, ".side-by-side.html");
    await writeFile(
      html,
      `<!doctype html><style>body{margin:0;font:16px arial,sans-serif}h1{font-size:18px;margin:12px}main{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:0 12px 12px}figure{margin:0}figcaption{font-weight:700;margin-bottom:6px}img{width:100%;border:1px solid #b1b4b6}</style><h1>${pair.label}</h1><main>${side("pip", pair.pip)}${side("CaTH", pair.cath)}</main>`
    );
    await page.goto(pathToFileURL(html).href, { waitUntil: "load" });
    await page.screenshot({ path: path.join(dir, pair.name), fullPage: true });
    await rm(html);
  }
  await browser.close();
  return pairs.map((pair) => pair.name);
}

// The commit the check ran against, so reviewers can tell when the evidence is out of date
function checkedCommit(): string {
  const sha = execFileSync("git", ["rev-parse", "--short", "HEAD"], { cwd: REPO_DIR, encoding: "utf-8" }).trim();
  const dirty = execFileSync("git", ["status", "--porcelain", "--", "apps", "libs"], { cwd: REPO_DIR, encoding: "utf-8" }).trim();
  return dirty ? `${sha} + uncommitted changes` : sha;
}

async function ticketText(ticket: string): Promise<string> {
  const local = path.join(REPO_DIR, "docs/tickets", ticket, "ticket.md");
  const text = existsSync(local)
    ? await readFile(local, "utf-8")
    : (() => {
        const { title, body } = JSON.parse(execFileSync("gh", ["issue", "view", ticket, "--repo", args.repo, "--json", "title,body"], { encoding: "utf-8" }));
        return `# ${title}\n\n${body}`;
      })();
  return text;
}

// List types the ticket names (pip or CaTH name), and pages it names by route, plus explicit choices
function selectScope(text: string | null, listTypes: string[], routes: string[]): Scope {
  const skipped: string[] = [];
  const named = new Set([...(text?.match(/\b[A-Z][A-Z0-9_]{6,}\b/g) ?? []), ...listTypes]);
  const publications = manifest.publications.filter((p: PublicationFixture) => named.has(p.listType) || (p.cathListType !== null && named.has(p.cathListType)));
  for (const p of publications.filter((p) => !p.paths.cath)) skipped.push(`${p.listType}: CaTH has no page for it`);

  const mentioned = new Set([...(text?.match(/(?<=[\s`(])\/[a-z0-9][a-z0-9/-]*[a-z0-9]/g) ?? []), ...routes]);
  const selected: Scope["routes"] = [];
  for (const entry of routeMap) {
    if (!mentioned.has(entry.pip) && !(entry.cath && mentioned.has(entry.cath))) continue;
    const id = `page${entry.pip.replace(/\//g, "--")}`;
    const confident = entry.reviewed || entry.match === "same-path" || entry.confidence === "high";
    if (!entry.cath) skipped.push(`${entry.pip}: no CaTH page mapped`);
    else if (!confident) skipped.push(`${entry.pip}: route-map suggestion (${entry.cath}) not reviewed yet`);
    else if (entry.pipRole) skipped.push(`${entry.pip}: needs CaTH sign-in, which is not available yet`);
    else if (!existsSync(path.join(baseline, "pages", id, "en/default/provenance.json"))) skipped.push(`${entry.pip}: not in the pip baseline`);
    else selected.push({ id, pip: entry.pip, cath: entry.cath });
  }
  return { publications: publications.filter((p) => p.paths.cath), routes: selected, skipped };
}

function step(message: string): void {
  console.log(`\n== ${message}`);
}

interface RouteEntry {
  pip: string;
  cath: string | null;
  match: string;
  confidence?: string;
  reviewed: boolean;
  pipRole: string | null;
}

interface Scope {
  publications: PublicationFixture[];
  routes: { id: string; pip: string; cath: string }[];
  skipped: string[];
}
