import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { loadManifest } from "../fixtures/manifest.js";
import { mentionsIn, mentionsPublication, mentionsRoute, pageId, type RecordingScope, type RouteEntry, ticketText } from "../scope.js";

// Works out what a ticket recording of pip records (baseline.sh --ticket, --list-type, --route,
// --journey): the list types and pages the ticket names, by the same rules the check uses to pick
// what to compare, and the journeys named. Writes the scope file baseline.sh passes to each step.
//   tsx tools/ui-baseline/pip/scope.ts --out <scope.json> [--ticket N] [--list-type NAME]... [--route /path]... [--journey ID]...
const PARITY_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const { values: args } = parseArgs({
  options: {
    out: { type: "string" },
    ticket: { type: "string" },
    "list-type": { type: "string", multiple: true },
    route: { type: "string", multiple: true },
    journey: { type: "string", multiple: true },
    repo: { type: "string", default: "hmcts/cath-service" }
  }
});
if (!args.out) throw new Error("--out is required");

const text = args.ticket ? await ticketText(args.ticket, args.repo) : null;
const mentions = mentionsIn(text, args["list-type"] ?? [], args.route ?? []);
const routeMap = JSON.parse(await readFile(path.join(PARITY_DIR, "routes/route-map.json"), "utf-8")).routes as RouteEntry[];
const knownJourneys = (await readdir(path.join(PARITY_DIR, "pip/journeys")))
  .filter((file) => file.endsWith(".ts") && !["index.ts", "steps.ts"].includes(file))
  .map((file) => file.replace(/\.ts$/, ""));
const unknown = (args.journey ?? []).filter((id) => !knownJourneys.includes(id));
if (unknown.length) throw new Error(`no pip journey ${unknown.join(", ")} (one of: ${knownJourneys.join(", ")})`);

const publications = (await loadManifest()).publications.filter((publication) => mentionsPublication(mentions, publication)).map((p) => p.id);
const routes = routeMap.filter((entry) => mentionsRoute(mentions, entry)).map((entry) => entry.pip);
const scope: RecordingScope = {
  name: args.ticket
    ? `ticket-${args.ticket}`
    : [...publications, ...routes.map((r) => r.replace(/^\//, "").replace(/\//g, "-")), ...(args.journey ?? [])].slice(0, 3).join("+"),
  publications,
  pages: routes.map(pageId),
  journeys: args.journey ?? [],
  routes
};
if (!scope.publications.length && !scope.pages.length && !scope.journeys.length)
  throw new Error("nothing to record: the ticket names no list types or pages pip has; pass --list-type, --route or --journey");

await writeFile(args.out, `${JSON.stringify(scope, null, 2)}\n`);
console.log(
  `recording ${scope.publications.length} list types, ${scope.pages.length} pages and ${scope.journeys.length} journeys (${scope.name}) → ${args.out}`
);
