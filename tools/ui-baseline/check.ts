import { execFileSync, spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { cp, mkdir, readdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import {
  type CompareSummary,
  captureBatch,
  collectFiles,
  compareFileRuns,
  compareJourneys,
  compareRuns,
  type FileCompareSummary,
  type JourneyCompareSummary,
  type JourneySuite,
  launchChromium,
  openBlobContainer,
  type ReviewResult,
  reviewFindings,
  runJourneys
} from "@hmcts/ui-baseline";
import { JOURNEY_PUBLICATIONS } from "./cath/journeys/fixtures.js";
import type { SignInResult } from "./cath/sign-in.js";
import { captureDownloads, loadDownloads, seedResolver } from "./downloads.js";
import { filesStorage, loadEnvironment } from "./environments.js";
import { loadManifest, type PublicationFixture, type SeedResult } from "./fixtures/manifest.js";
import { buildComment, postComment } from "./pr-comment.js";
import { NOT_FOUND_ID, NOT_FOUND_PATH, parseVariant, withMobile } from "./variants.js";

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
const FILE_LABEL = { pdf: "PDF", "pdf-welsh": "Welsh PDF", excel: "Excel", csv: "CSV", binary: "file" } as const;
const FILE_VERDICT = { match: "matches", differs: "differs", missing: "CaTH did not make it", extra: "only CaTH made one" } as const;

const { values: args } = parseArgs({
  options: {
    ticket: { type: "string" },
    // Every list type in the fixtures and every mapped page, with the full report and no PR evidence
    all: { type: "boolean", default: false },
    "list-type": { type: "string", multiple: true },
    route: { type: "string", multiple: true },
    // pip journeys to run in CaTH and compare step by step (cath/journeys/ has the ported ones)
    journey: { type: "string", multiple: true },
    // The environment CaTH runs in (environments.json): local, or test (CaTH perftest)
    env: { type: "string" },
    target: { type: "string" },
    baseline: { type: "string" },
    locale: { type: "string" },
    out: { type: "string" },
    "no-seed": { type: "boolean", default: false },
    "no-review": { type: "boolean", default: false },
    // Skip comparing the PDF and Excel files each list generates
    "no-files": { type: "boolean", default: false },
    reviewer: { type: "string" },
    serve: { type: "boolean", default: false },
    // Post (or update) the check's comment on this PR, using the dev's gh sign-in
    "post-pr": { type: "string" },
    repo: { type: "string", default: "hmcts/cath-service" }
  }
});

const apps = JSON.parse(await readFile(path.join(PARITY_DIR, "apps.json"), "utf-8"));
const environment = await loadEnvironment(args.env);
const targetBase = args.target ?? environment.cath.baseUrl;
// Passed to the seeding and sign-in scripts, which read the same environment
const envArgs = [`--env=${environment.name}`];
const baseline = path.resolve(args.baseline ?? DEFAULT_BASELINE);
const locales = args.locale ? [args.locale] : LOCALES;
const manifest = await loadManifest();
const routeMap = JSON.parse(await readFile(path.join(PARITY_DIR, "routes/route-map.json"), "utf-8")).routes as RouteEntry[];
if (!existsSync(path.join(baseline, "lists/index.jsonl")))
  throw new Error(
    `no pip baseline at ${baseline}: fetch the stored one with \`yarn ui-baseline:baseline pull\`, record one with \`yarn ui-baseline:record-pip\`, or point --baseline at one`
  );

// ---------- 1. What to check ----------
const requirements = args.ticket ? await ticketText(args.ticket) : null;
const scope = selectScope(requirements, args["list-type"] ?? [], args.route ?? [], args.all);
// pip's journeys to run in CaTH and compare: all of them for --all, otherwise those named
const baselineJourneys = new Set(
  (await readdir(path.join(baseline, "journeys"), { withFileTypes: true }).catch(() => [])).filter((entry) => entry.isDirectory()).map((entry) => entry.name)
);
const journeyIds = args.all ? [...baselineJourneys].sort() : (args.journey ?? []).filter((id) => baselineJourneys.has(id));
for (const id of (args.journey ?? []).filter((id) => !baselineJourneys.has(id))) scope.skipped.push(`journey ${id}: not in the pip baseline`);
const name = args.ticket
  ? `ticket-${args.ticket}`
  : args.all
    ? "all"
    : [...scope.publications.map((p) => p.id), ...scope.routes.map((r) => r.pip.replace(/^\//, "").replace(/\//g, "-")), ...journeyIds].slice(0, 3).join("+") ||
      "check";
const out = path.resolve(args.out ?? path.join(PARITY_DIR, "output/checks", name));
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
if (requirements) await writeFile(path.join(out, "requirements.md"), requirements);

step(`Checking ${targetBase} (${environment.name}) against the pip baseline (${path.relative(REPO_DIR, baseline)})`);
console.log(`  list types: ${scope.publications.map((p) => p.listType).join(", ") || "none"}`);
console.log(`  pages:      ${scope.routes.map((r) => `${r.pip} → ${r.cath}`).join(", ") || "none"}`);
console.log(`  journeys:   ${journeyIds.join(", ") || "none"}`);
// --all skips most of the route map (journey steps, sign-in pages), so count those by reason instead
const skippedReasons = Object.entries(Object.groupBy(scope.skipped, (s) => s.slice(s.indexOf(": ") + 2).replace(/ \(.*\)/, "")));
for (const line of args.all ? skippedReasons.map(([reason, items]) => `${items?.length} ${reason}`) : scope.skipped) console.log(`  skipped:    ${line}`);
if (!scope.publications.length && !scope.routes.length && !journeyIds.length) {
  console.log("\nNothing to check: name a ticket that mentions list types or pages, or pass --list-type / --route / --journey / --all.");
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
// Files the baseline recorded that are fetched rather than shown (routes/downloads.json), with the
// publications they come from: all of them for --all, otherwise those of the routes named
const downloadSpecs =
  existsSync(path.join(baseline, "downloads/index.jsonl")) && !args["no-files"]
    ? (await loadDownloads()).filter((spec) => args.all || (args.route ?? []).includes(spec.pip.path) || (args.route ?? []).includes(spec.cath.path))
    : [];
const downloadFixtures = downloadSpecs.flatMap((spec) =>
  Object.values({ ...spec.cath.params, ...spec.cath.query }).flatMap((value) => (value.startsWith("publication:") ? [value.slice("publication:".length)] : []))
);
const seedIds = [
  ...new Set([...scope.publications.map((p) => p.id), ...pageFixtures, ...downloadFixtures, ...(journeyIds.length ? JOURNEY_PUBLICATIONS : [])])
];
const seedFile = path.join(PARITY_DIR, `output/seed/cath-check-${environment.name}.json`);
if (seedIds.length && !args["no-seed"]) {
  step("Seeding CaTH");
  const seeding = spawnSync(
    "npx",
    [
      "tsx",
      ...(existsSync(path.join(REPO_DIR, ".env")) ? ["--env-file=.env"] : []),
      "tools/ui-baseline/cath/seed.ts",
      ...envArgs,
      `--only=${seedIds.join(",")}`
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

// ---------- 2b. Sign CaTH's users in, for pages behind sign-in ----------
const signInFile = path.join(PARITY_DIR, `output/seed/cath-sign-in-${environment.name}.json`);
// The baseline's variants of each page in scope (variants.ts): the page as other roles, and signed in
const baselineIds = { lists: await capturedIds(path.join(baseline, "lists")), pages: await capturedIds(path.join(baseline, "pages")) };
const variantsOf = (area: keyof typeof baselineIds, id: string) => [...baselineIds[area]].filter((other) => other !== id && parseVariant(other).base === id);
const includeNotFound =
  baselineIds.pages.has(NOT_FOUND_ID) && (args.all || (args.route ?? []).some((route) => route === "/not-found" || route === NOT_FOUND_PATH));
const needsSignIn =
  journeyIds.length > 0 ||
  downloadSpecs.some((spec) => spec.cath.as) ||
  scope.routes.some((r) => r.viewAs || variantsOf("pages", r.id).length) ||
  scope.publications.some((p) => p.viewAs || variantsOf("lists", p.id).length);
if (needsSignIn) {
  step("Signing in to CaTH");
  const signingIn = spawnSync(
    "npx",
    ["tsx", ...(existsSync(path.join(REPO_DIR, ".env")) ? ["--env-file=.env"] : []), "tools/ui-baseline/cath/sign-in.ts", ...envArgs],
    {
      cwd: REPO_DIR,
      env: { ...process.env, PARITY_SIGN_IN_OUTPUT: signInFile },
      encoding: "utf-8"
    }
  );
  for (const line of `${signingIn.stdout}${signingIn.stderr}`.split("\n").filter((l) => /signed in|not signed in|Error/.test(l)))
    console.log(`  ${line.trim()}`);
  if (signingIn.status !== 0) throw new Error("signing in to CaTH failed");
}
const signedIn = needsSignIn ? (JSON.parse(await readFile(signInFile, "utf-8")) as SignInResult) : null;
// Signed-in targets are split per language, each with that language's own session. A page whose
// user has no test account in this environment is not compared, and says why.
const signedInTargets = <T extends { id: string; locales: string[] }>(target: T, viewAs: string | null | undefined): CathTarget<T>[] => {
  if (!viewAs) return [{ ...target, cookies: apps.cath.cookies }];
  const unavailable = signedIn?.unavailable?.[viewAs];
  if (unavailable) {
    console.log(`    not compared: ${target.id}: ${unavailable}`);
    return [];
  }
  return target.locales.map((locale) => {
    const session = required(signedIn?.users[viewAs]?.cookies[locale], `CaTH sign-in for ${viewAs} (${locale})`);
    return { ...target, locales: [locale], cookies: [...apps.cath.cookies, ...session] };
  });
};

// ---------- 3. Capture CaTH ----------
step("Capturing CaTH");
// Each page as the baseline captured it: its main capture and mobile copy, then each variant
const withVariants = <T extends { id: string; locales: string[]; source: Record<string, unknown> }>(
  main: T,
  viewAs: string | null | undefined,
  area: keyof typeof baselineIds
) =>
  withMobile([
    { ...main, viewAs: viewAs ?? null },
    ...variantsOf(area, main.id).map((id) => ({ ...main, id, viewAs: parseVariant(id).viewAs, source: { ...main.source, viewAs: parseVariant(id).viewAs } }))
  ]).flatMap(({ viewAs: as, ...target }) => signedInTargets(target, as));
const listTargets = scope.publications.flatMap((publication) => {
  const seeded = seed?.publications[publication.id];
  if (!seeded || !inCath(publication)) return [];
  return withVariants(
    {
      id: publication.id,
      url:
        publication.format === "flat-file"
          ? `${targetBase}/summary-of-publications?locationId=${seeded.locationId}`
          : `${targetBase}${publication.paths.cath}?artefactId=${seeded.artefactId}`,
      locales,
      source: { app: "cath", fixture: publication.id, ingestion: seed?.ingestion, viewAs: publication.viewAs ?? null, ...seeded }
    },
    publication.viewAs,
    "lists"
  );
});
const cathIds = cathIdsFor(pipSeed, seed, signedIn);
const pageTargets = scope.routes.flatMap((route) => {
  const cathUrl = cathUrlFor(route, required(pageUrls.get(route.id), route.id), cathIds);
  if ("unmapped" in cathUrl) {
    console.log(`    not compared: ${route.id}: ${cathUrl.unmapped}`);
    return [];
  }
  return withVariants(
    {
      id: route.id,
      url: `${targetBase}${cathUrl.path}`,
      locales,
      source: { app: "cath", kind: "page", route: route.cath, pipRoute: route.pip, viewAs: route.viewAs } as Record<string, unknown>
    },
    route.viewAs,
    "pages"
  );
});
// What CaTH shows for an address it has no page for, against what pip shows
if (includeNotFound)
  pageTargets.push(
    ...withVariants(
      { id: NOT_FOUND_ID, url: `${targetBase}${NOT_FOUND_PATH}`, locales, source: { app: "cath", kind: "page", route: NOT_FOUND_PATH, expectedStatus: 404 } },
      null,
      "pages"
    )
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
  for (const line of await dropUnservedCaptures(captured[area], targets)) console.log(`    not compared: ${line}`);
}

// ---------- 3b. Run pip's journeys in CaTH and compare them ----------
// Only journeys ported to CaTH (cath/journeys/) can run; the rest are reported as not compared.
// CaTH's journey data is shared, so they run one after another, as pip's were recorded.
const journeysCompared = journeyIds.length ? await runAndCompareJourneys() : null;

// ---------- 4. Compare with the baseline ----------
step("Comparing with pip");
const comparisons: Record<string, CompareSummary> = {};
const capturedTargetIds = { lists: new Set(listTargets.map((t) => t.id)), pages: new Set(pageTargets.map((t) => t.id)) };
for (const area of Object.keys(captured)) {
  const ids = [...capturedTargetIds[area as keyof typeof capturedTargetIds]];
  comparisons[area] = await compareRuns({ source: path.join(baseline, area), target: captured[area], out: path.join(out, "compare", area), only: ids });
  const t = comparisons[area].totals;
  console.log(`  ${area}: ${t.pairs - t.notCaptured} page-language pairs compared, ${t.match} match, ${t.differs} differ`);
}

// ---------- 4b. Compare the PDF and Excel files ----------
// Each list's files, from CaTH's publications container, against the ones pip made for the same
// fixture. A list seeded through the publication API (JSON only) has no Excel from a spreadsheet,
// so for those a missing Excel is not counted.
const filesCompared = await compareGeneratedFiles();

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
    : [
        ...(journeyIds.length ? ["--journeys", path.join(baseline, "journeys")] : []),
        "--only",
        [...capturedTargetIds.lists, ...capturedTargetIds.pages, ...journeyIds].join(",")
      ]),
  ...(journeysCompared
    ? ["--cath-journeys", path.join(out, "cath/journeys"), "--journeys-compare", path.join(out, "compare/journeys/journeys-compare.json")]
    : []),
  "--title",
  args.ticket ? `Parity check: ticket ${args.ticket}` : args.all ? "pip baseline against CaTH" : "Parity check",
  "--out",
  path.join(out, "report"),
  ...(captured.pages ? ["--cath-pages", captured.pages] : []),
  ...(comparisons.lists ? ["--compare", path.join(out, "compare/lists/compare.json")] : []),
  ...(comparisons.pages ? ["--pages-compare", path.join(out, "compare/pages/compare.json")] : []),
  ...(filesCompared ? ["--files-compare", path.join(out, "compare/files/files-compare.json")] : []),
  ...Object.keys(reviews).flatMap((area) => ["--review", path.join(out, "review", area, "review.json")])
];
execFileSync("node", reportArgs, { stdio: "ignore" });

// ---------- Summary ----------
const defects = Object.values(reviews).reduce((sum, r) => sum + r.totals.defect, 0);
const needsHuman = Object.values(reviews).reduce((sum, r) => sum + r.totals.needsHuman, 0);
// Each page is compared once per language, on desktop and mobile; report pages, with where they differ
const pageVerdicts = new Map<string, string[]>();
for (const summary of Object.values(comparisons)) {
  for (const result of summary.results.filter((r) => (r.state === "default" || r.state === "mobile") && r.verdict === "differs")) {
    const where = `${result.locale === "cy" ? "Welsh" : "English"}${result.state === "mobile" ? " on mobile" : ""}`;
    pageVerdicts.set(result.id, [...(pageVerdicts.get(result.id) ?? []), where]);
  }
}
const differing = [...pageVerdicts.entries()].map(([id, where]) => `${id} (${where.join(", ")})`);
// Counted as captures: a page as another role is checked as a page of its own
const checkedCount = capturedTargetIds.lists.size + capturedTargetIds.pages.size;
const pagesDiffer = `${differing.length} of ${checkedCount} page${checkedCount === 1 ? "" : "s"} ${differing.length === 1 ? "differs" : "differ"} from pip`;
step("Result");
// A check of journeys alone has no pages of its own to report
if (checkedCount || !journeyIds.length)
  console.log(
    Object.keys(reviews).length
      ? `  ${defects} defect${defects === 1 ? "" : "s"}, ${needsHuman} need a human · ${pagesDiffer}`
      : `  ${pagesDiffer} (not reviewed against a ticket)`
  );
for (const line of differing) console.log(`    ${line}`);
const filesDiffer = (filesCompared?.results ?? [])
  .filter((r) => r.verdict !== "match")
  .map((r) => `${r.id} ${FILE_LABEL[r.kind]} (${FILE_VERDICT[r.verdict]})`);
if (filesCompared) console.log(`  ${filesDiffer.length} of ${filesCompared.totals.files} PDF and Excel files differ from pip`);
for (const line of filesDiffer) console.log(`    ${line}`);
// A journey differs where CaTH's steps, the pages they reach, or a step's page differ from pip's
const journeysDiffer = (journeysCompared?.results ?? [])
  .filter((r) => r.verdict !== "match")
  .map((r) => {
    const differing = r.steps.filter((s) => s.source && s.target && s.verdict === "differs").length;
    const what = [...r.findings.map((f) => f.detail), ...(differing ? [`${differing} step page${differing === 1 ? "" : "s"} differ`] : [])];
    return `${r.journey} (${r.locale === "cy" ? "Welsh" : "English"}): ${what.join("; ") || r.verdict}`;
  });
if (journeysCompared) console.log(`  ${journeysDiffer.length} of ${journeysCompared.totals.runs} journey runs differ from pip`);
for (const line of journeysDiffer) console.log(`    ${line}`);

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
  pages: [...capturedTargetIds.lists, ...capturedTargetIds.pages].map((id) => ({
    label: captureLabel(id),
    english: verdictLabel(id, "en"),
    welsh: verdictLabel(id, "cy")
  })),
  skipped: scope.skipped,
  evidence: ["report.zip", ...screenshots],
  comparisons: Object.values(comparisons),
  reviews: Object.values(reviews),
  files: filesCompared ? { compared: filesCompared.totals.files, differ: filesDiffer } : undefined,
  journeys: journeysCompared ? { compared: journeysCompared.totals.runs, differ: journeysDiffer } : undefined
});
await writeFile(path.join(evidence, "pr-comment.md"), body);
if (args["post-pr"]) console.log(`  PR comment: ${postComment(args.repo, Number(args["post-pr"]), body)}`);
console.log(`  evidence: ${evidence}`);
console.log(
  `    ${args["post-pr"] ? "edit the comment and drag" : "paste pr-comment.md into a PR comment, then drag"} report.zip${screenshots.length ? ` and the ${screenshots.length} screenshot${screenshots.length === 1 ? "" : "s"}` : ""} into it`
);
await finish();

// ---------- helpers ----------
async function runAndCompareJourneys(): Promise<JourneyCompareSummary | null> {
  step("Running pip's journeys in CaTH");
  const moduleFile = path.join(PARITY_DIR, "cath/journeys/index.ts");
  // Read by the journeys module when it loads: which CaTH, and what was seeded and signed in above
  Object.assign(process.env, {
    UI_BASELINE_ENV: environment.name,
    PARITY_TARGET: targetBase,
    PARITY_SIGN_IN_OUTPUT: signInFile,
    PARITY_SEED_OUTPUT: seedFile
  });
  const suite = (await import(pathToFileURL(moduleFile).href)).default as JourneySuite;
  const ported = journeyIds.filter((id) => suite.journeys.some((journey) => journey.id === id));
  for (const id of journeyIds.filter((id) => !ported.includes(id))) scope.skipped.push(`journey ${id}: not ported to CaTH yet (cath/journeys/)`);
  console.log(`  ${ported.length} of ${journeyIds.length} journeys ported to CaTH${ported.length < journeyIds.length ? "; the rest are not compared" : ""}`);
  if (!ported.length) return null;

  const results = await runJourneys(moduleFile, { outDir: path.join(out, "cath/journeys"), locales, only: ported });
  for (const result of results.filter((r) => !r.ok)) console.log(`    stopped: ${result.journey} (${result.locale}): ${result.error?.split("\n")[0]}`);
  const summary = await compareJourneys({
    source: path.join(baseline, "journeys"),
    target: path.join(out, "cath/journeys"),
    out: path.join(out, "compare/journeys"),
    only: ported,
    expectedPath: (pipPath) => {
      const entry = routeMap.find((route) => route.pip === pipPath);
      // A dynamic CaTH route ([id]) cannot be checked against the path a step reached
      return entry?.cath && isConfident(entry) && !entry.cath.includes("[") ? entry.cath : undefined;
    }
  });
  const t = summary.totals;
  console.log(`  journeys: ${t.runs} journey-language runs compared, ${t.match} match, ${t.differs} differ`);
  return summary;
}

// A route-map entry the check relies on: same path, a close match, or checked by someone
function isConfident(entry: RouteEntry): boolean {
  return entry.reviewed || entry.match === "same-path" || entry.confidence === "high";
}

// The files each list generated, and the files fetched rather than shown, against pip's
async function compareGeneratedFiles(): Promise<FileCompareSummary | null> {
  const listFiles = await compareListFiles();
  const downloads = await compareDownloads();
  if (!listFiles && !downloads) return null;
  const results = [...(listFiles?.results ?? []), ...(downloads?.results ?? [])];
  const summary: FileCompareSummary = {
    source: path.join(baseline, "files"),
    target: path.join(out, "cath/files"),
    comparedAt: new Date().toISOString(),
    results,
    totals: {
      files: results.length,
      match: results.filter((r) => r.verdict === "match").length,
      differs: results.filter((r) => r.verdict === "differs").length,
      missing: results.filter((r) => r.verdict === "missing").length,
      extra: results.filter((r) => r.verdict === "extra").length
    }
  };
  await mkdir(path.join(out, "compare/files"), { recursive: true });
  await writeFile(path.join(out, "compare/files/files-compare.json"), `${JSON.stringify(summary, null, 2)}\n`);
  const t = summary.totals;
  console.log(`  ${t.files} files compared: ${t.match} match, ${t.differs} differ, ${t.missing} CaTH did not make, ${t.extra} only CaTH made`);
  return summary;
}

// Each list's files, from CaTH's publications container, against the ones pip made for the same
// fixture. A list seeded through the publication API (JSON only) has no Excel from a spreadsheet,
// so for those a missing Excel is not counted.
async function compareListFiles(): Promise<FileCompareSummary | null> {
  const listed = scope.publications.filter((publication) => publication.format !== "flat-file" && seed?.publications[publication.id]);
  if (args["no-files"] || !listed.length) return null;
  if (!existsSync(path.join(baseline, "files/index.jsonl"))) {
    console.log("\n  PDF and Excel files not compared: the baseline has none (re-record it with `yarn ui-baseline:record-pip`)");
    return null;
  }
  step("Comparing PDF and Excel files");
  const cathFiles = path.join(out, "cath/files");
  await collectFiles({
    container: openBlobContainer(filesStorage("cath", environment.cath)),
    out: cathFiles,
    waitSeconds: environment.cath.filesWaitSeconds,
    publications: listed.map((publication) => ({
      id: publication.id,
      artefactId: (seed as SeedResult).publications[publication.id].artefactId,
      seededAt: seed?.seededAt
    }))
  });
  const summary = await compareFileRuns({
    source: path.join(baseline, "files"),
    target: cathFiles,
    out: path.join(out, "compare/files"),
    only: listed.map((p) => p.id)
  });
  const uncomparable = (r: FileCompareSummary["results"][number]) =>
    r.kind === "excel" && r.verdict === "missing" && seed?.publications[r.id]?.excelUploaded === false;
  for (const r of summary.results.filter(uncomparable))
    scope.skipped.push(`${r.id}: Excel file not compared: CaTH was seeded through its publication API, which takes the list as JSON, not the spreadsheet`);
  return { ...summary, results: summary.results.filter((r) => !uncomparable(r)) };
}

// The files CaTH answers with rather than a page, fetched as the user each is for, against the ones
// pip answered with (routes/downloads.json)
async function compareDownloads(): Promise<FileCompareSummary | null> {
  if (!downloadSpecs.length) return null;
  step("Comparing downloads");
  const cathDownloads = path.join(out, "cath/downloads");
  const { notServed } = await captureDownloads({
    app: "cath",
    baseUrl: targetBase,
    specs: downloadSpecs,
    resolve: seedResolver(seed?.publications ?? {}, signedIn?.records),
    session: async (userId) => {
      const cookies = signedIn?.users[userId]?.cookies.en;
      return cookies ? { cookies: [...apps.cath.cookies, ...cookies] } : null;
    },
    out: cathDownloads,
    seededAt: seed?.seededAt
  });
  for (const line of notServed) scope.skipped.push(`download ${line}`);
  return compareFileRuns({
    source: path.join(baseline, "downloads"),
    target: cathDownloads,
    out: path.join(out, "compare/files"),
    only: downloadSpecs.map((spec) => spec.id)
  });
}

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
async function dropUnservedCaptures(
  dir: string,
  targets: { id: string; url: string; locale?: string; locales?: string[]; source?: Record<string, unknown> }[]
): Promise<string[]> {
  const indexFile = path.join(dir, "index.jsonl");
  if (!existsSync(indexFile)) return [];
  const requested = new Map(targets.flatMap((t) => (t.locales ?? [t.locale ?? "en"]).map((locale) => [`${t.id} ${locale}`, new URL(t.url).pathname])));
  // A page asked for as an error (the not-found page) is served when it answers with that error
  const expected = new Map(targets.map((t) => [t.id, t.source?.expectedStatus]));
  const unserved = new Map<string, string>();
  const entries = (await readFile(indexFile, "utf-8"))
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as CaptureEntry);
  for (const entry of entries) {
    const key = `${entry.id} ${entry.locale}`;
    const servedPath = new URL(entry.url).pathname;
    if (entry.status !== null && entry.status >= 400 && expected.get(entry.id) !== entry.status) unserved.set(key, `${key}: CaTH answered ${entry.status}`);
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

// What a capture is of, for people: the list type or the page route, and who it was viewed as
function captureLabel(id: string): string {
  const { base, viewAs } = parseVariant(id);
  const publication = scope.publications.find((p) => p.id === base);
  const route = scope.routes.find((r) => r.id === base);
  const what = publication ? publication.listType : route ? `${route.pip} → ${route.cath}` : base === NOT_FOUND_ID ? "an address with no page" : base;
  return viewAs ? `${what}, as ${viewAs}` : what;
}

// The capture ids in a run's index
async function capturedIds(dir: string): Promise<Set<string>> {
  const indexFile = path.join(dir, "index.jsonl");
  if (!existsSync(indexFile)) return new Set();
  return new Set(
    (await readFile(indexFile, "utf-8"))
      .split("\n")
      .filter(Boolean)
      .map((line) => (JSON.parse(line) as { id: string }).id)
  );
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
    ...[...capturedTargetIds.lists].flatMap((id): [string, string][] => [
      [path.join(baseline, "lists", id), path.join(bundle, "data/lists/pip", id)],
      ...(captured.lists ? [[path.join(captured.lists, id), path.join(bundle, "data/lists/cath", id)] as [string, string]] : [])
    ]),
    ...[...capturedTargetIds.pages].flatMap((id): [string, string][] => [
      [path.join(baseline, "pages", id), path.join(bundle, "data/pages", id)],
      ...(captured.pages ? [[path.join(captured.pages, id), path.join(bundle, "data/cath-pages", id)] as [string, string]] : [])
    ]),
    ...(filesCompared ? [[path.join(out, "compare/files"), path.join(bundle, "data/files")] as [string, string]] : [])
  ];
  for (const [from, to] of copies.filter(([from]) => existsSync(from))) await cp(from, to, { recursive: true, dereference: true });
  return bundle;
}

// One pip | CaTH image per page and language that differs, small enough to attach to a comment
async function sideBySide(dir: string): Promise<string[]> {
  const pairs = Object.entries(comparisons).flatMap(([area, summary]) =>
    summary.results
      .filter((r) => (r.state === "default" || r.state === "mobile") && r.verdict === "differs")
      .map((r) => ({
        name: `${r.id}-${r.locale}${r.state === "mobile" ? "-mobile" : ""}.png`,
        label: `${r.id} (${r.locale === "cy" ? "Welsh" : "English"}${r.state === "mobile" ? ", mobile" : ""})`,
        pip: path.join(baseline, area, r.id, r.locale, r.state, "page.png"),
        cath: path.join(captured[area], r.id, r.locale, r.state, "page.png")
      }))
  );
  if (!pairs.length) return [];
  const browser = await launchChromium();
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
  // The hosted check runs from an image with no git history; it is given the commit it was built from
  if (!existsSync(path.join(REPO_DIR, ".git"))) return process.env.UI_BASELINE_COMMIT ?? "unknown";
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
  for (const p of publications.filter((p) => !inCath(p))) skipped.push(`${p.listType}: CaTH has no page for it`);

  const mentioned = new Set([...(text?.match(/(?<=[\s`(])\/[a-z0-9][a-z0-9/-]*[a-z0-9]/g) ?? []), ...routes]);
  const selected: Scope["routes"] = [];
  for (const entry of routeMap) {
    if (!everything && !mentioned.has(entry.pip) && !(entry.cath && mentioned.has(entry.cath))) continue;
    const id = `page${entry.pip.replace(/\//g, "--")}`;
    const confident = isConfident(entry);
    if (!entry.cath) skipped.push(`${entry.pip}: no CaTH page mapped`);
    else if (!confident) skipped.push(`${entry.pip}: route-map suggestion (${entry.cath}) not reviewed yet`);
    else if (!existsSync(path.join(baseline, "pages", id, "en/default/provenance.json"))) skipped.push(`${entry.pip}: not in the pip baseline`);
    else selected.push({ id, pip: entry.pip, cath: entry.cath, viewAs: entry.pipRole, cathParams: entry.cathParams });
  }
  return { publications: publications.filter(inCath), routes: selected, skipped };
}

// A list CaTH has: its own page, or for a flat file, its entry on the court's summary of publications
function inCath(publication: PublicationFixture): boolean {
  return !!publication.paths.cath || (publication.format === "flat-file" && !!publication.cathListType);
}

function required<T>(value: T | undefined, what: string): T {
  if (value === undefined) throw new Error(`missing ${what}`);
  return value;
}

function step(message: string): void {
  console.log(`\n== ${message}`);
}

type CathTarget<T> = T & { cookies: { name: string; value: string }[] };

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
