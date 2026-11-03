import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ParityUser, SeedResult } from "../fixtures/manifest.js";

// Creates the account-side records in records.json through pip account-management's own API,
// matching each on its natural key first so re-seeding never duplicates what pages list.
const FIXTURES_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "../fixtures");
const ACCOUNT_MANAGEMENT_URL = process.env.PIP_ACCOUNT_MANAGEMENT_URL ?? "http://localhost:16969";
const REQUESTER_ID = "00000000-0000-4000-8000-000000000001";

export async function seedRecords(users: ParityUser[], publications: SeedResult["publications"]): Promise<SeedRecords> {
  const records = JSON.parse(await readFile(path.join(FIXTURES_DIR, "records.json"), "utf-8")) as RecordsFile;
  const byId = new Map(users.map((user) => [user.id, user]));
  const result: SeedRecords = {};

  for (const subscription of records.subscriptions) {
    const user = await pipUser(required(byId.get(subscription.user), subscription.user));
    const publication = required(publications[subscription.publication], subscription.publication);
    const locationId = String(publication.locationId);
    if (!(await findLocationSubscription(user.userId, locationId))) {
      const location = (await api("GET", `/locations/${locationId}`, undefined, "data")) as { name: string };
      await api("POST", "/subscription", {
        channel: "EMAIL",
        searchType: subscription.searchType,
        searchValue: locationId,
        locationName: location.name,
        listType: null,
        userId: user.userId
      });
    }
    result[subscription.id] = {
      subscriptionId: required((await findLocationSubscription(user.userId, locationId)) ?? undefined, `${subscription.id} after creating it`),
      locationId
    };
  }

  for (const application of records.mediaApplications) {
    let found = ((await api("GET", "/application")) as MediaApplication[]).find((candidate) => candidate.email === application.email);
    if (!found) {
      const form = new FormData();
      form.append("fullName", application.fullName);
      form.append("email", application.email);
      form.append("employer", application.employer);
      form.append("status", "PENDING");
      form.append("file", new Blob([await readFile(path.join(FIXTURES_DIR, application.image))], { type: "image/png" }), "id.png");
      found = (await api("POST", "/application", form)) as MediaApplication;
    }
    result[application.id] = { applicantId: found.id, imageId: found.image };
  }

  for (const legacy of records.legacyThirdPartyUsers) {
    const lookup = await fetch(`${ACCOUNT_MANAGEMENT_URL}/account/provenance/THIRD_PARTY/${legacy.provenanceUserId}`, {
      headers: { "x-requester-id": REQUESTER_ID }
    });
    if (!lookup.ok) {
      await api("POST", "/account/add/pi", [
        { email: "", forenames: "Parity", surname: "ThirdParty", userProvenance: "THIRD_PARTY", provenanceUserId: legacy.provenanceUserId, roles: legacy.role }
      ]);
    }
    const { userId } = (await api("GET", `/account/provenance/THIRD_PARTY/${legacy.provenanceUserId}`)) as { userId: string };
    result[legacy.id] = { userId };
  }

  for (const subscriber of records.thirdPartySubscribers) {
    const findSubscriber = async () =>
      ((await api("GET", "/third-party")) as { userId: string; name: string }[]).find((candidate) => candidate.name === subscriber.name);
    // pip's create response does not include the new subscriber's ID, so read it back from the list
    if (!(await findSubscriber())) await api("POST", "/third-party", { name: subscriber.name });
    result[subscriber.id] = { userId: required(await findSubscriber(), `${subscriber.id} after creating it`).userId };
  }

  for (const entry of records.auditEntries) {
    const user = await pipUser(required(byId.get(entry.user), entry.user));
    const audits = (await api("GET", "/audit?pageSize=500")) as { content: AuditLog[] };
    let found = audits.content.find((audit) => audit.details === entry.details);
    if (!found) {
      found = (await api("POST", "/audit", {
        userId: user.userId,
        userEmail: user.email,
        roles: user.roles,
        userProvenance: user.userProvenance,
        action: entry.action,
        details: entry.details
      })) as AuditLog;
    }
    result[entry.id] = { id: found.id, timestamp: found.timestamp };
  }

  return result;
}

async function findLocationSubscription(userId: string, locationId: string): Promise<string | null> {
  const subscriptions = (await api("GET", `/subscription/user/${userId}`)) as { locationSubscriptions?: { subscriptionId: string; locationId: string }[] };
  return subscriptions.locationSubscriptions?.find((subscription) => String(subscription.locationId) === locationId)?.subscriptionId ?? null;
}

async function pipUser(user: ParityUser): Promise<PipUser> {
  return (await api("GET", `/account/provenance/${user.provenance}/${user.provenanceUserId}`)) as PipUser;
}

async function api(method: string, endpoint: string, body?: unknown, service: "account" | "data" = "account"): Promise<unknown> {
  const base = service === "data" ? (process.env.PIP_DATA_MANAGEMENT_URL ?? "http://localhost:18090") : ACCOUNT_MANAGEMENT_URL;
  const isForm = body instanceof FormData;
  const response = await fetch(`${base}${endpoint}`, {
    method,
    headers: { "x-requester-id": REQUESTER_ID, ...(body && !isForm ? { "content-type": "application/json" } : {}) },
    body: isForm ? body : body ? JSON.stringify(body) : undefined
  });
  const text = await response.text();
  if (!response.ok || text.includes('"ERRORED_ACCOUNTS":[{')) throw new Error(`pip ${method} ${endpoint} failed: ${response.status} ${text.slice(0, 300)}`);
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function required<T>(value: T | undefined, what: string): T {
  if (value === undefined) throw new Error(`records.json references unknown ${what}`);
  return value;
}

export type SeedRecords = Record<string, Record<string, string>>;

interface RecordsFile {
  subscriptions: { id: string; user: string; searchType: string; publication: string }[];
  mediaApplications: { id: string; fullName: string; email: string; employer: string; image: string }[];
  legacyThirdPartyUsers: { id: string; provenanceUserId: string; role: string }[];
  thirdPartySubscribers: { id: string; name: string }[];
  auditEntries: { id: string; user: string; action: string; details: string }[];
}

interface PipUser {
  userId: string;
  email: string;
  roles: string;
  userProvenance: string;
}

interface MediaApplication {
  id: string;
  email: string;
  image: string;
}

interface AuditLog {
  id: string;
  details: string;
  timestamp: string;
}
