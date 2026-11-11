import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { locationData } from "@hmcts/location/location-data";

// A check of a deployed CaTH (aat) seeds courts of its own rather than publishing to the real ones:
// each fixture court is copied under a name marked with the run's token ("uicsm9x2kab Oxford Combined
// Court Centre"), which the comparison drops, as pip/run.ts does for pip test. Nobody else subscribes
// to these courts, so publishing to them notifies no one, and no one else's lists show on their
// pages. Everything a run seeded is found again through its token, so it is removed at the end of
// the check, or by a later check if the pod restarted first: nothing depends on a file on the pod.
// The token carries when the run started, so a later run only removes runs old enough to be over.
const TOKEN_PREFIX = "uic";
export const CATH_RUN_TOKEN = /^uic[0-9a-z]{8,}$/;
const TOKEN_IN_NAME = /^(uic[0-9a-z]{8,}) /;
// Longer than any check takes, so a run still going (a developer's, beside the hosted one) is left alone
const STALE_AFTER_MS = 3 * 60 * 60 * 1000;
const SUBSCRIPTION_BY_LOCATION = "LOCATION_ID";
const RECORDS_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), "../fixtures/records.json");

export function newRunToken(now = Date.now()): string {
  return `${TOKEN_PREFIX}${Math.floor(now / 1000).toString(36)}${randomBytes(2).toString("hex")}`;
}

// A record the run seeds is named with its token, as its courts are, so a later run can find it and
// the comparison drops the token: "uicsm9x2kab Parity Applicant", "uicsm9x2kab.applicant@example.com"
export function runName(token: string, name: string): string {
  return `${token} ${name}`;
}

export function runEmail(token: string, email: string): string {
  return `${token}.${email}`;
}

// When the run with this token started, from the seconds it carries
export function runStartedAt(token: string): number {
  return Number.parseInt(token.slice(TOKEN_PREFIX.length, -4), 36) * 1000;
}

// Copies of the fixture courts for the run: each fixture location id -> the id CaTH gave the copy
export async function createRunLocations(api: CathApi, token: string, fixtureLocationIds: number[]): Promise<Record<string, number>> {
  const locations: Record<string, number> = {};
  for (const fixtureId of [...new Set(fixtureLocationIds)]) {
    const court = locationData.locations.find((location) => location.locationId === fixtureId);
    if (!court) throw new Error(`no location ${fixtureId} in location-data.ts to copy for the run`);
    const created = (await api("POST", "/test-support/locations", {
      name: `${token} ${court.name}`,
      welshName: `${token} ${court.welshName}`,
      regionIds: court.regions,
      subJurisdictionIds: court.subJurisdictions
    })) as { locationId: number };
    locations[String(fixtureId)] = created.locationId;
  }
  console.log(`created ${Object.keys(locations).length} courts for run ${token}`);
  return locations;
}

// Removes what runs seeded on their courts, then the courts: the run with this token, or every run
// started more than STALE_AFTER_MS ago. A run that cannot be removed does not stop the others; it is
// named in the error thrown once they have all been tried.
export async function removeRuns(api: CathApi, which: { token: string } | { staleAt: number }): Promise<number> {
  const locations = (await api("GET", "/test-support/locations")) as { locationId: number; name: string }[];
  const byRun = new Map<string, number[]>();
  for (const location of locations) {
    const token = TOKEN_IN_NAME.exec(location.name)?.[1];
    if (!token) continue;
    const removable = "token" in which ? token === which.token : runStartedAt(token) < which.staleAt - STALE_AFTER_MS;
    if (removable) byRun.set(token, [...(byRun.get(token) ?? []), location.locationId]);
  }
  if (!byRun.size) return 0;
  // Fetched once for every run removed, not once per run
  const records = await runRecordLists(api);
  const failed: string[] = [];
  for (const [token, locationIds] of byRun) {
    try {
      await removeRunRecords(api, token, records);
      // The courts go last: while any are left, a later run can find the run and finish removing it
      for (const locationId of locationIds) await api("DELETE", "/test-support/artefacts", { locationId: String(locationId) });
      await api("DELETE", "/test-support/subscriptions", { searchType: SUBSCRIPTION_BY_LOCATION, searchValues: locationIds.map(String) });
      await api("DELETE", "/test-support/locations", { locationIds });
      console.log(`removed run ${token}: ${locationIds.length} courts and what was published to them`);
    } catch (error) {
      failed.push(`${token} (${(error as Error).message.split("\n")[0]})`);
    }
  }
  if (failed.length) throw new Error(`could not remove run${failed.length === 1 ? "" : "s"} ${failed.join(", ")}`);
  return byRun.size;
}

// What removeRunRecords looks through for each run's records
async function runRecordLists(api: CathApi): Promise<RunRecordLists> {
  const { mediaApplications } = JSON.parse(await readFile(RECORDS_FILE, "utf-8")) as { mediaApplications: { email: string }[] };
  return {
    mediaApplications,
    legacyThirdPartyUsers: (await api("GET", "/test-support/legacy-third-party-users")) as { id: string; name: string }[],
    thirdPartyUsers: (await api("GET", "/test-support/third-party-users")) as { id: string; name: string }[]
  };
}

// The account-side records the run seeded (records.ts), found by its token. Audit entries are not
// named with a token: test-support cannot delete them, so each run reuses the one entry.
async function removeRunRecords(api: CathApi, token: string, records: RunRecordLists): Promise<void> {
  for (const { email } of records.mediaApplications) {
    const application = (await api("GET", `/test-support/media-applications?${new URLSearchParams({ email: runEmail(token, email.toLowerCase()) })}`).catch(
      (error: Error) => {
        if (error.message.includes("failed: 404")) return null;
        throw error;
      }
    )) as { id: string } | null;
    if (application) await api("DELETE", `/test-support/media-applications/${encodeURIComponent(application.id)}`);
  }
  const ownedByRun = (users: { id: string; name: string }[]) => users.filter((user) => user.name.startsWith(runName(token, ""))).map((user) => user.id);
  const legacy = ownedByRun(records.legacyThirdPartyUsers);
  if (legacy.length) await api("DELETE", "/test-support/legacy-third-party-users", { ids: legacy });
  const subscribers = ownedByRun(records.thirdPartyUsers);
  if (subscribers.length) await api("DELETE", "/test-support/third-party-users", { ids: subscribers });
}

// A call to CaTH's API (test-support), giving back its JSON
export type CathApi = (method: string, endpoint: string, body?: unknown) => Promise<unknown>;

export function cathApi(apiUrl: string): CathApi {
  return async (method, endpoint, body) => {
    const response = await fetch(`${apiUrl}${endpoint}`, {
      method,
      headers: { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    if (!response.ok) throw new Error(`${method} ${endpoint} failed: ${response.status} ${await response.text()}`);
    return response.status === 204 ? null : response.json();
  };
}

interface RunRecordLists {
  mediaApplications: { email: string }[];
  legacyThirdPartyUsers: { id: string; name: string }[];
  thirdPartyUsers: { id: string; name: string }[];
}
