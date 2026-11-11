import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { BlobContainer } from "../core/index.js";
import { loadManifest } from "../fixtures/manifest.js";
import { runEmail, runName } from "./run.js";

// Creates the account-side records in records.json in CaTH, the counterpart of pip/records.ts, so
// pages that show them have the same data as the baseline. Each is matched on its natural key
// first, so re-running never duplicates what pages list. A local CaTH is written straight to its
// database (prismaRecordStore), because CaTH has no API for most of these; a deployed one goes
// through test-support (testSupportRecordStore). The proof of ID goes to blob storage, as the
// create-media-account form stores it.
const FIXTURES_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "../fixtures");

// run: on a shared CaTH, the check's run (run.ts). What is seeded is named with its token, so the run
// removes it, and subscriptions go to the run's courts (fixture location id -> the run's court),
// never to a real court, where they would be sent every list anyone publishes there; one whose
// court the run did not seed is left out.
export async function seedRecords(store: RecordStore, cathUsers: Record<string, CathUser>, run?: SeedRun): Promise<SeedRecords> {
  const runLocations = run?.locations;
  const name = (value: string) => (run ? runName(run.token, value) : value);
  const email = (value: string) => (run ? runEmail(run.token, value) : value);
  const records = JSON.parse(await readFile(path.join(FIXTURES_DIR, "records.json"), "utf-8")) as RecordsFile;
  const manifest = await loadManifest();
  const result: SeedRecords = {};

  for (const subscription of records.subscriptions) {
    const user = cathUsers[subscription.user];
    // The owner could not be signed in (no test account for their role), so neither can their pages
    if (!user) continue;
    const publication = required(
      manifest.publications.find((p) => p.id === subscription.publication),
      subscription.publication
    );
    const runLocation = runLocations?.[String(publication.locationId)];
    if (runLocations && runLocation === undefined) {
      console.log(`not subscribed: ${subscription.id}: the run seeded no court for ${publication.id}`);
      continue;
    }
    const searchValue = String(runLocation ?? publication.locationId);
    const subscriptionId = await store.ensureSubscription(user.userId, subscription.searchType, searchValue);
    result[subscription.id] = { subscriptionId, locationId: searchValue };
  }

  for (const application of records.mediaApplications) {
    const image = await readFile(path.join(FIXTURES_DIR, application.image));
    const extension = path.extname(application.image);
    // Named for the fixture, not the run, so each run overwrites the one blob rather than leaving one behind
    const applicantId = await store.ensureMediaApplication(
      { name: name(application.fullName), email: email(application.email.toLowerCase()), employer: application.employer },
      { data: image, extension, blobName: `ui-baseline-${application.id}${extension}` }
    );
    result[application.id] = { applicantId };
  }

  // pip's legacy third-party users are named by their provenance id, which is what its pages show
  for (const legacy of records.legacyThirdPartyUsers) result[legacy.id] = { userId: await store.ensureLegacyThirdPartyUser(name(legacy.provenanceUserId)) };

  for (const subscriber of records.thirdPartySubscribers) result[subscriber.id] = { userId: await store.ensureThirdPartySubscriber(name(subscriber.name)) };

  for (const entry of records.auditEntries) {
    const user = cathUsers[entry.user];
    if (!user) continue;
    // Not named with the run's token: test-support cannot delete an audit entry, so the user's one
    // entry for it is reused by every run rather than a new one written each time
    const { id, timestamp } = await store.ensureAuditEntry(user, entry.action, entry.details);
    result[entry.id] = { id, timestamp };
  }

  return result;
}

export async function prismaRecordStore(): Promise<RecordStore> {
  const { prisma } = await import("@hmcts/postgres-prisma");
  const { CONTAINER, uploadBlob } = await import("@hmcts/azure-blob");
  return {
    async ensureSubscription(userId, searchType, searchValue) {
      const found = await prisma.subscription.upsert({
        where: { unique_user_subscription: { userId, searchType, searchValue } },
        update: {},
        create: { userId, searchType, searchValue }
      });
      return found.subscriptionId;
    },
    async ensureMediaApplication(application, image) {
      const found =
        (await prisma.mediaApplication.findFirst({ where: { email: application.email } })) ??
        (await prisma.mediaApplication.create({ data: { ...application, status: "PENDING" } }));
      if (!found.proofOfIdPath) {
        const blobKey = `${found.id}${image.extension}`;
        await uploadBlob(blobKey, image.data, "image/png", CONTAINER.FILES);
        await prisma.mediaApplication.update({ where: { id: found.id }, data: { proofOfIdPath: blobKey, proofOfIdOriginalName: `id${image.extension}` } });
      }
      return found.id;
    },
    async ensureLegacyThirdPartyUser(name) {
      const found = (await prisma.legacyThirdPartyUser.findFirst({ where: { name } })) ?? (await prisma.legacyThirdPartyUser.create({ data: { name } }));
      return found.id;
    },
    async ensureThirdPartySubscriber(name) {
      const found = (await prisma.thirdPartyUser.findFirst({ where: { name } })) ?? (await prisma.thirdPartyUser.create({ data: { name } }));
      return found.id;
    },
    async ensureAuditEntry(user, action, details) {
      const found =
        // The user's own entry, never someone else's with the same action and details
        (await prisma.auditLog.findFirst({ where: { action, details, userId: user.userId } })) ??
        (await prisma.auditLog.create({
          data: { action, details, userId: user.userId, userEmail: user.email, userRole: user.role, userProvenance: user.provenance }
        }));
      return { id: found.id, timestamp: found.timestamp.toISOString() };
    },
    async createPublication(publication) {
      const created = await prisma.artefact.create({
        data: {
          ...publication,
          contentDate: new Date(publication.contentDate),
          displayFrom: new Date(publication.displayFrom),
          displayTo: new Date(publication.displayTo),
          type: "LIST",
          sensitivity: "PUBLIC",
          language: "ENGLISH",
          isFlatFile: false,
          provenance: "MANUAL_UPLOAD"
        }
      });
      return created.artefactId;
    },
    async removeMediaApplication(id) {
      await prisma.mediaApplication.deleteMany({ where: { id } });
    },
    async ensureUser(user) {
      const found = await prisma.user.upsert({ where: { userProvenanceId: user.userProvenanceId }, update: {}, create: user });
      return found.userId;
    },
    async removeLegacyThirdPartyUsers(name) {
      await prisma.legacyThirdPartyUser.deleteMany({ where: { name } });
    },
    async removeThirdPartySubscribers(name) {
      const subscribers = await prisma.thirdPartyUser.findMany({ where: { name }, select: { id: true } });
      for (const { id } of subscribers) {
        // Without Key Vault, CaTH keeps a subscriber's OAuth secrets in this table under its id
        await prisma.thirdPartySecret.deleteMany({ where: { name: { startsWith: `third-party-${id}-` } } });
        await prisma.thirdPartyUser.delete({ where: { id } });
      }
    },
    async replaceListSearchConfig(listTypeId, config) {
      const previous = await prisma.listSearchConfig.findUnique({ where: { listTypeId } });
      if (config) await prisma.listSearchConfig.upsert({ where: { listTypeId }, update: config, create: { listTypeId, ...config } });
      else if (previous) await prisma.listSearchConfig.delete({ where: { listTypeId } });
      return previous ? { caseNumberFieldName: previous.caseNumberFieldName, caseNameFieldName: previous.caseNameFieldName } : null;
    },
    async indexPublicationCases(artefactId, payload) {
      // CaTH's own ingestion step, so the index holds what an upload would have put there
      const { extractAndStoreArtefactSearch } = await import("@hmcts/publication");
      const { listTypeId } = await prisma.artefact.findUniqueOrThrow({ where: { artefactId }, select: { listTypeId: true } });
      const previous = await prisma.artefactSearch.findMany({ where: { artefactId }, select: { caseNumber: true, caseName: true } });
      await extractAndStoreArtefactSearch(artefactId, listTypeId, payload);
      return previous;
    },
    async restorePublicationCases(artefactId, cases) {
      await prisma.artefactSearch.deleteMany({ where: { artefactId } });
      await prisma.artefactSearch.createMany({ data: cases.map((entry) => ({ artefactId, ...entry })) });
    }
  };
}

// The same records through test-support, for a deployed CaTH. The proof of ID is uploaded to the
// environment's files container, which the caller must be able to write to.
export function testSupportRecordStore(apiUrl: string, files: BlobContainer): RecordStore {
  const api = async <T>(method: string, endpoint: string, body?: unknown): Promise<T> => {
    const response = await fetch(`${apiUrl}/test-support${endpoint}`, {
      method,
      headers: { "content-type": "application/json" },
      body: body ? JSON.stringify(body) : undefined
    });
    if (!response.ok) throw new Error(`${method} /test-support${endpoint} failed: ${response.status} ${(await response.text()).slice(0, 300)}`);
    // A delete answers 204, with no body
    return (response.status === 204 ? null : await response.json()) as T;
  };
  const query = (params: Record<string, string>) => `?${new URLSearchParams(params)}`;
  return {
    async ensureSubscription(userId, searchType, searchValue) {
      const [found] = await api<{ subscriptionId: string }[]>("GET", `/subscriptions${query({ userId, searchType, searchValue })}`);
      return (found ?? (await api<{ subscriptionId: string }>("POST", "/subscriptions", { userId, searchType, searchValue }))).subscriptionId;
    },
    async ensureMediaApplication(application, image) {
      // test-support answers 404 for an email with no application
      const existing = await api<{ id: string; proofOfIdPath: string | null }>("GET", `/media-applications${query({ email: application.email })}`).catch(
        (error: Error) => {
          if (error.message.includes("failed: 404")) return null;
          throw error;
        }
      );
      if (existing?.proofOfIdPath) return existing.id;
      // test-support takes the proof of ID's path at creation only, so an application without one is
      // made again with it, uploaded first under its fixed name
      if (existing) await api("DELETE", `/media-applications/${encodeURIComponent(existing.id)}`);
      await files.upload(image.blobName, image.data, "image/png");
      return (await api<{ id: string }>("POST", "/media-applications", { ...application, status: "PENDING", proofOfIdPath: image.blobName })).id;
    },
    async ensureLegacyThirdPartyUser(name) {
      const [found] = await api<{ id: string }[]>("GET", `/legacy-third-party-users${query({ name })}`);
      return (found ?? (await api<{ id: string }>("POST", "/legacy-third-party-users", { name }))).id;
    },
    async ensureThirdPartySubscriber(name) {
      const found = (await api<{ id: string; name: string }[]>("GET", "/third-party-users")).find((user) => user.name === name);
      return (found ?? (await api<{ id: string }>("POST", "/third-party-users", { name }))).id;
    },
    async ensureAuditEntry(user, action, details) {
      // The user's own entry, never someone else's with the same action and details
      const [found] = await api<{ id: string; timestamp: string }[]>("GET", `/audit-logs${query({ action, details, userId: user.userId })}`);
      const entry = found ?? (await api<{ id: string; timestamp: string }>("POST", "/audit-logs", { userId: user.userId, action, details }));
      return { id: entry.id, timestamp: new Date(entry.timestamp).toISOString() };
    },
    async createPublication(publication) {
      return (await api<{ artefactId: string }>("POST", "/artefacts", { ...publication, type: "LIST", provenance: "MANUAL_UPLOAD" })).artefactId;
    },
    async removeMediaApplication(id) {
      const response = await fetch(`${apiUrl}/test-support/media-applications/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error(`DELETE /test-support/media-applications/${id} failed: ${response.status}`);
    },
    async ensureUser(user) {
      // test-support answers 404 for an email with no user
      const existing = await api<{ userId: string }>("GET", `/users${query({ email: user.email })}`).catch((error: Error) => {
        if (error.message.includes("failed: 404")) return null;
        throw error;
      });
      return (existing ?? (await api<{ userId: string }>("POST", "/users", user))).userId;
    },
    async removeLegacyThirdPartyUsers(name) {
      const found = await api<{ id: string }[]>("GET", `/legacy-third-party-users${query({ name })}`);
      if (found.length > 0) await api("DELETE", "/legacy-third-party-users", { ids: found.map((user) => user.id) });
    },
    async removeThirdPartySubscribers(name) {
      // A deployed CaTH keeps OAuth secrets in Key Vault, which test-support cannot remove
      const found = (await api<{ id: string; name: string }[]>("GET", "/third-party-users")).filter((user) => user.name === name);
      for (const { id } of found) {
        const response = await fetch(`${apiUrl}/test-support/third-party-users/${id}`, { method: "DELETE" });
        if (!response.ok && response.status !== 404) throw new Error(`DELETE /test-support/third-party-users/${id} failed: ${response.status}`);
      }
    },
    async replaceListSearchConfig() {
      throw new Error("list search config: not available through test-support yet");
    },
    async indexPublicationCases() {
      throw new Error("indexing an existing publication's cases: not available through test-support yet");
    },
    async restorePublicationCases() {
      throw new Error("restoring a publication's case index: not available through test-support yet");
    }
  };
}

function required<T>(value: T | undefined, what: string): T {
  if (value === undefined) throw new Error(`records.json references unknown ${what}`);
  return value;
}

export type SeedRecords = Record<string, Record<string, string>>;

export interface CathUser {
  userId: string;
  email: string;
  role: string;
  provenance: string;
}

export interface RecordStore {
  ensureSubscription(userId: string, searchType: string, searchValue: string): Promise<string>;
  // blobName: where a deployed CaTH's proof of ID goes; a local one names it after the application
  ensureMediaApplication(
    application: { name: string; email: string; employer: string },
    image: { data: Buffer; extension: string; blobName: string }
  ): Promise<string>;
  ensureLegacyThirdPartyUser(name: string): Promise<string>;
  ensureThirdPartySubscriber(name: string): Promise<string>;
  ensureAuditEntry(user: CathUser, action: string, details: string): Promise<{ id: string; timestamp: string }>;
  // A publication's database row with no file, for pages that only count a court's publications
  createPublication(publication: ThrowawayPublication): Promise<string>;
  removeMediaApplication(id: string): Promise<void>;
  // A user account matched on its provenance id, e.g. one a journey deletes; returns its CaTH id
  ensureUser(user: NewUser): Promise<string>;
  // Removes any left behind by a journey that stopped before deleting them through the UI
  removeLegacyThirdPartyUsers(name: string): Promise<void>;
  removeThirdPartySubscribers(name: string): Promise<void>;
  // Sets (or with null, removes) a list type's case search fields, returning what was there before
  replaceListSearchConfig(listTypeId: number, config: ListSearchConfig | null): Promise<ListSearchConfig | null>;
  // Indexes a publication's cases for case search from its payload, as CaTH does on upload, using
  // its list type's search config; returns the entries it had before, for restorePublicationCases
  indexPublicationCases(artefactId: string, payload: unknown): Promise<PublicationCase[]>;
  restorePublicationCases(artefactId: string, cases: PublicationCase[]): Promise<void>;
}

export interface PublicationCase {
  caseNumber: string | null;
  caseName: string | null;
}

export interface NewUser {
  email: string;
  firstName: string;
  surname: string;
  userProvenance: string;
  userProvenanceId: string;
  role: string;
}

export interface ListSearchConfig {
  caseNumberFieldName: string;
  caseNameFieldName: string;
}

export interface ThrowawayPublication {
  locationId: string;
  listTypeId: number;
  contentDate: string;
  displayFrom: string;
  displayTo: string;
}

export interface SeedRun {
  token: string;
  locations: Record<string, number>;
}

interface RecordsFile {
  subscriptions: { id: string; user: string; searchType: string; publication: string }[];
  mediaApplications: { id: string; fullName: string; email: string; employer: string; image: string }[];
  legacyThirdPartyUsers: { id: string; provenanceUserId: string; role: string }[];
  thirdPartySubscribers: { id: string; name: string }[];
  auditEntries: { id: string; user: string; action: string; details: string }[];
}
