import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { captureDownloads, loadDownloads, seedResolver } from "../downloads.js";
import { loadUsers, type SeedResult } from "../fixtures/manifest.js";
import { loadRecordingScope } from "../scope.js";
import { loadPipSessions } from "./session.js";

// Records the files the local pip answers with rather than a page (routes/downloads.json) into the
// baseline, each fetched as the user it is for, signed in to the pip UI_BASELINE_PIP_ENV names
// (pip/session.ts).
// usage: record-downloads.ts <baseline>/downloads
const PARITY_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const out = process.argv[2];
if (!out) throw new Error("usage: record-downloads.ts <out dir>");

const sessions = await loadPipSessions();
const seed = JSON.parse(await readFile(path.join(PARITY_DIR, "output/seed/pip.json"), "utf-8")) as SeedResult;
// A ticket recording records the downloads of the routes it names, as a check compares them
const scope = await loadRecordingScope();
const users = new Map((await loadUsers()).map((user) => [user.id, user]));

const { entries, notServed } = await captureDownloads({
  app: "pip",
  baseUrl: sessions.baseUrl,
  specs: (await loadDownloads()).filter((spec) => !scope || scope.routes.includes(spec.pip.path) || scope.routes.includes(spec.cath.path)),
  resolve: seedResolver(seed.publications, seed.records),
  session: async (userId) => {
    const user = users.get(userId);
    const session = user ? sessions.signIn(user) : null;
    return session && !("unavailable" in session) ? session : null;
  },
  out,
  seededAt: seed.seededAt,
  runToken: seed.runToken
});
console.log(`recorded ${entries.length} downloads → ${out}`);
for (const line of notServed) console.log(`  not recorded: ${line}`);
