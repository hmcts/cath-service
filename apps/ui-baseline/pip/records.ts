import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ParityUser, SeedResult } from "../fixtures/manifest.js";
import type { PipApi } from "./pip-api.js";
import { type PipRun, runEmail, runName } from "./run.js";

// Creates the account-side records in records.json through pip account-management's own API,
// matching each on its natural key first so re-seeding never duplicates what pages list. Records a
// user owns (a subscription, an audit entry) belong to the pip user the pages are captured as:
// the fixture user locally, the signed-in test account in a shared environment (owners), where a
// fixture user with no test account owns nothing. In a shared environment everything made here
// carries the run's token (pip/run.ts), so the cleanup can find it.
const FIXTURES_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "../fixtures");

export async function seedRecords(
  api: PipApi,
  users: ParityUser[],
  publications: SeedResult["publications"],
  options: RecordOptions = {}
): Promise<SeedRecords> {
  const records = JSON.parse(await readFile(path.join(FIXTURES_DIR, "records.json"), "utf-8")) as RecordsFile;
  const byId = new Map(users.map((user) => [user.id, user]));
  const run = options.run ?? null;
  const ownerOf = async (fixtureUserId: string): Promise<PipUser | null> => {
    const user = required(byId.get(fixtureUserId), fixtureUserId);
    if (options.owners) return options.owners[user.id] ?? null;
    return (await api.json("account", `/account/provenance/${user.provenance}/${user.provenanceUserId}`)) as PipUser;
  };
  const result: SeedRecords = {};

  for (const subscription of records.subscriptions) {
    const user = await ownerOf(subscription.user);
    const publication = required(publications[subscription.publication], subscription.publication);
    if (!user) continue;
    const locationId = String(publication.locationId);
    if (!(await findLocationSubscription(api, user.userId, locationId))) {
      const location = (await api.json("data", `/locations/${locationId}`)) as { name: string };
      await api.json("account", "/subscription", {
        method: "POST",
        body: {
          channel: "EMAIL",
          searchType: subscription.searchType,
          searchValue: locationId,
          locationName: location.name,
          listType: null,
          userId: user.userId
        }
      });
    }
    result[subscription.id] = {
      subscriptionId: required((await findLocationSubscription(api, user.userId, locationId)) ?? undefined, `${subscription.id} after creating it`),
      locationId
    };
  }

  for (const application of records.mediaApplications) {
    const email = runEmail(run, application.email);
    let found = ((await api.json("account", "/application")) as MediaApplication[]).find((candidate) => candidate.email === email);
    if (!found) {
      const form = new FormData();
      form.append("fullName", application.fullName);
      form.append("email", email);
      form.append("employer", application.employer);
      form.append("status", "PENDING");
      form.append("file", new Blob([await readFile(path.join(FIXTURES_DIR, application.image))], { type: "image/png" }), "id.png");
      found = (await api.json("account", "/application", { method: "POST", body: form })) as MediaApplication;
    }
    result[application.id] = { applicantId: found.id, imageId: found.image };
  }

  for (const legacy of records.legacyThirdPartyUsers) {
    // A run's own, so it neither finds another run's nor survives the cleanup
    const provenanceUserId = run ? `${run.token}-${legacy.provenanceUserId}` : legacy.provenanceUserId;
    const lookup = await api.request("account", `/account/provenance/THIRD_PARTY/${provenanceUserId}`);
    if (!lookup.ok) {
      await api.json("account", "/account/add/pi", {
        method: "POST",
        body: [
          {
            email: run ? runEmail(run, `${legacy.id}@example.com`) : "",
            forenames: "Parity",
            surname: "ThirdParty",
            userProvenance: "THIRD_PARTY",
            provenanceUserId,
            roles: legacy.role
          }
        ]
      });
    }
    const { userId } = (await api.json("account", `/account/provenance/THIRD_PARTY/${provenanceUserId}`)) as { userId: string };
    result[legacy.id] = { userId };
  }

  for (const subscriber of records.thirdPartySubscribers) {
    const name = runName(run, subscriber.name);
    const findSubscriber = async () =>
      ((await api.json("account", "/third-party")) as { userId: string; name: string }[]).find((candidate) => candidate.name === name);
    // pip's create response does not include the new subscriber's ID, so read it back from the list
    if (!(await findSubscriber())) await api.json("account", "/third-party", { method: "POST", body: { name } });
    result[subscriber.id] = { userId: required(await findSubscriber(), `${subscriber.id} after creating it`).userId };
  }

  for (const entry of records.auditEntries) {
    const user = await ownerOf(entry.user);
    if (!user) continue;
    // The cleanup deletes audit entries by email, so a run's are under its own
    const email = run ? runEmail(run, required(byId.get(entry.user), entry.user).email) : user.email;
    const audits = (await api.json("account", "/audit?pageSize=500")) as { content: AuditLog[] };
    let found = audits.content.find((audit) => audit.details === entry.details && (!run || audit.userEmail === email));
    if (!found) {
      found = (await api.json("account", "/audit", {
        method: "POST",
        body: { userId: user.userId, userEmail: email, roles: user.roles, userProvenance: user.userProvenance, action: entry.action, details: entry.details }
      })) as AuditLog;
    }
    result[entry.id] = { id: found.id, timestamp: found.timestamp };
  }

  return result;
}

async function findLocationSubscription(api: PipApi, userId: string, locationId: string): Promise<string | null> {
  const subscriptions = (await api.json("account", `/subscription/user/${userId}`)) as {
    locationSubscriptions?: { subscriptionId: string; locationId: string }[];
  };
  return subscriptions.locationSubscriptions?.find((subscription) => String(subscription.locationId) === locationId)?.subscriptionId ?? null;
}

function required<T>(value: T | undefined, what: string): T {
  if (value === undefined) throw new Error(`records.json references unknown ${what}`);
  return value;
}

export type SeedRecords = Record<string, Record<string, string>>;

export interface RecordOptions {
  // The run a shared environment's records belong to (pip/run.ts)
  run?: PipRun | null;
  // Fixture user id -> the pip user its pages are captured as, in a shared environment
  owners?: Record<string, PipUser>;
}

export interface PipUser {
  userId: string;
  email: string;
  roles: string;
  userProvenance: string;
}

interface RecordsFile {
  subscriptions: { id: string; user: string; searchType: string; publication: string }[];
  mediaApplications: { id: string; fullName: string; email: string; employer: string; image: string }[];
  legacyThirdPartyUsers: { id: string; provenanceUserId: string; role: string }[];
  thirdPartySubscribers: { id: string; name: string }[];
  auditEntries: { id: string; user: string; action: string; details: string }[];
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
  userEmail?: string;
}
