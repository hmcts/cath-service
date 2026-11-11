import { execFileSync, spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { cp, mkdir, readdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { JOURNEY_PUBLICATIONS } from "./cath/journeys/fixtures.js";
import { cathApi, removeRuns } from "./cath/run.js";
import type { SignInResult } from "./cath/sign-in.js";
import { confinedPath, httpUrl, JOURNEY, LIST_TYPE, LOCALE, matching, REPO, ROUTE, TICKET } from "./cli-input.js";
import {
  type CaptureResult,
  type CompareSummary,
  captureBatches,
  collectFiles,
  compareFileRuns,
  compareJourneys,
  compareRuns,
  type FileCompareSummary,
  investigateFindings,
  type JourneyCompareSummary,
  type JourneySuite,
  launchChromium,
  openBlobContainer,
  type PublicationFileKind,
  type ReviewResult,
  reviewFindings,
  runJourneys
} from "./core/index.js";
import { captureDownloads, loadDownloads, seedResolver } from "./downloads.js";
import { filesStorage, loadEnvironment } from "./environments.js";
import { EXIT_DIFFERENCES, EXIT_NOTHING_TO_CHECK } from "./exit-codes.js";
import { loadManifest, type PublicationFixture, type SeedResult } from "./fixtures/manifest.js";
import { buildComment, postComment } from "./pr-comment.js";
import { createProgress } from "./progress.js";
import { isConfident, mentionsIn, mentionsPublication, mentionsRoute, pageId, type RecordingScope, type RouteEntry, ticketText } from "./scope.js";
import { systemCommand } from "./system-command.js";
import { NOT_FOUND_ID, NOT_FOUND_PATH, parseVariant, withMobile } from "./variants.js";

// One command for a developer or QA: does CaTH match the pip baseline for this ticket (or these
// list types / pages)? Seeds CaTH with the baseline's fixtures, captures CaTH, compares against the
// pip baseline, reviews the differences against the ticket, and writes a focused report.
// pip itself is not needed; only the baseline it produced. Writes the evidence for the PR
// (comment, zipped report, side-by-side screenshots), and posts the comment with --post-pr.
const PARITY_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_DIR = path.join(PARITY_DIR, "../..");
// The repo's own tsx, run by its path rather than through npx, which can install packages on demand
const TSX = path.join(REPO_DIR, "node_modules/.bin/tsx");
const DEFAULT_BASELINE = process.env.PARITY_BASELINE ?? path.join(PARITY_DIR, "output/baseline");
// Where pip/setup.sh clones pip's repos at the pinned commits, for --investigate to read
const PIP_SOURCE_DIR = process.env.UI_BASELINE_PIP_DIR ?? path.join(homedir(), ".cache/ui-baseline/pip");
const LOCALES = ["en", "cy"];
const REPORT_PORT = 9500;
const SIDE_BY_SIDE_WIDTH = 1600;
const FILE_LABEL = { pdf: "PDF", "pdf-welsh": "Welsh PDF", excel: "Excel", csv: "CSV", binary: "file" } as const;
const FILE_VERDICT = { match: "matches", differs: "differs", missing: "CaTH did not make it", extra: "only CaTH made one" } as const;
// Every stage a check can have, in the order it runs them, for the progress the hosted check shows
// (progress.json in --out)
const STAGES = [
  { id: "seed", label: "Seeding CaTH" },
  { id: "sign-in", label: "Signing in to CaTH" },
  { id: "capture-lists", label: "Capturing list pages" },
  { id: "capture-pages", label: "Capturing other pages" },
  { id: "journeys", label: "Running journeys" },
  { id: "compare", label: "Comparing with pip" },
  { id: "files", label: "Comparing PDF and Excel files" },
  { id: "downloads", label: "Comparing downloads" },
  { id: "review", label: "Reviewing differences against the ticket" },
  { id: "report", label: "Writing the report" },
  { id: "evidence", label: "Writing the evidence" }
] as const;
const CAPTURE_STAGE = { lists: "capture-lists", pages: "capture-pages" } as const;
// How each capture state is described after a page's language: as first seen, with its collapsed
// content opened, and on a phone
const STATE_LABEL: Record<string, string> = { default: "", expanded: " with everything expanded", mobile: " on mobile" };

const { values: given } = parseArgs({
  options: {
    ticket: { type: "string" },
    // Every list type in the fixtures and every mapped page, with the full report and no PR evidence
    all: { type: "boolean", default: false },
    "list-type": { type: "string", multiple: true },
    route: { type: "string", multiple: true },
    // pip journeys to run in CaTH and compare step by step (cath/journeys/ has the ported ones)
    journey: { type: "string", multiple: true },
    // The environment CaTH runs in (environments.json): local, or aat (CaTH AAT)
    env: { type: "string" },
    target: { type: "string" },
    baseline: { type: "string" },
    locale: { type: "string" },
    out: { type: "string" },
    "no-seed": { type: "boolean", default: false },
    // On a shared CaTH, leave what the check seeded in place when it ends, to look at or to check
    // again with --no-seed; a later check removes it once it is three hours old
    "keep-seed": { type: "boolean", default: false },
    "no-review": { type: "boolean", default: false },
    // Skip comparing the PDF and Excel files each list generates
    "no-files": { type: "boolean", default: false },
    reviewer: { type: "string" },
    // Look again, with read-only tools, at up to this many of each area's needs-human items
    investigate: { type: "string" },
    serve: { type: "boolean", default: false },
    // Post (or update) the check's comment on this PR, using the dev's gh sign-in
    "post-pr": { type: "string" },
    // Pages captured at once; the hosted check sets UI_BASELINE_CONCURRENCY to suit its pod's CPU
    concurrency: { type: "string" },
    repo: { type: "string", default: "hmcts/cath-service" }
  }
});
// Checked before any of it reaches a file path or a command (cli-input.ts)
const optional = <T>(value: T | undefined, check: (value: T) => T) => (value === undefined ? undefined : check(value));
const args = {
  ...given,
  ticket: optional(given.ticket, (value) => matching(value, TICKET, "--ticket")),
  "list-type": given["list-type"]?.map((value) => matching(value, LIST_TYPE, "--list-type")),
  route: given.route?.map((value) => matching(value, ROUTE, "--route")),
  journey: given.journey?.map((value) => matching(value, JOURNEY, "--journey")),
  locale: optional(given.locale, (value) => matching(value, LOCALE, "--locale")),
  investigate: optional(given.investigate, (value) => matching(value, /^[1-9]\d{0,2}$/, "--investigate")),
  target: optional(given.target, (value) => httpUrl(value, "--target")),
  baseline: optional(given.baseline, (value) => confinedPath(value, "--baseline")),
  out: optional(given.out, (value) => confinedPath(value, "--out")),
  "post-pr": optional(given["post-pr"], (value) => matching(value, TICKET, "--post-pr")),
  concurrency: Number(matching(given.concurrency ?? process.env.UI_BASELINE_CONCURRENCY ?? "4", /^[1-9]\d?$/, "--concurrency")),
  repo: matching(given.repo, REPO, "--repo")
};

const apps = JSON.parse(await readFile(path.join(PARITY_DIR, "apps.json"), "utf-8"));
const environment = await loadEnvironment(args.env);
const targetBase = args.target ?? environment.cath.baseUrl;
// Passed to the seeding and sign-in scripts, which read the same environment
const envArgs = [`--env=${environment.name}`];
// A ticket's own recording of pip (record-pip --ticket N), where there is one, else the full baseline
const ticketBaseline = args.ticket ? path.join(PARITY_DIR, "output/baselines", `ticket-${args.ticket}`) : null;
const baseline = confinedPath(
  args.baseline ?? (ticketBaseline && existsSync(path.join(ticketBaseline, "lists/index.jsonl")) ? ticketBaseline : DEFAULT_BASELINE),
  "--baseline"
);
const locales = args.locale ? [args.locale] : LOCALES;
const manifest = await loadManifest();
const routeMap = JSON.parse(await readFile(path.join(PARITY_DIR, "routes/route-map.json"), "utf-8")).routes as RouteEntry[];
if (!existsSync(path.join(baseline, "lists/index.jsonl")))
  throw new Error(
    `no pip baseline at ${baseline}: fetch the stored one with \`yarn ui-baseline:baseline pull\`, record one with \`yarn ui-baseline:record-pip\`, or point --baseline at one`
  );

// ---------- 1. What to check ----------
const requirements = args.ticket ? await ticketText(args.ticket, args.repo) : null;
const scope = selectScope(requirements, args["list-type"] ?? [], args.route ?? [], args.all);
// pip's journeys to run in CaTH and compare: all of them for --all, otherwise those named
const baselineJourneys = new Set(
  (await readdir(path.join(baseline, "journeys"), { withFileTypes: true }).catch(() => [])).filter((entry) => entry.isDirectory()).map((entry) => entry.name)
);
// Journeys create and delete courts, users and publications, so --all runs them only against a local
// CaTH; in a shared environment they run only when named, by someone who means to change its data
const allJourneys = args.all && environment.cath.signIn === "session";
if (args.all && !allJourneys)
  for (const id of baselineJourneys)
    scope.skipped.push(`journey ${id}: not run by --all outside a local CaTH, as journeys change its data (name it with --journey)`);
const journeyIds = allJourneys ? [...baselineJourneys].sort((a, b) => a.localeCompare(b)) : (args.journey ?? []).filter((id) => baselineJourneys.has(id));
for (const id of (args.journey ?? []).filter((id) => !baselineJourneys.has(id))) scope.skipped.push(`journey ${id}: not in the pip baseline`);
const name = args.ticket
  ? `ticket-${args.ticket}`
  : args.all
    ? "all"
    : [...scope.publications.map((p) => p.id), ...scope.routes.map((r) => r.pip.replace(/^\//, "").replace(/\//g, "-")), ...journeyIds].slice(0, 3).join("+") ||
      "check";
const out = confinedPath(args.out ?? path.join(PARITY_DIR, "output/checks", name), "--out");
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
if (requirements) await writeFile(path.join(out, "requirements.md"), requirements);
const progress = createProgress(path.join(out, "progress.json"), STAGES);
if (!scope.publications.length) progress.skip("capture-lists", "no list pages in scope");
if (!journeyIds.length) progress.skip("journeys", "no journeys in scope");
if (args["no-review"] || !requirements) progress.skip("review", args["no-review"] ? "not asked for" : "no ticket to review against");

step(`Checking ${targetBase} (${environment.name}) against the pip baseline (${path.relative(REPO_DIR, baseline)})`);
const recordedScope = existsSync(path.join(baseline, "scope.json"))
  ? (JSON.parse(await readFile(path.join(baseline, "scope.json"), "utf-8")) as RecordingScope)
  : null;
if (recordedScope)
  console.log(
    `  a ticket recording: ${recordedScope.publications.length} list types, ${recordedScope.pages.length} pages, ${recordedScope.journeys.length} journeys; anything else is not in it`
  );
console.log(`  list types: ${scope.publications.map((p) => p.listType).join(", ") || "none"}`);
console.log(`  pages:      ${scope.routes.map((r) => `${r.pip} → ${r.cath}`).join(", ") || "none"}`);
console.log(`  journeys:   ${journeyIds.join(", ") || "none"}`);
// --all skips most of the route map (journey steps, sign-in pages), so count those by reason instead
const skippedReasons = Object.entries(Object.groupBy(scope.skipped, (s) => s.slice(s.indexOf(": ") + 2).replace(/ \(.*\)/, "")));
for (const line of args.all ? skippedReasons.map(([reason, items]) => `${items?.length} ${reason}`) : scope.skipped) console.log(`  skipped:    ${line}`);
if (!scope.publications.length && !scope.routes.length && !journeyIds.length) {
  console.log("\nNothing to check: name a ticket that mentions list types or pages, or pass --list-type / --route / --journey / --all.");
  process.exit(EXIT_NOTHING_TO_CHECK);
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
// The routes in scope: every one the ticket or --route names, and the CaTH routes of the pages chosen
const routesInScope = new Set([...scope.mentionedRoutes, ...scope.routes.flatMap((route) => [route.pip, route.cath])]);
// Files the baseline recorded that are fetched rather than shown (routes/downloads.json), with the
// publications they come from: all of them for --all, otherwise those of the routes in scope
const downloadSpecs =
  existsSync(path.join(baseline, "downloads/index.jsonl")) && !args["no-files"]
    ? (await loadDownloads()).filter((spec) => args.all || routesInScope.has(spec.pip.path) || routesInScope.has(spec.cath.path))
    : [];
if (!downloadSpecs.length) progress.skip("downloads", "no downloads in scope");
const downloadFixtures = downloadSpecs.flatMap((spec) =>
  Object.values({ ...spec.cath.params, ...spec.cath.query }).flatMap((value) => (value.startsWith("publication:") ? [value.slice("publication:".length)] : []))
);
const seedIds = [
  ...new Set([...scope.publications.map((p) => p.id), ...pageFixtures, ...downloadFixtures, ...(journeyIds.length ? JOURNEY_PUBLICATIONS : [])])
];
// The baseline's variants of each page in scope (variants.ts): the page as other roles, and signed in
const baselineIds = { lists: await capturedIds(path.join(baseline, "lists")), pages: await capturedIds(path.join(baseline, "pages")) };
const variantsOf = (area: keyof typeof baselineIds, id: string) => [...baselineIds[area]].filter((other) => other !== id && parseVariant(other).base === id);
const includeNotFound = baselineIds.pages.has(NOT_FOUND_ID) && (args.all || routesInScope.has("/not-found") || routesInScope.has(NOT_FOUND_PATH));
if (!scope.routes.length && !includeNotFound) progress.skip("capture-pages", "no other pages in scope");
// Pages behind sign-in need CaTH users signed in, as do journeys and downloads made for a user
const needsSignIn =
  journeyIds.length > 0 ||
  downloadSpecs.some((spec) => spec.cath.as) ||
  scope.routes.some((r) => r.viewAs || variantsOf("pages", r.id).length) ||
  scope.publications.some((p) => p.viewAs || variantsOf("lists", p.id).length);
if (!needsSignIn) progress.skip("sign-in", "no page in scope needs it");
const seeding = seedIds.length > 0 && !args["no-seed"];
// The environment's seed file may hold a run an earlier check kept (--keep-seed). A check uses it only
// when it seeds (replacing it) or is asked to check that run again (--no-seed); otherwise it, and the
// sign-in and journeys it passes it to, get a file that is never written, so they neither make
// records on that run nor remove it.
const seedFile = path.join(PARITY_DIR, `output/seed/cath-check-${environment.name}${seeding || args["no-seed"] ? "" : "-unseeded"}.json`);
if (seeding) {
  step("Seeding CaTH");
  progress.start("seed");
  const seeding = spawnSync(
    TSX,
    [...(existsSync(path.join(REPO_DIR, ".env")) ? ["--env-file=.env"] : []), "apps/ui-baseline/cath/seed.ts", ...envArgs, `--only=${seedIds.join(",")}`],
    {
      cwd: REPO_DIR,
      env: { ...process.env, PARITY_SEED_OUTPUT: seedFile },
      encoding: "utf-8"
    }
  );
  for (const line of `${seeding.stdout}${seeding.stderr}`.split("\n").filter((l) => /published|REJECTED|Error/.test(l))) console.log(`  ${line.trim()}`);
  if (seeding.status !== 0) throw new Error("seeding CaTH failed");
  progress.complete("seed");
} else progress.skip("seed", args["no-seed"] ? "not asked for" : "nothing to seed");
const seed = existsSync(seedFile) ? (JSON.parse(await readFile(seedFile, "utf-8")) as SeedResult) : null;

// What the check seeded in a shared CaTH is removed however the check ends: once its files are
// compared (step 4c), when a later step throws (the disposal below runs as this module's top level
// ends, as a finally would), or when the check is stopped (the hosted runner's time limit, say).
// --keep-seed leaves it, and a check of a kept run (--no-seed) leaves that run for the check that
// next seeds. A removal that fails does not fail the check: a later check removes the
// run once it is three hours old.
let seedRemoved = false;
const stopped = { SIGTERM: 143, SIGINT: 130 } as const;
const onStop = (signal: keyof typeof stopped) => void removeSeed().finally(() => process.exit(stopped[signal]));
const removeSeed = async (): Promise<void> => {
  if (seedRemoved || !seeding || !seed?.runToken || args["keep-seed"]) return;
  seedRemoved = true;
  for (const signal of Object.keys(stopped)) process.removeListener(signal, onStop);
  step("Removing what the check seeded");
  try {
    await removeRuns(cathApi(process.env.CATH_SERVICE_API_URL ?? environment.cath.apiUrl), { token: seed.runToken });
    await rm(seedFile, { force: true });
  } catch (error) {
    console.log(`  could not remove run ${seed.runToken}, so a later check will: ${(error as Error).message.split("\n")[0]}`);
  }
};
await using _removesSeed = { [Symbol.asyncDispose]: removeSeed };
if (seeding && seed?.runToken && !args["keep-seed"]) for (const signal of Object.keys(stopped) as (keyof typeof stopped)[]) process.once(signal, onStop);

// ---------- 2b. Sign CaTH's users in, for pages behind sign-in ----------
const signInFile = path.join(PARITY_DIR, `output/seed/cath-sign-in-${environment.name}.json`);
if (needsSignIn) {
  step("Signing in to CaTH");
  progress.start("sign-in");
  const signingIn = spawnSync(TSX, [...(existsSync(path.join(REPO_DIR, ".env")) ? ["--env-file=.env"] : []), "apps/ui-baseline/cath/sign-in.ts", ...envArgs], {
    cwd: REPO_DIR,
    env: { ...process.env, PARITY_SIGN_IN_OUTPUT: signInFile, PARITY_SEED_OUTPUT: seedFile },
    encoding: "utf-8"
  });
  for (const line of `${signingIn.stdout}${signingIn.stderr}`.split("\n").filter((l) => /signed in|not signed in|Error/.test(l)))
    console.log(`  ${line.trim()}`);
  if (signingIn.status !== 0) throw new Error("signing in to CaTH failed");
  progress.complete("sign-in");
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
      source: { app: "cath", fixture: publication.id, ingestion: seed?.ingestion, viewAs: publication.viewAs ?? null, ...seeded, ...runOf(seed) }
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
      source: { app: "cath", kind: "page", route: route.cath, pipRoute: route.pip, viewAs: route.viewAs, ...runOf(seed) } as Record<string, unknown>
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
// Lists and other pages are captured from one queue, so neither waits for the other's slowest pages;
// each stage is done, and its unserved pages dropped, as soon as its own captures are in
const captureAreas = (
  [
    ["lists", listTargets],
    ["pages", pageTargets]
  ] as const
).filter(([area, targets]) => {
  if (!targets.length) progress.skip(CAPTURE_STAGE[area], `no ${area === "lists" ? "list pages" : "other pages"} in scope`);
  return targets.length > 0;
});
const finishing: Promise<void>[] = [];
if (captureAreas.length)
  await captureBatches(
    await Promise.all(
      captureAreas.map(async ([area, targets]) => {
        const targetsFile = path.join(out, `targets-${area}.json`);
        await writeFile(targetsFile, JSON.stringify(targets, null, 2));
        captured[area] = path.join(out, "cath", area);
        // Counted per page and language, as captureBatches captures them
        progress.start(
          CAPTURE_STAGE[area],
          targets.reduce((sum, target) => sum + target.locales.length, 0)
        );
        return {
          targetsFile,
          settings: { outDir: captured[area] },
          onCaptured: (done: number) => progress.advance(CAPTURE_STAGE[area], done),
          onFinished: (results: CaptureResult[]) => {
            finishing.push(
              (async () => {
                console.log(`  ${area}: ${results.filter((r) => r.ok).length} captured, ${results.filter((r) => !r.ok).length} failed`);
                for (const line of await dropUnservedCaptures(captured[area], targets)) console.log(`    not compared: ${line}`);
                progress.complete(CAPTURE_STAGE[area]);
              })()
            );
          }
        };
      })
    ),
    args.concurrency
  );
await Promise.all(finishing);

// ---------- 3b. Run pip's journeys in CaTH and compare them ----------
// Only journeys ported to CaTH (cath/journeys/) can run; the rest are reported as not compared.
// CaTH's journey data is shared, so they run one after another, as pip's were recorded.
const journeysCompared = journeyIds.length ? await runAndCompareJourneys() : null;

// ---------- 4. Compare with the baseline ----------
step("Comparing with pip");
progress.start("compare");
const comparisons: Record<string, CompareSummary> = {};
const capturedTargetIds = { lists: new Set(listTargets.map((t) => t.id)), pages: new Set(pageTargets.map((t) => t.id)) };
for (const area of Object.keys(captured)) {
  const ids = [...capturedTargetIds[area as keyof typeof capturedTargetIds]];
  comparisons[area] = await compareRuns({
    source: path.join(baseline, area),
    target: captured[area],
    out: path.join(out, "compare", area),
    only: ids,
    expectedTarget: expectedCathTarget
  });
  const t = comparisons[area].totals;
  console.log(`  ${area}: ${t.pairs - t.notCaptured} page-language pairs compared, ${t.match} match, ${t.differs} differ`);
}
progress.complete("compare");

// ---------- 4b. Compare the PDF and Excel files ----------
// Each list's files, from CaTH's publications container, against the ones pip made for the same
// fixture. A list seeded through the publication API (JSON only) has no Excel from a spreadsheet,
// so for those a missing Excel is not counted.
const filesCompared = await compareGeneratedFiles();

// ---------- 4c. Remove what the check seeded in a shared CaTH ----------
// Everything after this reads files the check wrote, not CaTH, so nothing seeded is needed any more
await removeSeed();

// ---------- 5. Review against the ticket ----------
const reviews: Record<string, ReviewResult> = {};
if (!args["no-review"] && requirements) {
  step("Reviewing differences against the ticket");
  progress.start("review");
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
      for (const failure of reviews[area].failures ?? []) console.log(`    reviewer failed on ${failure}`);
      if (args.investigate && t.needsHuman) reviews[area] = await investigateArea(area);
    } catch (error) {
      console.log(`  ${area}: review skipped (${(error as Error).message.split("\n")[0]}). Run with --reviewer, or --no-review.`);
    }
  }
  progress.complete("review");
}

// ---------- 6. Report ----------
step("Writing the report");
progress.start("report");
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
execFileSync(process.execPath, reportArgs, { stdio: "ignore" });

// ---------- Summary ----------
const defects = Object.values(reviews).reduce((sum, r) => sum + r.totals.defect, 0);
const needsHuman = Object.values(reviews).reduce((sum, r) => sum + r.totals.needsHuman, 0);
// Each page is compared once per language and state (as first seen, with its collapsed content
// opened, and on mobile); report pages, with where they differ
const pageVerdicts = new Map<string, string[]>();
for (const summary of Object.values(comparisons)) {
  for (const result of summary.results.filter((r) => r.verdict === "differs")) {
    const where = `${result.locale === "cy" ? "Welsh" : "English"}${STATE_LABEL[result.state] ?? ` (${result.state})`}`;
    pageVerdicts.set(result.id, [...(pageVerdicts.get(result.id) ?? []), where]);
  }
}
const differing = [...pageVerdicts.entries()].map(([id, where]) => `${id} (${where.join(", ")})`);
// Counted as captures: a page as another role is checked as a page of its own
const checkedCount = capturedTargetIds.lists.size + capturedTargetIds.pages.size;
const pagesDiffer = `${differing.length} of ${checkedCount} page${checkedCount === 1 ? "" : "s"} ${differing.length === 1 ? "differs" : "differ"} from pip`;
progress.complete("report");
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

if (args.all) {
  progress.skip("evidence", "not written for a check of everything");
  await finish();
}

// ---------- Evidence for the PR ----------
// GitHub only takes attachments through its web editor, so the dev drags these into the comment
step("Writing the evidence");
progress.start("evidence");
const evidence = path.join(out, "evidence");
await mkdir(evidence, { recursive: true });
const bundle = await bundleReport();
execFileSync(systemCommand("zip"), ["-qr", path.join(evidence, "report.zip"), "."], { cwd: bundle });
const screenshots = await sideBySide(evidence);
// Every state of the page in that language counts: a difference only on mobile, or only once its
// collapsed content is opened, is a difference all the same, and says where it is
const verdictLabel = (id: string, locale: string) => {
  const results = Object.values(comparisons)
    .flatMap((c) => c.results)
    .filter((r) => r.id === id && r.locale === locale && r.verdict !== "not-captured");
  if (!results.length) return "not compared";
  const findings = new Set(
    results.flatMap((r) => r.findings.filter((f) => f.category !== "axe-inherited").map((f) => `${f.category} ${f.change} ${f.detail}`))
  );
  if (!findings.size) return "matches";
  const only = results.filter((r) => r.verdict === "differs").map((r) => r.state);
  const where = only.includes("default") ? "" : ` (${only.map((state) => STATE_LABEL[state]?.trim() ?? state).join(", ")})`;
  return `${findings.size} finding${findings.size === 1 ? "" : "s"}${where}`;
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
  accessibility: [...Object.values(comparisons), ...(journeysCompared ? [journeysCompared.pages] : [])],
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
progress.complete("evidence");
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
  if (!ported.length) {
    progress.skip("journeys", "none of the journeys in scope is ported to CaTH yet");
    return null;
  }

  progress.start("journeys", ported.length * locales.length);
  const results = await runJourneys(moduleFile, {
    outDir: path.join(out, "cath/journeys"),
    locales,
    only: ported,
    onRun: (done) => progress.advance("journeys", done)
  });
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
  progress.complete("journeys");
  return summary;
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
  if (args["no-files"] || !listed.length) {
    progress.skip("files", args["no-files"] ? "not asked for" : "no list in scope makes files");
    return null;
  }
  if (!existsSync(path.join(baseline, "files/index.jsonl"))) {
    progress.skip("files", "the baseline has none");
    console.log("\n  PDF and Excel files not compared: the baseline has none (re-record it with `yarn ui-baseline:record-pip`)");
    return null;
  }
  step("Comparing PDF and Excel files");
  progress.start("files");
  const cathFiles = path.join(out, "cath/files");
  // What pip made for each fixture is what CaTH should make, so polling waits for all of it. An Excel
  // file is not expected from a list seeded as JSON through the publication API.
  const pipKinds = Map.groupBy(
    (await readFile(path.join(baseline, "files/index.jsonl"), "utf-8"))
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as { id: string; kind: PublicationFileKind }),
    (entry) => entry.id
  );
  const expectedKinds = (id: string) =>
    (pipKinds.get(id) ?? []).map((entry) => entry.kind).filter((kind) => kind && (kind !== "excel" || seed?.publications[id]?.excelUploaded !== false));
  await collectFiles({
    container: openBlobContainer(filesStorage("cath", environment.cath)),
    out: cathFiles,
    waitSeconds: environment.cath.filesWaitSeconds,
    publications: listed.map((publication) => ({
      id: publication.id,
      artefactId: (seed as SeedResult).publications[publication.id].artefactId,
      seededAt: seed?.seededAt,
      ...runOf(seed),
      expectedKinds: expectedKinds(publication.id)
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
  progress.complete("files");
  return { ...summary, results: summary.results.filter((r) => !uncomparable(r)) };
}

// The files CaTH answers with rather than a page, fetched as the user each is for, against the ones
// pip answered with (routes/downloads.json)
async function compareDownloads(): Promise<FileCompareSummary | null> {
  if (!downloadSpecs.length) return null;
  step("Comparing downloads");
  progress.start("downloads");
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
    seededAt: seed?.seededAt,
    ...runOf(seed)
  });
  for (const line of notServed) scope.skipped.push(`download ${line}`);
  const summary = await compareFileRuns({
    source: path.join(baseline, "downloads"),
    target: cathDownloads,
    out: path.join(out, "compare/files"),
    only: downloadSpecs.map((spec) => spec.id)
  });
  progress.complete("downloads");
  return summary;
}

// pip id -> CaTH id for everything both apps were seeded with: publications, account records and
// users, each paired through the fixture it came from. List type names map to CaTH's numeric ids,
// which only CaTH routes that take one in the path use. A baseline recorded in a shared environment
// put the fixtures' locations at ids of its own (pip/run.ts), where CaTH has them at the fixtures'.
function cathIdsFor(pip: SeedResult | null, cath: SeedResult | null, signedIn: SignInResult | null): CathIds {
  // A check of a shared CaTH seeded copies of the fixture courts too, at ids of their own
  const ids = new Map<string, string>(
    Object.entries(pip?.locations ?? {}).map(([fixture, pipLocation]) => [String(pipLocation), String(cath?.locations?.[fixture] ?? fixture)])
  );
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

// What a capture of a shared CaTH carries, so the comparison drops the run's token from its court names
function runOf(seed: SeedResult | null): { runToken?: string } {
  return seed?.runToken ? { runToken: seed.runToken } : {};
}

// Where a link or form on a pip page should lead in CaTH: another site as it is; the page itself (a
// form posting back, a language switch) as the CaTH page compared with it; a list's page as CaTH's
// page for the list; another pip page as its reviewed CaTH route. Undefined where it cannot be told.
function expectedCathTarget(url: URL, pages: { source: URL; target: URL }): string | undefined {
  if (url.origin !== pages.source.origin) return `${url.origin}${url.pathname}`;
  if (url.pathname === pages.source.pathname) return pages.target.pathname;
  const publication = manifest.publications.find((p: PublicationFixture) => p.paths.pip === url.pathname);
  if (publication) return publication.paths.cath ?? undefined;
  const entry = routeMap.find((route) => route.pip === url.pathname);
  if (!entry?.cath || !isConfident(entry)) return undefined;
  if (!entry.cath.includes("[")) return entry.cath;
  const mapped = cathUrlFor({ id: pageId(entry.pip), pip: entry.pip, cath: entry.cath, viewAs: null, cathParams: entry.cathParams }, url, cathIds);
  return "path" in mapped ? new URL(mapped.path, pages.target).pathname : undefined;
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

// The needs-human items in one area's review, looked at again by a reviewer that can read pip's
// source, CaTH's source and both apps' captures of the area
async function investigateArea(area: string): Promise<ReviewResult> {
  const reviewFile = path.join(out, "review", area, "review.json");
  const sources = [
    ...(existsSync(PIP_SOURCE_DIR) ? [{ label: "pip source, at the commits the baseline was recorded from", path: PIP_SOURCE_DIR }] : []),
    { label: "CaTH source", path: REPO_DIR },
    { label: `pip captures (${area})`, path: path.join(baseline, area) },
    { label: `CaTH captures (${area})`, path: captured[area] }
  ];
  const { review, investigated, resolved } = await investigateFindings({
    review: reviewFile,
    out: reviewFile,
    sources,
    limit: Number(args.investigate),
    requirements: path.join(out, "requirements.md"),
    knownDefects: path.join(PARITY_DIR, "pip/KNOWN-DEFECTS.md"),
    sourceName: "pip",
    targetName: "CaTH"
  });
  const t = review.totals;
  console.log(`  ${area}: looked again at ${investigated}, decided ${resolved}; now ${t.defect} defects, ${t.needsHuman} need a human, ${t.intended} intended`);
  return review;
}

async function finish(): Promise<void> {
  progress.end();
  console.log(`  report: ${path.join(out, "report/index.html")}`);
  if (!args.serve) process.exit(defects > 0 ? EXIT_DIFFERENCES : 0);
  spawn(process.execPath, [path.join(PARITY_DIR, "report/serve.mjs"), path.join(out, "report"), String(REPORT_PORT)], { stdio: "inherit", detached: false });
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
      .filter((r) => r.verdict === "differs")
      .map((r) => ({
        name: `${r.id}-${r.locale}${r.state === "default" ? "" : `-${r.state}`}.png`,
        label: `${r.id} (${r.locale === "cy" ? "Welsh" : "English"}${STATE_LABEL[r.state] ?? ` (${r.state})`})`,
        pip: path.join(baseline, area, r.id, r.locale, r.sourceState ?? r.state, "page.png"),
        cath: path.join(captured[area], r.id, r.locale, r.targetState ?? r.state, "page.png")
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
  const sha = execFileSync(systemCommand("git"), ["rev-parse", "--short", "HEAD"], { cwd: REPO_DIR, encoding: "utf-8" }).trim();
  const dirty = execFileSync(systemCommand("git"), ["status", "--porcelain", "--", "apps", "libs"], { cwd: REPO_DIR, encoding: "utf-8" }).trim();
  return dirty ? `${sha} + uncommitted changes` : sha;
}

// List types the ticket names (pip or CaTH name), and pages it names by route, plus explicit choices
function selectScope(text: string | null, listTypes: string[], routes: string[], everything: boolean): Scope {
  const skipped: string[] = [];
  const mentions = mentionsIn(text, listTypes, routes);
  const publications = manifest.publications.filter((p: PublicationFixture) => everything || mentionsPublication(mentions, p));
  for (const p of publications.filter((p) => !inCath(p))) skipped.push(`${p.listType}: CaTH has no page for it`);

  const selected: Scope["routes"] = [];
  for (const entry of routeMap) {
    if (!everything && !mentionsRoute(mentions, entry)) continue;
    const id = pageId(entry.pip);
    const confident = isConfident(entry);
    if (!entry.cath) skipped.push(`${entry.pip}: no CaTH page mapped`);
    else if (!confident) skipped.push(`${entry.pip}: route-map suggestion (${entry.cath}) not reviewed yet`);
    else if (!existsSync(path.join(baseline, "pages", id, "en/default/provenance.json"))) skipped.push(`${entry.pip}: not in the pip baseline`);
    else selected.push({ id, pip: entry.pip, cath: entry.cath, viewAs: entry.pipRole, cathParams: entry.cathParams });
  }
  return { publications: publications.filter(inCath), routes: selected, mentionedRoutes: mentions.routes, skipped };
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
  // Every route the ticket or --route names, page or not (a download, the not-found address)
  mentionedRoutes: Set<string>;
  skipped: string[];
}
