import { randomBytes } from "node:crypto";
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

export function newRunToken(now = Date.now()): string {
  return `${TOKEN_PREFIX}${Math.floor(now / 1000).toString(36)}${randomBytes(2).toString("hex")}`;
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
// started more than STALE_AFTER_MS ago
export async function removeRuns(api: CathApi, which: { token: string } | { staleAt: number }): Promise<number> {
  const locations = (await api("GET", "/test-support/locations")) as { locationId: number; name: string }[];
  const byRun = new Map<string, number[]>();
  for (const location of locations) {
    const token = TOKEN_IN_NAME.exec(location.name)?.[1];
    if (!token) continue;
    const removable = "token" in which ? token === which.token : runStartedAt(token) < which.staleAt - STALE_AFTER_MS;
    if (removable) byRun.set(token, [...(byRun.get(token) ?? []), location.locationId]);
  }
  for (const [token, locationIds] of byRun) {
    for (const locationId of locationIds) await api("DELETE", "/test-support/artefacts", { locationId: String(locationId) });
    await api("DELETE", "/test-support/subscriptions", { searchType: SUBSCRIPTION_BY_LOCATION, searchValues: locationIds.map(String) });
    await api("DELETE", "/test-support/locations", { locationIds });
    console.log(`removed run ${token}: ${locationIds.length} courts and what was published to them`);
  }
  return byRun.size;
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
