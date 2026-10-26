import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadManifest, loadUsers, type ParityUser, type SeedResult } from "./fixtures/manifest.js";

// Builds the capture targets file for one app from its seed result, so both apps are captured
// from the same list of pages with the same provenance recorded against each capture.
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const LOCALES = ["en", "cy"];
const SIGN_IN = {
  PI_AAD: { key: "oid", flow: "AAD" },
  SSO: { key: "oid", flow: "SSO" },
  CFT_IDAM: { key: "uid", flow: "CFT" },
  CRIME_IDAM: { key: "uid", flow: "Crime" }
} as const;

const [app, commit] = process.argv.slice(2);
if (!app) throw new Error("usage: build-targets.ts <pip|cath> [app commit]");

const apps = JSON.parse(await readFile(path.join(ROOT, "apps.json"), "utf-8"));
const config = apps[app];
const seed = JSON.parse(await readFile(path.join(ROOT, `output/seed/${app}.json`), "utf-8")) as SeedResult;
const manifest = await loadManifest();
const users = new Map((await loadUsers()).map((user) => [user.id, user]));
const skipped: string[] = [];

const targets = manifest.publications.flatMap((publication) => {
  const seeded = seed.publications[publication.id];
  const pagePath = publication.paths[app as "pip" | "cath"];
  if (!seeded || !pagePath) return [];
  const user = publication.viewAs ? users.get(publication.viewAs) : undefined;
  if (publication.viewAs && !user) throw new Error(`${publication.id} views as unknown user ${publication.viewAs}`);
  if (user && !config.signIn) {
    skipped.push(`${publication.id} (needs sign-in as ${user.id})`);
    return [];
  }
  return [
    {
      id: publication.id,
      // pip serves a flat file as the document itself, so what users see is its link on the court's summary page
      url:
        publication.format === "flat-file"
          ? `${config.baseUrl}/summary-of-publications?locationId=${seeded.locationId}`
          : `${config.baseUrl}${pagePath}?artefactId=${seeded.artefactId}`,
      locales: LOCALES,
      cookies: config.cookies,
      ...(user ? { setup: [signInUrl(user)] } : {}),
      source: {
        app,
        commit: commit ?? null,
        ingestion: seed.ingestion,
        fixture: publication.id,
        origin: publication.origin,
        seededAt: seed.seededAt,
        viewAs: user?.id ?? null,
        ...seeded
      }
    }
  ];
});

const output = path.join(ROOT, `output/targets/${app}.json`);
await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(targets, null, 2)}\n`);
console.log(`wrote ${targets.length} targets → ${output}`);
if (skipped.length) console.log(`skipped ${skipped.length}: ${skipped.join(", ")}`);

function signInUrl(user: ParityUser): string {
  const { key, flow } = SIGN_IN[user.provenance];
  const template = config.signIn as string;
  return `${config.baseUrl}${template.replace("{key}", key).replace("{provenanceUserId}", user.provenanceUserId).replace("{flow}", flow)}`;
}
