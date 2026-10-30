import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { BlobContainer } from "@hmcts/ui-baseline";
import { loadManifest } from "../fixtures/manifest.js";

// Creates the account-side records in records.json in CaTH, the counterpart of pip/records.ts, so
// pages that show them have the same data as the baseline. Each is matched on its natural key
// first, so re-running never duplicates what pages list. A local CaTH is written straight to its
// database (prismaRecordStore), because CaTH has no API for most of these; a deployed one goes
// through test-support (testSupportRecordStore). The proof of ID goes to blob storage, as the
// create-media-account form stores it.
const FIXTURES_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "../fixtures");

export async function seedRecords(store: RecordStore, cathUsers: Record<string, CathUser>): Promise<SeedRecords> {
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
    const searchValue = String(publication.locationId);
    const subscriptionId = await store.ensureSubscription(user.userId, subscription.searchType, searchValue);
    result[subscription.id] = { subscriptionId, locationId: searchValue };
  }

  for (const application of records.mediaApplications) {
    const image = await readFile(path.join(FIXTURES_DIR, application.image));
    const applicantId = await store.ensureMediaApplication(
      { name: application.fullName, email: application.email.toLowerCase(), employer: application.employer },
      { data: image, extension: path.extname(application.image) }
    );
    result[application.id] = { applicantId };
  }

  // pip's legacy third-party users are named by their provenance id, which is what its pages show
  for (const legacy of records.legacyThirdPartyUsers) result[legacy.id] = { userId: await store.ensureLegacyThirdPartyUser(legacy.provenanceUserId) };

  for (const subscriber of records.thirdPartySubscribers) result[subscriber.id] = { userId: await store.ensureThirdPartySubscriber(subscriber.name) };

  for (const entry of records.auditEntries) {
    const user = cathUsers[entry.user];
    if (!user) continue;
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
        (await prisma.auditLog.findFirst({ where: { action, details } })) ??
        (await prisma.auditLog.create({
          data: { action, details, userId: user.userId, userEmail: user.email, userRole: user.role, userProvenance: user.provenance }
        }));
      return { id: found.id, timestamp: found.timestamp.toISOString() };
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
    return (await response.json()) as T;
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
      // test-support takes the proof of ID's path at creation, so it is uploaded first under a fixed name
      const blobKey = `ui-baseline-${application.email.replace(/[^a-z0-9]+/g, "-")}${image.extension}`;
      await files.upload(blobKey, image.data, "image/png");
      return existing?.id ?? (await api<{ id: string }>("POST", "/media-applications", { ...application, status: "PENDING", proofOfIdPath: blobKey })).id;
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
      const [found] = await api<{ id: string; timestamp: string }[]>("GET", `/audit-logs${query({ action, details })}`);
      const entry = found ?? (await api<{ id: string; timestamp: string }>("POST", "/audit-logs", { userId: user.userId, action, details }));
      return { id: entry.id, timestamp: new Date(entry.timestamp).toISOString() };
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
  ensureMediaApplication(application: { name: string; email: string; employer: string }, image: { data: Buffer; extension: string }): Promise<string>;
  ensureLegacyThirdPartyUser(name: string): Promise<string>;
  ensureThirdPartySubscriber(name: string): Promise<string>;
  ensureAuditEntry(user: CathUser, action: string, details: string): Promise<{ id: string; timestamp: string }>;
}

interface RecordsFile {
  subscriptions: { id: string; user: string; searchType: string; publication: string }[];
  mediaApplications: { id: string; fullName: string; email: string; employer: string; image: string }[];
  legacyThirdPartyUsers: { id: string; provenanceUserId: string; role: string }[];
  thirdPartySubscribers: { id: string; name: string }[];
  auditEntries: { id: string; user: string; action: string; details: string }[];
}
