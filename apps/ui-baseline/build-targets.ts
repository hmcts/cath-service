import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadManifest, loadUsers, type ParityUser, type SeedResult } from "./fixtures/manifest.js";
import { loadPipSessions, type PipSessions, signedInTargets } from "./pip/session.js";
import { SIGNED_IN_VIEWER, variantId, withMobile } from "./variants.js";

// Builds the capture targets file for one app from its seed result, so both apps are captured
// from the same list of pages with the same provenance recorded against each capture. Each list
// signed out is captured again signed in as a verified user, and at mobile width (variants.ts).
// pip is the pip UI_BASELINE_PIP_ENV names (pip/session.ts): the local stack, or a deployed one.
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const LOCALES = ["en", "cy"];

const [app, commit] = process.argv.slice(2);
if (!app) throw new Error("usage: build-targets.ts <pip|cath> [app commit]");

const apps = JSON.parse(await readFile(path.join(ROOT, "apps.json"), "utf-8"));
const sessions = app === "pip" ? await loadPipSessions() : null;
const config = { ...apps[app], ...(sessions ? { baseUrl: sessions.baseUrl } : {}) };
const seed = JSON.parse(await readFile(path.join(ROOT, `output/seed/${app}.json`), "utf-8")) as SeedResult;
const manifest = await loadManifest();
const users = new Map((await loadUsers()).map((user) => [user.id, user]));
const skipped: string[] = [];

const mainTargets = manifest.publications.flatMap((publication) => {
  const seeded = seed.publications[publication.id];
  const pagePath = publication.paths[app as "pip" | "cath"];
  if (!seeded || !pagePath) return [];
  const user = publication.viewAs ? users.get(publication.viewAs) : undefined;
  if (publication.viewAs && !user) throw new Error(`${publication.id} views as unknown user ${publication.viewAs}`);
  if (user && !sessions) {
    skipped.push(`${publication.id} (needs sign-in as ${user.id})`);
    return [];
  }
  const target = {
    id: publication.id,
    // pip serves a flat file as the document itself, so what users see is its link on the court's summary page
    url:
      publication.format === "flat-file"
        ? `${config.baseUrl}/summary-of-publications?locationId=${seeded.locationId}`
        : `${config.baseUrl}${pagePath}?artefactId=${seeded.artefactId}`,
    locales: LOCALES,
    cookies: config.cookies,
    source: {
      app,
      commit: commit ?? null,
      ingestion: seed.ingestion,
      fixture: publication.id,
      origin: publication.origin,
      seededAt: seed.seededAt,
      ...(seed.runToken ? { runToken: seed.runToken, environment: seed.environment } : {}),
      viewAs: user?.id ?? null,
      ...seeded
    }
  };
  return user ? asUser(sessions as PipSessions, target, user, publication.id) : [target];
});

const viewer = users.get(SIGNED_IN_VIEWER);
const viewerTargets =
  viewer && sessions
    ? mainTargets
        .filter((target) => !target.source.viewAs)
        .flatMap((target) =>
          asUser(
            sessions,
            { ...target, id: variantId(target.id, viewer.id), source: { ...target.source, viewAs: viewer.id } },
            viewer,
            variantId(target.id, viewer.id)
          )
        )
    : [];
const targets = withMobile([...mainTargets, ...viewerTargets]);

const output = path.join(ROOT, `output/targets/${app}.json`);
await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(targets, null, 2)}\n`);
console.log(`wrote ${targets.length} targets → ${output}`);
if (skipped.length) console.log(`skipped ${skipped.length}: ${skipped.join(", ")}`);

function asUser<T extends { locales: string[]; cookies?: { name: string; value: string }[] }>(
  pipSessions: PipSessions,
  target: T,
  user: ParityUser,
  id: string
): T[] {
  const { targets: signedIn, unavailable } = signedInTargets(pipSessions, target, user);
  if (unavailable) skipped.push(`${id} (${unavailable})`);
  return signedIn;
}
