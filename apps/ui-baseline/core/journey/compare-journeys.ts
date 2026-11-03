import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { type CompareSummary, compareRuns, type Finding } from "../compare/compare.js";
import { diffSequences } from "../compare/sequence-diff.js";

// Compares each journey a target app ran with the same journey in the source run: whether the
// target reached the same checkpoints in the same order, at the pages expected, and how each
// checkpoint's page compares. Checkpoints are paired by name, not number, so one missing or extra
// step does not shift every step after it. Journeys only the source ran are reported as not run.
export async function compareJourneys(options: CompareJourneysOptions): Promise<JourneyCompareSummary> {
  const journeyIds = (await journeysIn(options.source)).filter((id) => !options.only || options.only.includes(id));
  const sourceSteps = path.join(options.out, "steps/source");
  const targetSteps = path.join(options.out, "steps/target");
  await rm(options.out, { recursive: true, force: true });
  await mkdir(sourceSteps, { recursive: true });
  await mkdir(targetSteps, { recursive: true });

  const runs: { journey: string; locale: string; source: JourneyRecord; target: JourneyRecord | null }[] = [];
  for (const journey of journeyIds) {
    for (const locale of await localesOf(path.join(options.source, journey))) {
      const source = await readRecord(path.join(options.source, journey, locale));
      if (!source) continue;
      const target = await readRecord(path.join(options.target, journey, locale));
      runs.push({ journey, locale, source, target });
      await linkSteps(options.source, sourceSteps, journey, locale, source);
      if (target) await linkSteps(options.target, targetSteps, journey, locale, target);
    }
  }

  const pages = await compareRuns({
    source: sourceSteps,
    target: targetSteps,
    out: path.join(options.out, "pages"),
    only: [...new Set(runs.filter((run) => run.target).map((run) => run.journey))]
  });
  const pageVerdict = (journey: string, locale: string, name: string) =>
    pages.results.find((r) => r.id === journey && r.locale === locale && r.state === name)?.verdict ?? "not-captured";

  const results = runs.map(({ journey, locale, source, target }): JourneyCompareResult => {
    if (!target)
      return {
        journey,
        locale,
        verdict: "not-run",
        findings: [],
        steps: stepsOf(source).map((s) => ({ name: s.name, source: s, target: null, verdict: "not-captured" }))
      };
    const steps = pairSteps(stepsOf(source), stepsOf(target)).map((pair) => ({
      ...pair,
      verdict: pair.source && pair.target ? pageVerdict(journey, locale, pair.name) : ("not-captured" as const)
    }));
    const findings = [...sequenceFindings(steps), ...pathFindings(steps, options.expectedPath), ...stoppedFindings(target)];
    const differs = findings.length > 0 || steps.some((step) => step.verdict !== "match");
    return { journey, locale, verdict: differs ? "differs" : "match", findings, steps };
  });

  const summary: JourneyCompareSummary = {
    source: options.source,
    target: options.target,
    comparedAt: new Date().toISOString(),
    totals: {
      runs: results.length,
      match: results.filter((r) => r.verdict === "match").length,
      differs: results.filter((r) => r.verdict === "differs").length,
      notRun: results.filter((r) => r.verdict === "not-run").length
    },
    results,
    pages
  };
  await writeFile(path.join(options.out, "journeys-compare.json"), `${JSON.stringify(summary, null, 2)}\n`);
  return summary;
}

async function journeysIn(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

async function localesOf(journeyDir: string): Promise<string[]> {
  return (await journeysIn(journeyDir)).filter((locale) => existsSync(path.join(journeyDir, locale, "journey.json")));
}

async function readRecord(dir: string): Promise<JourneyRecord | null> {
  const file = path.join(dir, "journey.json");
  return existsSync(file) ? (JSON.parse(await readFile(file, "utf-8")) as JourneyRecord) : null;
}

// Lays a run's checkpoints out as captures compareRuns can pair: <journey>/<locale>/<name>
async function linkSteps(runDir: string, stepsDir: string, journey: string, locale: string, record: JourneyRecord): Promise<void> {
  await mkdir(path.join(stepsDir, journey, locale), { recursive: true });
  for (const step of stepsOf(record)) {
    const captured = path.resolve(runDir, journey, locale, step.step);
    if (!existsSync(captured)) continue;
    await symlink(captured, path.join(stepsDir, journey, locale, step.name));
    await writeFile(path.join(stepsDir, "index.jsonl"), `${JSON.stringify({ id: journey, locale, state: step.name })}\n`, { flag: "a" });
  }
}

// A checkpoint's name without its number; a name used twice in one journey gets a #2, #3, ...
function stepsOf(record: JourneyRecord): NamedStep[] {
  const seen = new Map<string, number>();
  return record.steps.map((step) => {
    const base = step.step.replace(/^\d+-/, "");
    const count = (seen.get(base) ?? 0) + 1;
    seen.set(base, count);
    return { name: count > 1 ? `${base}#${count}` : base, step: step.step, path: step.path, via: step.via };
  });
}

// Both runs' checkpoints in one order: those both reached, then each side's own where they diverge
function pairSteps(source: NamedStep[], target: NamedStep[]): Omit<StepPair, "verdict">[] {
  const runs = diffSequences(
    source.map((s) => s.name),
    target.map((s) => s.name)
  );
  if (!runs) return [...source.map((s) => ({ name: s.name, source: s, target: null })), ...target.map((t) => ({ name: t.name, source: null, target: t }))];
  const byName = (steps: NamedStep[]) => new Map(steps.map((s) => [s.name, s]));
  const sourceByName = byName(source);
  const targetByName = byName(target);
  return runs.flatMap((run) =>
    run.items.map((name) => ({
      name,
      source: run.kind === "insert" ? null : (sourceByName.get(name) ?? null),
      target: run.kind === "delete" ? null : (targetByName.get(name) ?? null)
    }))
  );
}

function sequenceFindings(steps: StepPair[]): Finding[] {
  const missing = new Set(steps.filter((s) => s.source && !s.target).map((s) => s.name));
  const extra = new Set(steps.filter((s) => s.target && !s.source).map((s) => s.name));
  return [
    ...[...missing].map((name) =>
      extra.has(name)
        ? { category: "journey", change: "moved", detail: `"${name}" is reached at a different point` }
        : { category: "journey", change: "missing", detail: `"${name}" is not reached` }
    ),
    ...[...extra]
      .filter((name) => !missing.has(name))
      .map((name) => ({ category: "journey", change: "extra", detail: `"${name}" is reached only in the target` }))
  ];
}

// A checkpoint both reached, at a page other than the one the source's page maps to
function pathFindings(steps: StepPair[], expectedPath: CompareJourneysOptions["expectedPath"]): Finding[] {
  if (!expectedPath) return [];
  return steps.flatMap((step) => {
    if (!step.source || !step.target) return [];
    const expected = expectedPath(step.source.path);
    return expected && expected !== step.target.path
      ? [{ category: "journey", change: "path", detail: `"${step.name}" is at ${step.target.path}, expected ${expected} (from ${step.source.path})` }]
      : [];
  });
}

function stoppedFindings(target: JourneyRecord): Finding[] {
  return target.ok
    ? []
    : [
        {
          category: "journey",
          change: "stopped",
          detail: `stopped after ${target.steps.length} checkpoints: ${target.error?.split("\n")[0] ?? "no error recorded"}`
        }
      ];
}

export interface CompareJourneysOptions {
  // Journey runs as runJourneys writes them: <dir>/<journey>/<locale>/journey.json
  source: string;
  target: string;
  out: string;
  only?: string[];
  // The target path a source page is expected at; null or undefined when it is not known
  expectedPath?: (sourcePath: string) => string | null | undefined;
}

export interface JourneyCompareResult {
  journey: string;
  locale: string;
  verdict: "match" | "differs" | "not-run";
  findings: Finding[];
  steps: StepPair[];
}

export interface JourneyCompareSummary {
  source: string;
  target: string;
  comparedAt: string;
  totals: { runs: number; match: number; differs: number; notRun: number };
  results: JourneyCompareResult[];
  // Each checkpoint's page against the target's: id is the journey, state the checkpoint name
  pages: CompareSummary;
}

interface StepPair {
  name: string;
  source: NamedStep | null;
  target: NamedStep | null;
  verdict: "match" | "differs" | "not-captured";
}

interface NamedStep {
  name: string;
  step: string;
  path: string;
  via: string | null;
}

interface JourneyRecord {
  ok: boolean;
  error: string | null;
  steps: { step: string; path: string; via: string | null }[];
}
