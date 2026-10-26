#!/usr/bin/env -S npx tsx
import { parseArgs } from "node:util";
import { captureBatch } from "./capture/capture-batch.js";
import { startCaptureServer } from "./capture/capture-server.js";
import { compareRuns } from "./compare/compare.js";
import { runJourneys } from "./journey/run-journeys.js";
import { reviewFindings } from "./review/review.js";

const USAGE = `Usage:
  parity capture --targets <file.json> --out <dir> [--concurrency 4] [--region main] [--timezone Europe/London]
      Capture every target in a targets file (replaces <dir>)
  parity journeys --module <journeys.ts> --out <dir> [--locales en,cy] [--only id,id]
      Run a project's journeys, capturing every checkpoint with a video per journey (replaces <dir>)
  parity compare --source <dir> --target <dir> --out <dir> [--only id,id] [--unordered id,id]
      Compare each capture in a source run with the same capture in a target run
  parity review --compare <compare.json> --out <dir> [--requirements <file|gh:owner/repo#N>] [--known-defects <md>]
                [--source-name pip] [--target-name CaTH] [--reviewer "cmd args"] [--prompt-only]
      Classify each compared difference as intended, defect or needs-human against the ticket
  parity serve --out <dir> [--port 9400] [--region main] [--timezone Europe/London]
      Start a capture server for harnesses to call: POST /capture with one target`;

const [command, ...rest] = process.argv.slice(2);

switch (command) {
  case "capture":
    await capture(rest);
    break;
  case "journeys":
    await journeys(rest);
    break;
  case "compare":
    await compare(rest);
    break;
  case "review":
    await review(rest);
    break;
  case "serve":
    await serve(rest);
    break;
  default:
    console.error(USAGE);
    process.exit(command ? 1 : 0);
}

async function capture(args: string[]): Promise<void> {
  const { values } = parseArgs({
    args,
    options: {
      targets: { type: "string" },
      out: { type: "string" },
      concurrency: { type: "string", default: "4" },
      region: { type: "string" },
      timezone: { type: "string" }
    }
  });
  if (!values.targets || !values.out) throw new Error("--targets and --out are required");

  const results = await captureBatch(values.targets, { outDir: values.out, region: values.region, timezone: values.timezone }, Number(values.concurrency));
  const failed = results.filter((result) => !result.ok);
  console.log(`\n${results.length - failed.length} captured, ${failed.length} failed → ${values.out}`);
  process.exit(failed.length ? 1 : 0);
}

async function journeys(args: string[]): Promise<void> {
  const { values } = parseArgs({
    args,
    options: { module: { type: "string" }, out: { type: "string" }, locales: { type: "string", default: "en,cy" }, only: { type: "string" } }
  });
  if (!values.module || !values.out) throw new Error("--module and --out are required");

  const results = await runJourneys(values.module, { outDir: values.out, locales: values.locales.split(","), only: values.only?.split(",") });
  for (const result of results)
    console.log(`${result.ok ? "ok  " : "FAIL"} ${result.journey} ${result.locale}: ${result.steps} checkpoints${result.error ? ` — ${result.error}` : ""}`);
  const failed = results.filter((result) => !result.ok);
  console.log(`\n${results.length - failed.length} journeys completed, ${failed.length} failed → ${values.out}`);
  process.exit(failed.length ? 1 : 0);
}

async function compare(args: string[]): Promise<void> {
  const { values } = parseArgs({
    args,
    options: { source: { type: "string" }, target: { type: "string" }, out: { type: "string" }, only: { type: "string" }, unordered: { type: "string" } }
  });
  if (!values.source || !values.target || !values.out) throw new Error("--source, --target and --out are required");

  const summary = await compareRuns({
    source: values.source,
    target: values.target,
    out: values.out,
    only: values.only?.split(","),
    unorderedRows: values.unordered?.split(",")
  });
  const { totals } = summary;
  console.log(`${totals.pairs} pairs: ${totals.match} match, ${totals.differs} differ, ${totals.notCaptured} not captured → ${values.out}/compare.json`);
}

async function review(args: string[]): Promise<void> {
  const { values } = parseArgs({
    args,
    options: {
      compare: { type: "string" },
      out: { type: "string" },
      requirements: { type: "string" },
      "known-defects": { type: "string" },
      "source-name": { type: "string" },
      "target-name": { type: "string" },
      reviewer: { type: "string" },
      "prompt-only": { type: "boolean", default: false }
    }
  });
  if (!values.compare || !values.out) throw new Error("--compare and --out are required");

  const result = await reviewFindings({
    compare: values.compare,
    out: values.out,
    requirements: values.requirements,
    knownDefects: values["known-defects"],
    sourceName: values["source-name"],
    targetName: values["target-name"],
    reviewer: values.reviewer?.split(" ").filter(Boolean),
    promptOnly: values["prompt-only"]
  });
  if (values["prompt-only"]) console.log(`wrote review prompts for ${result.totals.items} items → ${values.out}`);
  else
    console.log(
      `${result.totals.items} items: ${result.totals.intended} intended, ${result.totals.defect} defects, ${result.totals.needsHuman} need a human → ${values.out}/review.json`
    );
}

async function serve(args: string[]): Promise<void> {
  const { values } = parseArgs({
    args,
    options: { out: { type: "string" }, port: { type: "string", default: "9400" }, region: { type: "string" }, timezone: { type: "string" } }
  });
  if (!values.out) throw new Error("--out is required");

  const server = await startCaptureServer({ outDir: values.out, port: Number(values.port), region: values.region, timezone: values.timezone });
  console.log(`parity capture server listening on http://127.0.0.1:${server.port}`);

  const shutdown = () => server.close().then(() => process.exit(0));
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
