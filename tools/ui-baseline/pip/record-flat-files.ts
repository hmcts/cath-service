import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadManifest, loadUsers, type SeedResult } from "../fixtures/manifest.js";

// Records what pip serves for each flat-file publication: pip sends the document itself, not a
// page, so the baseline for it is the response (status, type, filename, size, checksum).
// usage: record-flat-files.ts <output dir>
const PARITY_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const [outDir] = process.argv.slice(2);
if (!outDir) throw new Error("usage: record-flat-files.ts <output dir>");

// Local pip uses a self-signed or local-CA certificate; this script only ever talks to localhost
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
const config = JSON.parse(await readFile(path.join(PARITY_DIR, "apps.json"), "utf-8")).pip;
const seed = JSON.parse(await readFile(path.join(PARITY_DIR, "output/seed/pip.json"), "utf-8")) as SeedResult;
const users = new Map((await loadUsers()).map((user) => [user.id, user]));
const manifest = await loadManifest();

await mkdir(outDir, { recursive: true });
const flatFiles = manifest.publications.filter((publication) => publication.format === "flat-file");
for (const publication of flatFiles) {
  const seeded = seed.publications[publication.id];
  if (!seeded) {
    console.log(`skipped ${publication.id}: not seeded`);
    continue;
  }
  const cookie = publication.viewAs ? await signIn(publication.viewAs) : "";
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

async function signIn(userId: string): Promise<string> {
  const user = users.get(userId);
  if (!user) throw new Error(`unknown parity user ${userId}`);
  const key = user.provenance === "CFT_IDAM" || user.provenance === "CRIME_IDAM" ? "uid" : "oid";
  const flow = { PI_AAD: "AAD", SSO: "SSO", CFT_IDAM: "CFT", CRIME_IDAM: "Crime" }[user.provenance];
  const response = await fetch(
    `${config.baseUrl}${config.signIn.replace("{key}", key).replace("{provenanceUserId}", user.provenanceUserId).replace("{flow}", flow)}`,
    { redirect: "manual" }
  );
  return (response.headers.getSetCookie?.() ?? []).map((cookie) => cookie.split(";")[0]).join("; ");
}
