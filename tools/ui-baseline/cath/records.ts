import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CONTAINER, uploadBlob } from "@hmcts/azure-blob";
import { prisma } from "@hmcts/postgres-prisma";
import { loadManifest, type ParityUser } from "../fixtures/manifest.js";

// Creates the account-side records in records.json in CaTH, the counterpart of pip/records.ts, so
// pages that show them have the same data as the baseline. Each is matched on its natural key
// first, so re-running never duplicates what pages list. Written straight to CaTH's database
// (and the proof of ID to blob storage, as the create-media-account form stores it), because
// CaTH has no API for most of these.
const FIXTURES_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "../fixtures");

export async function seedRecords(users: ParityUser[], cathUserIds: Record<string, string>): Promise<SeedRecords> {
  const records = JSON.parse(await readFile(path.join(FIXTURES_DIR, "records.json"), "utf-8")) as RecordsFile;
  const manifest = await loadManifest();
  const byId = new Map(users.map((user) => [user.id, user]));
  const result: SeedRecords = {};

  for (const subscription of records.subscriptions) {
    const userId = required(cathUserIds[subscription.user], subscription.user);
    const publication = required(
      manifest.publications.find((p) => p.id === subscription.publication),
      subscription.publication
    );
    const searchValue = String(publication.locationId);
    const found = await prisma.subscription.upsert({
      where: { unique_user_subscription: { userId, searchType: subscription.searchType, searchValue } },
      update: {},
      create: { userId, searchType: subscription.searchType, searchValue }
    });
    result[subscription.id] = { subscriptionId: found.subscriptionId, locationId: searchValue };
  }

  for (const application of records.mediaApplications) {
    const found =
      (await prisma.mediaApplication.findFirst({ where: { email: application.email.toLowerCase() } })) ??
      (await prisma.mediaApplication.create({
        data: { name: application.fullName, email: application.email.toLowerCase(), employer: application.employer, status: "PENDING" }
      }));
    if (!found.proofOfIdPath) {
      const extension = path.extname(application.image);
      const blobKey = `${found.id}${extension}`;
      await uploadBlob(blobKey, await readFile(path.join(FIXTURES_DIR, application.image)), "image/png", CONTAINER.FILES);
      await prisma.mediaApplication.update({ where: { id: found.id }, data: { proofOfIdPath: blobKey, proofOfIdOriginalName: `id${extension}` } });
    }
    result[application.id] = { applicantId: found.id };
  }

  // pip's legacy third-party users are named by their provenance id, which is what its pages show
  for (const legacy of records.legacyThirdPartyUsers) {
    const found =
      (await prisma.legacyThirdPartyUser.findFirst({ where: { name: legacy.provenanceUserId } })) ??
      (await prisma.legacyThirdPartyUser.create({ data: { name: legacy.provenanceUserId } }));
    result[legacy.id] = { userId: found.id };
  }

  for (const subscriber of records.thirdPartySubscribers) {
    const found =
      (await prisma.thirdPartyUser.findFirst({ where: { name: subscriber.name } })) ??
      (await prisma.thirdPartyUser.create({ data: { name: subscriber.name } }));
    result[subscriber.id] = { userId: found.id };
  }

  for (const entry of records.auditEntries) {
    const user = required(byId.get(entry.user), entry.user);
    const userId = required(cathUserIds[entry.user], entry.user);
    const found =
      (await prisma.auditLog.findFirst({ where: { action: entry.action, details: entry.details } })) ??
      (await prisma.auditLog.create({
        data: {
          action: entry.action,
          details: entry.details,
          userId,
          userEmail: user.email,
          userRole: (await prisma.user.findUniqueOrThrow({ where: { userId } })).role,
          userProvenance: user.provenance
        }
      }));
    result[entry.id] = { id: found.id, timestamp: found.timestamp.toISOString() };
  }

  return result;
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
