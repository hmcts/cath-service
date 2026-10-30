import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { collectFiles, openBlobContainer } from "@hmcts/ui-baseline";
import { filesStorage, loadEnvironment } from "../environments.js";
import { loadManifest, type SeedResult } from "../fixtures/manifest.js";

// Records the PDF and Excel files the local pip generated for each seeded publication into the
// baseline, so a check can compare CaTH's files with them. pip generates them in the background
// after accepting a publication (@Async in data-management), so each publication is waited for.
// Flat files are the uploaded document itself, with nothing generated.
// usage: record-files.ts <baseline>/files
const PARITY_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const WAIT_SECONDS = 60;

const out = process.argv[2];
if (!out) throw new Error("usage: record-files.ts <out dir>");

const seed = JSON.parse(await readFile(path.join(PARITY_DIR, "output/seed/pip.json"), "utf-8")) as SeedResult;
const formats = new Map((await loadManifest()).publications.map((publication) => [publication.id, publication.format]));
const environment = await loadEnvironment("local");
const entries = await collectFiles({
  container: openBlobContainer(filesStorage("pip", environment.pip)),
  out,
  waitSeconds: WAIT_SECONDS,
  publications: Object.entries(seed.publications)
    .filter(([id]) => formats.get(id) !== "flat-file")
    .map(([id, publication]) => ({ id, artefactId: publication.artefactId, seededAt: seed.seededAt }))
});
console.log(`recorded ${entries.length} files for ${new Set(entries.map((entry) => entry.id)).size} publications → ${out}`);
