import { prisma } from "@hmcts/postgres-prisma";

// Matches the run prefix E2E_{Date.now()}_ and its hyphenated form used for UI-created third party users
const RUN_PREFIX_PATTERN = /^E2E[_-](\d{13})[_-]/;

// Cleans up after runs whose own teardown never ran or failed; the age cutoff keeps runs still in progress safe
export async function cleanupStaleRuns(olderThan: Date): Promise<CleanupResult[]> {
  const prefixes = await findStaleRunPrefixes(olderThan);
  const results: CleanupResult[] = [];
  for (const prefix of prefixes) {
    results.push(await cleanupByPrefix(prefix));
  }
  return results;
}

export async function cleanupByPrefix(prefix: string): Promise<CleanupResult> {
  // Order matters: artefacts and subscriptions reference list types, locations and users, so they go first
  const steps: [keyof CleanupDetails, () => Promise<number>][] = [
    ["artefacts", () => deleteArtefacts(prefix)],
    ["subscriptions", () => deleteSubscriptions(prefix)],
    ["users", () => deleteUsers(prefix)],
    ["locations", () => deleteLocations(prefix)],
    ["listTypes", () => deleteListTypes(prefix)],
    // Reference data goes after locations and list types so their link rows are already gone where they cascade
    ["subJurisdictions", () => deletePrefixedSubJurisdictions(prefix)],
    ["jurisdictions", () => deletePrefixedJurisdictions(prefix)],
    ["regions", () => deletePrefixedRegions(prefix)],
    ["mediaApplications", () => deleteMediaApplications(prefix)],
    ["thirdPartyUsers", () => deleteThirdPartyUsers(prefix)]
  ];

  const details = {} as CleanupDetails;
  const failures: CleanupFailure[] = [];

  // Steps run independently so one failure does not leave everything after it behind
  for (const [step, run] of steps) {
    try {
      details[step] = await run();
    } catch (error) {
      console.error(`Cleanup step ${step} failed for prefix ${prefix}:`, error);
      details[step] = 0;
      failures.push({ step, error: error instanceof Error ? error.message : String(error) });
    }
  }

  const deleted = Object.values(details).reduce((a, b) => a + b, 0);
  return { prefix, deleted, details, failures };
}

async function findStaleRunPrefixes(olderThan: Date): Promise<string[]> {
  const startsWithE2E = { startsWith: "E2E_" };
  const [listTypes, locations, users, subscriptions, mediaApplications, thirdPartyUsers, subJurisdictions, jurisdictions, regions] = await Promise.all([
    prisma.listType.findMany({ where: { name: startsWithE2E }, select: { name: true } }),
    prisma.location.findMany({ where: { name: startsWithE2E }, select: { name: true } }),
    prisma.user.findMany({
      where: { OR: [{ email: startsWithE2E }, { userProvenanceId: startsWithE2E }] },
      select: { email: true, userProvenanceId: true }
    }),
    prisma.subscription.findMany({ where: { searchValue: startsWithE2E }, select: { searchValue: true } }),
    prisma.mediaApplication.findMany({ where: { OR: [{ name: startsWithE2E }, { email: startsWithE2E }] }, select: { name: true, email: true } }),
    prisma.thirdPartyUser.findMany({ where: { OR: [{ name: startsWithE2E }, { name: { startsWith: "E2E-" } }] }, select: { name: true } }),
    prisma.subJurisdiction.findMany({ where: { name: startsWithE2E }, select: { name: true } }),
    prisma.jurisdiction.findMany({ where: { name: startsWithE2E }, select: { name: true } }),
    prisma.region.findMany({ where: { name: startsWithE2E }, select: { name: true } })
  ]);

  const values = [
    ...listTypes.map((r) => r.name),
    ...locations.map((r) => r.name),
    ...users.flatMap((r) => [r.email, r.userProvenanceId]),
    ...subscriptions.map((r) => r.searchValue),
    ...mediaApplications.flatMap((r) => [r.name, r.email]),
    ...thirdPartyUsers.map((r) => r.name),
    ...subJurisdictions.map((r) => r.name),
    ...jurisdictions.map((r) => r.name),
    ...regions.map((r) => r.name)
  ];

  const staleTimestamps = values
    .map((value) => RUN_PREFIX_PATTERN.exec(value)?.[1])
    .filter((timestamp): timestamp is string => timestamp !== undefined && Number(timestamp) < olderThan.getTime());

  return [...new Set(staleTimestamps)].sort((a, b) => Number(a) - Number(b)).map((timestamp) => `E2E_${timestamp}_`);
}

// Notification subscribers share the real CFT test account email, so they are only recognisable by their prefixed provenance id
function prefixedUserWhere(prefix: string) {
  return { OR: [{ email: { startsWith: prefix } }, { userProvenanceId: { startsWith: prefix } }] };
}

async function findPrefixedLocationIds(prefix: string): Promise<string[]> {
  const locations = await prisma.location.findMany({
    where: { name: { startsWith: prefix } },
    select: { locationId: true }
  });
  return locations.map((l) => l.locationId.toString());
}

// Artefacts can use a prefixed list type at a real location; the artefact foreign key would otherwise block the list type delete
async function deleteArtefacts(prefix: string): Promise<number> {
  const locationIds = await findPrefixedLocationIds(prefix);
  const result = await prisma.artefact.deleteMany({
    where: { OR: [{ locationId: { in: locationIds } }, { listType: { name: { startsWith: prefix } } }] }
  });
  return result.count;
}

async function deleteSubscriptions(prefix: string): Promise<number> {
  const users = await prisma.user.findMany({ where: prefixedUserWhere(prefix), select: { userId: true } });
  const userIds = users.map((u) => u.userId);
  const locationIds = await findPrefixedLocationIds(prefix);

  const byUser = userIds.length > 0 ? (await prisma.subscription.deleteMany({ where: { userId: { in: userIds } } })).count : 0;
  const bySearchValue = (await prisma.subscription.deleteMany({ where: { searchValue: { startsWith: prefix } } })).count;
  const byLocation =
    locationIds.length > 0 ? (await prisma.subscription.deleteMany({ where: { searchType: "LOCATION_ID", searchValue: { in: locationIds } } })).count : 0;

  return byUser + bySearchValue + byLocation;
}

async function deleteUsers(prefix: string): Promise<number> {
  const result = await prisma.user.deleteMany({ where: prefixedUserWhere(prefix) });
  return result.count;
}

// CASCADE handles the location junction tables
async function deleteLocations(prefix: string): Promise<number> {
  const result = await prisma.location.deleteMany({ where: { name: { startsWith: prefix } } });
  return result.count;
}

async function deleteListTypes(prefix: string): Promise<number> {
  const result = await prisma.listType.deleteMany({ where: { name: { startsWith: prefix } } });
  return result.count;
}

// The link tables cascade from location and list type but not from sub-jurisdiction, so links to unprefixed rows are removed first
async function deletePrefixedSubJurisdictions(prefix: string): Promise<number> {
  const subJurisdictions = await prisma.subJurisdiction.findMany({
    where: { name: { startsWith: prefix } },
    select: { subJurisdictionId: true }
  });
  const subJurisdictionIds = subJurisdictions.map((s) => s.subJurisdictionId);

  if (subJurisdictionIds.length === 0) {
    return 0;
  }

  await prisma.locationSubJurisdiction.deleteMany({ where: { subJurisdictionId: { in: subJurisdictionIds } } });
  await prisma.listTypeSubJurisdiction.deleteMany({ where: { subJurisdictionId: { in: subJurisdictionIds } } });
  const result = await prisma.subJurisdiction.deleteMany({ where: { subJurisdictionId: { in: subJurisdictionIds } } });
  return result.count;
}

// A prefixed jurisdiction still holding an unprefixed sub-jurisdiction is left alone rather than deleting real data with it
async function deletePrefixedJurisdictions(prefix: string): Promise<number> {
  const result = await prisma.jurisdiction.deleteMany({
    where: { name: { startsWith: prefix }, subJurisdictions: { none: {} } }
  });
  return result.count;
}

async function deletePrefixedRegions(prefix: string): Promise<number> {
  const regions = await prisma.region.findMany({
    where: { name: { startsWith: prefix } },
    select: { regionId: true }
  });
  const regionIds = regions.map((r) => r.regionId);

  if (regionIds.length === 0) {
    return 0;
  }

  await prisma.locationRegion.deleteMany({ where: { regionId: { in: regionIds } } });
  const result = await prisma.region.deleteMany({ where: { regionId: { in: regionIds } } });
  return result.count;
}

async function deleteMediaApplications(prefix: string): Promise<number> {
  const result = await prisma.mediaApplication.deleteMany({
    where: { OR: [{ name: { startsWith: prefix } }, { email: { startsWith: prefix } }] }
  });
  return result.count;
}

// UI-created third party users use a hyphenated prefix because underscores are not valid there
async function deleteThirdPartyUsers(prefix: string): Promise<number> {
  const hyphenatedPrefix = prefix.replaceAll("_", "-");
  const result = await prisma.thirdPartyUser.deleteMany({
    where: { OR: [{ name: { startsWith: prefix } }, { name: { startsWith: hyphenatedPrefix } }] }
  });
  return result.count;
}

export interface CleanupDetails {
  artefacts: number;
  subscriptions: number;
  users: number;
  locations: number;
  listTypes: number;
  subJurisdictions: number;
  jurisdictions: number;
  regions: number;
  mediaApplications: number;
  thirdPartyUsers: number;
}

export interface CleanupFailure {
  step: keyof CleanupDetails;
  error: string;
}

export interface CleanupResult {
  prefix: string;
  deleted: number;
  details: CleanupDetails;
  failures: CleanupFailure[];
}
