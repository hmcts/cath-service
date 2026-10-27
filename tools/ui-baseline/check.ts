import { execFileSync, spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { cp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { type CompareSummary, captureBatch, compareRuns, type ReviewResult, reviewFindings } from "@hmcts/ui-baseline";
import { chromium } from "playwright";
import type { SignInResult } from "./cath/sign-in.js";
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
    // Every list type in the fixtures and every mapped page, with the full report and no PR evidence
    all: { type: "boolean", default: false },
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
const scope = selectScope(requirements, args["list-type"] ?? [], args.route ?? [], args.all);
const name = args.ticket
  ? `ticket-${args.ticket}`
  : args.all
    ? "all"
    : [...scope.publications.map((p) => p.id), ...scope.routes.map((r) => r.pip.replace(/^\//, "").replace(/\//g, "-"))].slice(0, 3).join("+") || "check";
const out = path.resolve(args.out ?? path.join(PARITY_DIR, "output/checks", name));
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
if (requirements) await writeFile(path.join(out, "requirements.md"), requirements);

step(`Checking ${targetBase} against the pip baseline (${path.relative(REPO_DIR, baseline)})`);
console.log(`  list types: ${scope.publications.map((p) => p.listType).join(", ") || "none"}`);
console.log(`  pages:      ${scope.routes.map((r) => `${r.pip} → ${r.cath}`).join(", ") || "none"}`);
// --all skips most of the route map (journey steps, sign-in pages), so count those by reason instead
const skippedReasons = Object.entries(Object.groupBy(scope.skipped, (s) => s.slice(s.indexOf(": ") + 2).replace(/ \(.*\)/, "")));
for (const line of args.all ? skippedReasons.map(([reason, items]) => `${items?.length} ${reason}`) : scope.skipped) console.log(`  skipped:    ${line}`);
if (!scope.publications.length && !scope.routes.length) {
  console.log("\nNothing to check: name a ticket that mentions list types or pages, or pass --list-type / --route / --all.");
  process.exit(2);
}

// ---------- 2. Seed CaTH with the baseline's fixtures ----------
// The ids pip gave its publications, records and users, which appear in the baseline's page URLs
const pipSeed = existsSync(path.join(baseline, "seed.json")) ? (JSON.parse(await readFile(path.join(baseline, "seed.json"), "utf-8")) as SeedResult) : null;
const pageUrls = new Map(
  await Promise.all(
    scope.routes.map(
      async (route) =>
        [route.id, new URL(JSON.parse(await readFile(path.join(baseline, "pages", route.id, "en/default/provenance.json"), "utf-8")).url)] as const
    )
  )
);
// Pages that show a publication need it seeded in CaTH too, even when the list itself is not in scope
const pipArtefacts = new Map(Object.entries(pipSeed?.publications ?? {}).map(([id, p]) => [p.artefactId, id]));
const pageFixtures = scope.routes.flatMap((route) => [
  ...[...(pageUrls.get(route.id)?.searchParams.values() ?? [])].flatMap((value) => pipArtefacts.get(value) ?? []),
  ...Object.values(route.cathParams ?? {}).flatMap((source) => (source.startsWith("publication:") ? [source.slice("publication:".length)] : []))
]);
const seedIds = [...new Set([...scope.publications.map((p) => p.id), ...pageFixtures])];
const seedFile = path.join(PARITY_DIR, "output/seed/cath-check.json");
if (seedIds.length && !args["no-seed"]) {
  step("Seeding CaTH");
  const seeding = spawnSync(
    "npx",
    ["tsx", ...(existsSync(path.join(REPO_DIR, ".env")) ? ["--env-file=.env"] : []), "tools/ui-baseline/cath/seed.ts", `--only=${seedIds.join(",")}`],
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

// ---------- 2b. Sign CaTH's users in, for pages behind sign-in ----------
const signInFile = path.join(PARITY_DIR, "output/seed/cath-sign-in.json");
const needsSignIn = scope.routes.some((r) => r.viewAs) || scope.publications.some((p) => p.viewAs);
if (needsSignIn) {
  step("Signing in to CaTH");
  const signingIn = spawnSync("npx", ["tsx", ...(existsSync(path.join(REPO_DIR, ".env")) ? ["--env-file=.env"] : []), "tools/ui-baseline/cath/sign-in.ts"], {
    cwd: REPO_DIR,
    env: { ...process.env, PARITY_SIGN_IN_OUTPUT: signInFile },
    encoding: "utf-8"
  });
  for (const line of `${signingIn.stdout}${signingIn.stderr}`.split("\n").filter((l) => /signed in|Error/.test(l))) console.log(`  ${line.trim()}`);
  if (signingIn.status !== 0) throw new Error("signing in to CaTH failed");
}
const signedIn = needsSignIn ? (JSON.parse(await readFile(signInFile, "utf-8")) as SignInResult) : null;
// Signed-in targets are split per language, each with that language's own session
const signedInTargets = <T extends { locales: string[] }>(target: T, viewAs: string | null | undefined) =>
  viewAs
    ? target.locales.map((locale) => {
        const { locales: _, ...rest } = target;
        const cookie = required(signedIn?.users[viewAs]?.cookies[locale], `CaTH sign-in for ${viewAs} (${locale})`);
        return { ...rest, locale, cookies: [...apps.cath.cookies, cookie] };
      })
    : [{ ...target, cookies: apps.cath.cookies }];

// ---------- 3. Capture CaTH ----------
step("Capturing CaTH");
const listTargets = scope.publications.flatMap((publication) => {
  const seeded = seed?.publications[publication.id];
  if (!seeded || !publication.paths.cath) return [];
  return signedInTargets(
    {
      id: publication.id,
      url: `${targetBase}${publication.paths.cath}?artefactId=${seeded.artefactId}`,
      locales,
      source: { app: "cath", fixture: publication.id, ingestion: seed?.ingestion, viewAs: publication.viewAs ?? null, ...seeded }
    },
    publication.viewAs
  );
});
const cathIds = cathIdsFor(pipSeed, seed, signedIn);
const pageTargets = scope.routes.flatMap((route) => {
  const cathUrl = cathUrlFor(route, required(pageUrls.get(route.id), route.id), cathIds);
  if ("unmapped" in cathUrl) {
    console.log(`    not compared: ${route.id}: ${cathUrl.unmapped}`);
    return [];
  }
  return signedInTargets(
    {
      id: route.id,
      url: `${targetBase}${cathUrl.path}`,
      locales,
      source: { app: "cath", kind: "page", route: route.cath, pipRoute: route.pip, viewAs: route.viewAs }
    },
    route.viewAs
  );
});
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
  for (const line of await dropUnservedCaptures(captured[area], targets)) console.log(`    not compared: ${line}`);
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
  ...(args.all
    ? ["--journeys", path.join(baseline, "journeys"), "--run", path.join(baseline, "run.json")]
    : ["--only", [...scope.publications.map((p) => p.id), ...scope.routes.map((r) => r.id)].join(",")]),
  "--title",
  args.ticket ? `Parity check: ticket ${args.ticket}` : args.all ? "pip baseline against CaTH" : "Parity check",
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

if (args.all) await finish();

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
await finish();

// ---------- helpers ----------
// pip id -> CaTH id for everything both apps were seeded with: publications, account records and
// users, each paired through the fixture it came from. List type names map to CaTH's numeric ids,
// which only CaTH routes that take one in the path use.
function cathIdsFor(pip: SeedResult | null, cath: SeedResult | null, signedIn: SignInResult | null): CathIds {
  const ids = new Map<string, string>();
  for (const [fixture, publication] of Object.entries(pip?.publications ?? {})) {
    const cathArtefact = cath?.publications[fixture]?.artefactId;
    if (cathArtefact) ids.set(publication.artefactId, cathArtefact);
  }
  for (const [record, fields] of Object.entries(pip?.records ?? {})) {
    for (const [field, value] of Object.entries(fields)) {
      const cathValue = signedIn?.records[record]?.[field];
      if (cathValue) ids.set(value, cathValue);
    }
  }
  for (const [user, value] of Object.entries(pip?.users ?? {})) {
    const cathUser = signedIn?.users[user]?.userId;
    if (cathUser) ids.set(value, cathUser);
  }
  const publications = new Map(Object.entries(cath?.publications ?? {}).map(([fixture, p]) => [fixture, p.artefactId]));
  return { ids, publications, listTypes: new Map(Object.entries(signedIn?.listTypes ?? {})) };
}

// The CaTH URL for a pip page: pip's query with each id swapped for CaTH's, and the route's
// cathParams (CaTH name -> pip query parameter, or publication:<fixture>) filling path segments
// and renamed parameters
function cathUrlFor(route: Scope["routes"][number], pipUrl: URL, cathIds: CathIds): { path: string } | { unmapped: string } {
  const query = new URLSearchParams();
  const consumed = new Set(Object.values(route.cathParams ?? {}));
  for (const [name, value] of pipUrl.searchParams) if (!consumed.has(name)) query.set(name, cathIds.ids.get(value) ?? value);
  let cathPath = route.cath;
  for (const [name, source] of Object.entries(route.cathParams ?? {})) {
    const pipValue = source.startsWith("publication:") ? null : pipUrl.searchParams.get(source);
    const value = source.startsWith("publication:")
      ? cathIds.publications.get(source.slice("publication:".length))
      : pipValue === null
        ? undefined
        : (cathIds.ids.get(pipValue) ?? cathIds.listTypes.get(pipValue));
    if (value === undefined) return { unmapped: `no CaTH value for ${name} (from ${source}${pipValue ? ` = ${pipValue}` : ""})` };
    if (cathPath.includes(`[${name}]`)) cathPath = cathPath.replace(`[${name}]`, encodeURIComponent(value));
    else query.set(name, value);
  }
  const unfilled = cathPath.match(/\[[^\]]+\]/);
  if (unfilled) return { unmapped: `CaTH route ${route.cath} needs ${unfilled[0]}: add it to the route's cathParams in routes/route-map.json` };
  return { path: `${cathPath}${query.size ? `?${query}` : ""}` };
}

// A capture of an error page, or of the page CaTH redirected to (e.g. sign-in, because a pip id in
// the URL means nothing to CaTH), is not the page that was asked for. Leaving it out of the index
// makes the comparison report it as not captured, rather than as a difference from pip.
async function dropUnservedCaptures(dir: string, targets: { id: string; url: string; locale?: string; locales?: string[] }[]): Promise<string[]> {
  const indexFile = path.join(dir, "index.jsonl");
  if (!existsSync(indexFile)) return [];
  const requested = new Map(targets.flatMap((t) => (t.locales ?? [t.locale ?? "en"]).map((locale) => [`${t.id} ${locale}`, new URL(t.url).pathname])));
  const unserved = new Map<string, string>();
  const entries = (await readFile(indexFile, "utf-8"))
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as CaptureEntry);
  for (const entry of entries) {
    const key = `${entry.id} ${entry.locale}`;
    const servedPath = new URL(entry.url).pathname;
    if (entry.status !== null && entry.status >= 400) unserved.set(key, `${key}: CaTH answered ${entry.status}`);
    else if (requested.has(key) && servedPath !== requested.get(key)) unserved.set(key, `${key}: CaTH redirected to ${servedPath}`);
  }
  if (!unserved.size) return [];
  const kept = entries.filter((entry) => !unserved.has(`${entry.id} ${entry.locale}`));
  await writeFile(indexFile, kept.map((entry) => `${JSON.stringify(entry)}\n`).join(""));
  for (const key of unserved.keys()) {
    const [id, locale] = key.split(" ");
    await rm(path.join(dir, id, locale), { recursive: true, force: true });
  }
  return [...unserved.values()];
}

async function finish(): Promise<void> {
  console.log(`  report: ${path.join(out, "report/index.html")}`);
  if (!args.serve) process.exit(defects > 0 ? 1 : 0);
  spawn("node", [path.join(PARITY_DIR, "report/serve.mjs"), path.join(out, "report"), String(REPORT_PORT)], { stdio: "inherit", detached: false });
  console.log(`  serving on http://localhost:${REPORT_PORT}/ (Ctrl+C to stop)`);
  // Keeps the evidence step from running for --all while the server holds the process open
  await new Promise(() => {});
}

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
function selectScope(text: string | null, listTypes: string[], routes: string[], everything: boolean): Scope {
  const skipped: string[] = [];
  const named = new Set([...(text?.match(/\b[A-Z][A-Z0-9_]{6,}\b/g) ?? []), ...listTypes]);
  const publications = manifest.publications.filter(
    (p: PublicationFixture) => everything || named.has(p.listType) || (p.cathListType !== null && named.has(p.cathListType))
  );
  for (const p of publications.filter((p) => !p.paths.cath)) skipped.push(`${p.listType}: CaTH has no page for it`);

  const mentioned = new Set([...(text?.match(/(?<=[\s`(])\/[a-z0-9][a-z0-9/-]*[a-z0-9]/g) ?? []), ...routes]);
  const selected: Scope["routes"] = [];
  for (const entry of routeMap) {
    if (!everything && !mentioned.has(entry.pip) && !(entry.cath && mentioned.has(entry.cath))) continue;
    const id = `page${entry.pip.replace(/\//g, "--")}`;
    const confident = entry.reviewed || entry.match === "same-path" || entry.confidence === "high";
    if (!entry.cath) skipped.push(`${entry.pip}: no CaTH page mapped`);
    else if (!confident) skipped.push(`${entry.pip}: route-map suggestion (${entry.cath}) not reviewed yet`);
    else if (!existsSync(path.join(baseline, "pages", id, "en/default/provenance.json"))) skipped.push(`${entry.pip}: not in the pip baseline`);
    else selected.push({ id, pip: entry.pip, cath: entry.cath, viewAs: entry.pipRole, cathParams: entry.cathParams });
  }
  return { publications: publications.filter((p) => p.paths.cath), routes: selected, skipped };
}

function required<T>(value: T | undefined, what: string): T {
  if (value === undefined) throw new Error(`missing ${what}`);
  return value;
}

function step(message: string): void {
  console.log(`\n== ${message}`);
}

interface CathIds {
  ids: Map<string, string>;
  publications: Map<string, string>;
  listTypes: Map<string, string>;
}

interface RouteEntry {
  // CaTH parameter (path segment or query) -> the pip query parameter it takes its value from, or
  // publication:<fixture> for a page CaTH only offers for one list
  cathParams?: Record<string, string>;
  pip: string;
  cath: string | null;
  match: string;
  confidence?: string;
  reviewed: boolean;
  pipRole: string | null;
}

interface CaptureEntry {
  id: string;
  locale: string;
  state: string;
  status: number | null;
  url: string;
}

interface Scope {
  publications: PublicationFixture[];
  // The fixture user the page is captured as, the same one pip's baseline used
  routes: { id: string; pip: string; cath: string; viewAs: string | null; cathParams?: Record<string, string> }[];
  skipped: string[];
}
