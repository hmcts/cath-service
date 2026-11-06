import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadManifest, loadUsers, type SeedResult } from "../fixtures/manifest.js";
import { inRecordingScope, loadRecordingScope } from "../scope.js";
import { loadPipSessions } from "./session.js";

// Records what pip serves for each flat-file publication: pip sends the document itself, not a
// page, so the baseline for it is the response (status, type, filename, size, checksum).
// pip is the pip UI_BASELINE_PIP_ENV names (pip/session.ts).
// usage: record-flat-files.ts <output dir>
const PARITY_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const [outDir] = process.argv.slice(2);
if (!outDir) throw new Error("usage: record-flat-files.ts <output dir>");

const sessions = await loadPipSessions();
// Local pip uses a self-signed or local-CA certificate; a deployed one's is checked as usual
if (sessions.environment === "local") process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
const config = { baseUrl: sessions.baseUrl };
const seed = JSON.parse(await readFile(path.join(PARITY_DIR, "output/seed/pip.json"), "utf-8")) as SeedResult;
const users = new Map((await loadUsers()).map((user) => [user.id, user]));
const manifest = await loadManifest();
const scope = await loadRecordingScope();

await mkdir(outDir, { recursive: true });
const flatFiles = manifest.publications.filter((publication) => publication.format === "flat-file" && inRecordingScope(scope, "lists", publication.id));
for (const publication of flatFiles) {
  const seeded = seed.publications[publication.id];
  if (!seeded) {
    console.log(`skipped ${publication.id}: not seeded`);
    continue;
  }
  const cookie = publication.viewAs ? await signIn(publication.viewAs) : "";
  if (cookie === null) {
    console.log(`skipped ${publication.id}: ${publication.viewAs} cannot be signed in to pip ${sessions.environment}`);
    continue;
  }
  const response = await fetch(`${config.baseUrl}/file-publication?artefactId=${seeded.artefactId}`, { headers: cookie ? { cookie } : {}, redirect: "manual" });
  const body = Buffer.from(await response.arrayBuffer());
  const record = {
    id: publication.id,
    listType: publication.listType,
    artefactId: seeded.artefactId,
    viewAs: publication.viewAs ?? null,
    status: response.status,
    contentType: response.headers.get("content-type"),
    contentDisposition: response.headers.get("content-disposition"),
    bytes: body.length,
    sha256: createHash("sha256").update(body).digest("hex"),
    matchesFixture:
      createHash("sha256").update(body).digest("hex") ===
      createHash("sha256")
        .update(await readFile(path.join(PARITY_DIR, "fixtures", publication.payload)))
        .digest("hex")
  };
  await writeFile(path.join(outDir, `${publication.id}.json`), `${JSON.stringify(record, null, 2)}\n`);
  console.log(
    `${record.status === 200 && record.matchesFixture ? "ok  " : "FAIL"} ${publication.id}: ${record.status} ${record.contentType} ${record.bytes} bytes`
  );
}

// The cookie header of a session as the user: locally from /parity-login's answer, in a deployed pip
// the saved session's; null when the user cannot be signed in there
async function signIn(userId: string): Promise<string | null> {
  const user = users.get(userId);
  if (!user) throw new Error(`unknown parity user ${userId}`);
  const session = sessions.signIn(user);
  if ("unavailable" in session) return null;
  if (session.cookies) return session.cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");
  const response = await fetch(session.setup[0], { redirect: "manual" });
  return (response.headers.getSetCookie?.() ?? []).map((cookie) => cookie.split(";")[0]).join("; ");
}
