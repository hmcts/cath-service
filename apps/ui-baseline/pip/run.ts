import { randomBytes, randomInt } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// A recording in a shared environment (pip test) seeds data of its own, alongside everyone else's.
// Everything it seeds is marked with a token of its own, before a name ("uib3f9a2c Oxford Combined
// Court Centre") or an email ("uib3f9a2c.parity@example.com"), which is what pip's testing-support
// endpoints delete by afterwards (pip/cleanup.ts) and what a comparison drops (core/compare/normalise.ts).
// Its locations go at ids of its own, clear of the environment's. Runs not yet cleaned up are kept in
// output/seed/pip-runs-<env>.json, so a run that dies before its cleanup is cleaned up by the next.
const PARITY_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
export const RUN_TOKEN = /^uib[0-9a-f]{6}$/;
// A run's location ids are its base plus the fixture's (CaTH's) location id, which stays below this
const LOCATION_ID_SPAN = 100_000;
const LOCATION_ID_FIRST_BASE = 10_000_000;
const LOCATION_ID_BASES = 1000;

export async function startRun(environment: string): Promise<PipRun> {
  const run: PipRun = {
    token: `uib${randomBytes(3).toString("hex")}`,
    startedAt: new Date().toISOString(),
    locationIdBase: LOCATION_ID_FIRST_BASE + randomInt(LOCATION_ID_BASES) * LOCATION_ID_SPAN
  };
  await saveRuns(environment, [...(await openRuns(environment)), run]);
  return run;
}

export async function openRuns(environment: string): Promise<PipRun[]> {
  const file = runsFile(environment);
  if (!existsSync(file)) return [];
  const runs = JSON.parse(await readFile(file, "utf-8")) as PipRun[];
  // The file is read back into URL paths, so only well-formed tokens are trusted
  return runs.filter((run) => RUN_TOKEN.test(run.token));
}

export async function finishRun(environment: string, token: string): Promise<void> {
  await saveRuns(
    environment,
    (await openRuns(environment)).filter((run) => run.token !== token)
  );
}

export function runName(run: PipRun | null, name: string): string {
  return run ? `${run.token} ${name}` : name;
}

export function runEmail(run: PipRun | null, email: string): string {
  return run ? `${run.token}.${email}` : email;
}

export function runLocationId(run: PipRun | null, locationId: number): number {
  if (!run) return locationId;
  if (locationId >= LOCATION_ID_SPAN) throw new Error(`location ${locationId} is too large to place clear of pip's own locations`);
  return run.locationIdBase + locationId;
}

async function saveRuns(environment: string, runs: PipRun[]): Promise<void> {
  const file = runsFile(environment);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(runs, null, 2)}\n`);
}

function runsFile(environment: string): string {
  return path.join(PARITY_DIR, "output/seed", `pip-runs-${environment}.json`);
}

export interface PipRun {
  token: string;
  startedAt: string;
  locationIdBase: number;
}
