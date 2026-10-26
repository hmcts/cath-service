import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { copyFile, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { listTypeData } from "@hmcts/list-types-common";
import { locationData } from "@hmcts/location/location-data";
import type { Manifest, PublicationFixture } from "./manifest.js";

// Regenerates publications.json and payloads/ from pinned pip checkouts: one publication per
// list type in pip's listLookup.json, using pip's own mock payloads. Run again whenever the
// pinned pip commits change. Anything that cannot be matched is listed under "unmatched" with
// the reason, rather than guessed.
const FIXTURES_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_CONTENT_DATE = "2022-02-14";
const EXCEL_DIR = "src/integrationTest/resources/data/non-strategic";
const EXCEL_PAIRINGS_DIR = "src/integrationTest/java/uk/gov/hmcts/reform/pip/data/management/controllers/publication/summary/configurations";
const BROKEN_MOCK = /missing|invalid|empty|typo|nonstrategic.*error|_?bad/i;

const [pipFrontend, pipDataManagement] = process.argv.slice(2);
if (!pipFrontend || !pipDataManagement) throw new Error("usage: generate.ts <pip-frontend checkout> <pip-data-management checkout>");

const { renamed } = JSON.parse(await readFile(path.join(FIXTURES_DIR, "../list-type-map.json"), "utf-8")) as { renamed: Record<string, string> };
const listLookup = JSON.parse(await readFile(path.join(pipFrontend, "src/main/resources/listLookup.json"), "utf-8")) as Record<string, PipListType>;
const mockSources = [
  { repo: "pip-frontend", root: pipFrontend, dir: "src/test/unit/mocks" },
  { repo: "pip-data-management", root: pipDataManagement, dir: "src/test/resources/mocks" }
];
const mocks = await indexMocks();
const excelFixtures = await nonStrategicExcelFixtures();
const pipSchemas = await pipValidationSchemas();
const pipRoutes = await readFile(path.join(pipFrontend, "src/main/routes/routes.ts"), "utf-8");
const deprecated = await deprecatedListTypes();
// pip's own flat-file fixture, as its E2E suite uploads for flat-file publications
const FLAT_FILE = "src/test/end-to-end/shared/mocks/testFlatFile.pdf";
const styleGuideMocks = await styleGuideTestMocks();
const commits = { "pip-frontend": gitHead(pipFrontend), "pip-data-management": gitHead(pipDataManagement) };

const publications: PublicationFixture[] = [];
const unmatched: { listType: string; reason: string }[] = [];

// payloads/ is generated in full each time; hand-maintained fixture files live elsewhere (records/)
await rm(path.join(FIXTURES_DIR, "payloads"), { recursive: true, force: true });
await mkdir(path.join(FIXTURES_DIR, "payloads"), { recursive: true });

for (const [listType, pip] of Object.entries(listLookup)) {
  // Deprecated list types are left out of the baseline: pip refuses them and CaTH is not migrating them
  if (deprecated.has(listType)) {
    unmatched.push({
      listType,
      reason: "deprecated in pip (pip-data-models ListType.isDeprecated): pip refuses new uploads, so it is left out of the baseline"
    });
    continue;
  }
  const id = listType.toLowerCase().replace(/_/g, "-");
  // Non-strategic lists are uploaded to pip as Excel and converted by pip itself; the JSON mocks
  // are pip's converted output, so the Excel file is the faithful input for both apps
  const ownExcel = excelFixtures.get(listType);
  const excel: { file: string; sharedWith?: string } | undefined = pip.isNonStrategic
    ? ownExcel
      ? { file: ownExcel }
      : sharedSchemaExcel(listType)
    : undefined;
  const mock = pip.isNonStrategic ? null : findMock(listType, pip);
  // A strategic list type with no page in pip is only ever published as a flat file
  const flatFileOnly = !pip.isNonStrategic && !mock && (!pip.url || !pipRoutes.includes(`'/${pip.url}'`));
  if (pip.isNonStrategic && !excel) {
    // pip-data-management keeps Excel files for list types it has since deprecated, but no longer
    // uploads them in its tests, and rejects new uploads of them
    const keptButUnused = existsSync(path.join(pipDataManagement, EXCEL_DIR, id));
    unmatched.push({
      listType,
      reason: keptButUnused
        ? "deprecated in pip: pip rejects new uploads of it, and its Excel fixture is no longer used by pip's tests"
        : "non-strategic list with no Excel fixture in pip-data-management's integration tests"
    });
    continue;
  }
  if (!pip.isNonStrategic && !mock && !flatFileOnly) {
    unmatched.push({ listType, reason: "no pip mock payload found for this list type" });
    continue;
  }

  const format = excel ? "excel" : flatFileOnly ? "flat-file" : "json";
  const payloadFile = `payloads/${id}.${{ excel: "xlsx", "flat-file": "pdf", json: "json" }[format]}`;
  const sourceFile = excel
    ? path.join(pipDataManagement, EXCEL_DIR, excel.file)
    : flatFileOnly
      ? path.join(pipFrontend, FLAT_FILE)
      : (mock as NonNullable<typeof mock>).file;
  const payload = format === "json" ? JSON.parse(await readFile(sourceFile, "utf-8")) : null;
  await copyFile(sourceFile, path.join(FIXTURES_DIR, payloadFile));
  const origin = excel
    ? `hmcts/pip-data-management@${commits["pip-data-management"]}:${EXCEL_DIR}/${excel.file}`
    : flatFileOnly
      ? `hmcts/pip-frontend@${commits["pip-frontend"]}:${FLAT_FILE}`
      : `hmcts/${(mock as NonNullable<typeof mock>).repo}@${commits[(mock as NonNullable<typeof mock>).repo]}:${(mock as NonNullable<typeof mock>).relative}`;

  const cathListType = renamed[listType] ?? listType;
  const cath = listTypeData.find((row) => row.name === cathListType);
  const location = chooseLocation(cath?.subJurisdictionIds ?? [], pip.jurisdictionTypes ?? []);
  const notes = [
    ...(cath ? [] : ["CaTH has no equivalent list type"]),
    ...(cath && cathListType !== listType ? [`renamed in CaTH to ${cathListType}`] : []),
    ...(pip.isHidden ? ["hidden in pip"] : []),
    ...(excel ? ["non-strategic: uploaded as Excel and converted by each app"] : []),
    ...(excel?.sharedWith ? [`Excel fixture shared with ${excel.sharedWith}: pip validates both against ${pipSchemas.get(listType)}`] : []),
    ...(flatFileOnly
      ? ["flat file only: pip has no page for this list type, so the baseline is its summary-of-publications link and the file pip serves"]
      : []),
    ...(location.fallback ? ["no CaTH location hosts this list type; using location 1"] : []),
    ...(mock?.via ? [`payload matched via ${mock.via}`] : [])
  ];
  const sensitivity = pip.defaultSensitivity ? pip.defaultSensitivity.toUpperCase() : "PUBLIC";
  // Every pip and CaTH list type that is classified allows PI_AAD verified users, so one user covers them
  const viewAs = sensitivity === "PUBLIC" ? undefined : "verified-media";
  if (viewAs) notes.push(`${sensitivity} by default: captured signed in as ${viewAs}`);

  publications.push({
    id,
    listType,
    cathListType: cath ? cathListType : null,
    // Flat files are compared through the court's summary-of-publications page, not a list page
    paths: flatFileOnly ? { pip: "/file-publication", cath: null } : { pip: `/${pip.url}`, cath: cath?.urlPath ? `/${cath.urlPath}` : null },
    payload: payloadFile,
    format,
    origin,
    locationId: location.locationId,
    contentDate: publicationDate(payload) ?? DEFAULT_CONTENT_DATE,
    type: "LIST",
    language: "ENGLISH",
    sensitivity,
    provenance: "MANUAL_UPLOAD",
    ...(viewAs ? { viewAs } : {}),
    notes
  });
}

const manifest: Manifest = {
  $comment:
    "Generated by generate.ts from pinned pip checkouts; do not edit by hand. Single definition of what both apps are seeded with. Dates that render are fixed so captures do not change with the clock; only the display window is relative, so publications are always live whenever they are seeded. Locations are not listed here: both apps load them from libs/location/src/location-data.ts.",
  generatedFrom: commits,
  displayWindowDays: { before: 1, after: 30 },
  publications,
  unmatched
};
await writeFile(path.join(FIXTURES_DIR, "publications.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`${publications.length} publications, ${unmatched.length} unmatched list types`);

function findMock(listType: string, pip: PipListType): { file: string; repo: "pip-frontend" | "pip-data-management"; relative: string; via?: string } | null {
  const byName = `${camelCase(listType)}.json`.toLowerCase();
  for (const source of mockSources) {
    const hit = mocks.find((mock) => mock.source === source && path.basename(mock.relative).toLowerCase() === byName);
    if (hit) return { file: hit.file, repo: source.repo as "pip-frontend", relative: hit.relative };
  }
  const fromTests = styleGuideMocks.find((entry) => entry.listTypes.includes(listType)) ?? styleGuideMocks.find((entry) => entry.url === pip.url);
  if (fromTests) {
    const hit = mocks.find((mock) => mock.source === mockSources[0] && mock.relative.endsWith(`/${fromTests.mock.replace(/^\//, "")}`));
    if (hit) return { file: hit.file, repo: "pip-frontend", relative: hit.relative, via: `pip a11y test ${fromTests.test}` };
  }
  return null;
}

async function indexMocks() {
  const found: { source: (typeof mockSources)[number]; file: string; relative: string }[] = [];
  for (const source of mockSources) {
    const walk = async (dir: string): Promise<void> => {
      for (const entry of await readdir(path.join(source.root, dir), { withFileTypes: true })) {
        const relative = path.join(dir, entry.name);
        if (entry.isDirectory()) await walk(relative);
        else if (entry.name.endsWith(".json") && !BROKEN_MOCK.test(entry.name)) found.push({ source, file: path.join(source.root, relative), relative });
      }
    };
    await walk(source.dir);
  }
  return found;
}

// Non-strategic list types with no Excel fixture of their own can share one with a list type that
// pip validates against the same schema (e.g. the residential property tribunal lists)
function sharedSchemaExcel(listType: string): { file: string; sharedWith: string } | undefined {
  const schema = pipSchemas.get(listType);
  if (!schema) return undefined;
  for (const [other, file] of excelFixtures) {
    if (other !== listType && pipSchemas.get(other) === schema) return { file, sharedWith: other };
  }
  return undefined;
}

// pip-data-models marks retired list types with isDeprecated, the last argument of the enum's
// all-arguments constructor (9 arguments) or of its 4-argument constructor. Read from the version
// pip-data-management builds against, so the baseline follows what that pip actually accepts.
async function deprecatedListTypes(): Promise<Set<string>> {
  const gradle = await readFile(path.join(pipDataManagement, "build.gradle"), "utf-8");
  const version = gradle.match(/pip-data-models:([\d.]+)/)?.[1];
  if (!version) throw new Error("could not find the pip-data-models version in pip-data-management/build.gradle");
  const source = execFileSync(
    "gh",
    [
      "api",
      "-H",
      "Accept: application/vnd.github.raw",
      `repos/hmcts/pip-data-models/contents/src/main/java/uk/gov/hmcts/reform/pip/model/publication/ListType.java?ref=${version}`
    ],
    { encoding: "utf-8" }
  );
  const body = source.slice(source.indexOf("{", source.indexOf("enum ListType")) + 1);
  const entries = body.slice(0, body.indexOf(";"));
  const result = new Set<string>();
  // Each constant is NAME(args), separated by commas; comments between them are skipped
  for (const match of entries.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "").matchAll(/([A-Z][A-Z0-9_]+)\s*\(((?:[^()]|\((?:[^()]|\([^()]*\))*\))*)\)/g)) {
    const args = splitTopLevel(match[2]);
    if ((args.length === 9 || args.length === 4) && args[args.length - 1].trim() === "true") result.add(match[1]);
  }
  return result;
}

function splitTopLevel(text: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let inString = false;
  let current = "";
  for (const char of text) {
    // Friendly names are string literals and may contain commas and brackets themselves
    if (char === '"') inString = !inString;
    if (!inString && char === "(") depth++;
    if (!inString && char === ")") depth--;
    if (char === "," && depth === 0 && !inString) {
      parts.push(current);
      current = "";
    } else current += char;
  }
  if (current.trim()) parts.push(current);
  return parts;
}

// pip-data-management's validation-schemas: list type -> the JSON schema pip validates it against
async function pipValidationSchemas(): Promise<Map<string, string>> {
  const yaml = await readFile(path.join(pipDataManagement, "src/main/resources/application.yaml"), "utf-8");
  return new Map([...yaml.matchAll(/^\s{4}([A-Z_]+): "(schemas\/[^"]+)"/gm)].map((match) => [match[1], match[2]]));
}

// pip-data-management's integration tests pair each non-strategic list type with the Excel file
// they upload for it; several list types share one file (e.g. the regional SSCS lists)
async function nonStrategicExcelFixtures(): Promise<Map<string, string>> {
  const pairs = new Map<string, string>();
  const dir = path.join(pipDataManagement, EXCEL_PAIRINGS_DIR);
  for (const name of (await readdir(dir)).filter((file) => file.startsWith("NonStrategic"))) {
    const source = await readFile(path.join(dir, name), "utf-8");
    const joinLiterals = (expression: string) => [...expression.matchAll(/"([^"]*)"/g)].map((match) => match[1]).join("");
    const constants = new Map(
      [...source.matchAll(/static final String (\w+)\s*=\s*((?:"[^"]*"\s*\+?\s*)+);/g)].map((match) => [match[1], joinLiterals(match[2])])
    );
    for (const match of source.matchAll(/ListType\.([A-Z_]+),\s*((?:"[^"]*"\s*\+?\s*)+|[A-Z_]+)/g)) {
      const file = match[2].trim().startsWith('"') ? joinLiterals(match[2]) : constants.get(match[2].trim());
      if (file) pairs.set(match[1], file.replace(/^.*non-strategic\//, ""));
    }
  }
  return pairs;
}

// pip's own list-page a11y tests pair each URL with the mock it renders, which covers mocks whose
// file names do not follow the list type name
async function styleGuideTestMocks() {
  const dir = path.join(pipFrontend, "src/test/a11y/tests/style-guide");
  const entries: { test: string; url: string | null; mock: string; listTypes: string[] }[] = [];
  for (const name of await readdir(dir)) {
    const source = await readFile(path.join(dir, name), "utf-8");
    const url = source.match(/const url = '\/([^?']+)/)?.[1] ?? null;
    const listTypes = [...source.matchAll(/listType = '([A-Z_]+)'/g)].map((match) => match[1]);
    for (const match of source.matchAll(/testArtefactJsonData\('([^']+)'\)/g)) entries.push({ test: name, url, mock: match[1], listTypes });
  }
  return entries;
}

function chooseLocation(subJurisdictionIds: number[], pipJurisdictionTypes: string[]): { locationId: number; fallback: boolean } {
  const wanted = new Set([
    ...subJurisdictionIds,
    ...locationData.subJurisdictions.filter((sub) => pipJurisdictionTypes.includes(sub.name)).map((sub) => sub.subJurisdictionId)
  ]);
  const location = locationData.locations.find((candidate) => candidate.subJurisdictions.some((id) => wanted.has(id)));
  return location ? { locationId: location.locationId, fallback: false } : { locationId: 1, fallback: true };
}

function publicationDate(payload: unknown): string | null {
  const value = (payload as { document?: { publicationDate?: string } })?.document?.publicationDate;
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : null;
}

function camelCase(listType: string): string {
  return listType.toLowerCase().replace(/_([a-z0-9])/g, (_, char: string) => char.toUpperCase());
}

function gitHead(repo: string): string {
  return execFileSync("git", ["-C", repo, "rev-parse", "--short=8", "HEAD"], { encoding: "utf-8" }).trim();
}

interface PipListType {
  url: string;
  jurisdictionTypes?: string[];
  defaultSensitivity?: string;
  isHidden?: boolean;
  isNonStrategic?: boolean;
}
