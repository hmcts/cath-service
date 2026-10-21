import { type Prisma, prisma } from "@hmcts/postgres-prisma";
import { createLegacyStorageReader, type LegacyStorageReader } from "../blob/legacy-storage-source.js";
import { deleteOrphanedProofOfIdFiles, stageProofOfIdFiles } from "../blob/proof-of-id-copy.js";
import { createLegacySecretReader } from "../key-vault/legacy-secret-source.js";
import { copyOauthSecrets, deleteRemovedOauthSecrets } from "../key-vault/oauth-secret-copy.js";
import { findDropLimitViolation } from "../sync/row-count-guard.js";
import { type DomainReport, type DomainTransform, SyncAbortedError, type SyncReport } from "../sync/sync-report.js";
import { findWriteDrift } from "../sync/write-drift.js";
import { transformAuditLogs } from "./audit-log-transform.js";
import { transformCourtelSubscriptions, transformCourtelUsers } from "./courtel-transform.js";
import { type LegacyAccountData, readLegacyAccountData } from "./legacy-account-source.js";
import { transformListTypeSubscriptions } from "./list-type-subscription-transform.js";
import { type MigratedMediaApplication, transformMediaApplications } from "./media-application-transform.js";
import { transformOauthCredentials, transformOauthSubscriptions, transformOauthUsers } from "./oauth-third-party-transform.js";
import { transformSubscriptions } from "./subscription-transform.js";
import { transformArchivedUsers } from "./user-archive-transform.js";
import { type MigratedUser, transformUsers } from "./user-transform.js";

const TRANSACTION_OPTIONS = { maxWait: 10_000, timeout: 10 * 60_000 };

// Every pending application can be approved or rejected, leaving none to migrate, and legacy
// purges archived accounts after 90 days, so a quiet quarter leaves none of those either.
const TABLES_THAT_CAN_BE_EMPTIED = new Set<TableName>(["media_application", "user_archive"]);

// Users this service created themselves (testers signing in) are kept, along with their subscriptions.
const MIGRATED_USER = { isLegacyMigrated: true } as const;

// Each run replaces the migrated account data with the transformed legacy snapshot. One
// transaction keeps every table consistent.
export async function runLegacySync(options: LegacySyncOptions): Promise<SyncReport> {
  const { legacyAccountDatabaseUrl, isDryRun, maxDropRatio } = options;
  const legacy = await readLegacyAccountData(legacyAccountDatabaseUrl);
  const referenceData = await readReferenceData();
  const plan = await buildAccountPlan(legacy, referenceData, createLegacyStorageReader(), isDryRun);

  const { domains, previous } = await prisma.$transaction(async (tx) => {
    const domains = await buildReports(tx, plan, maxDropRatio);
    const previous = await readPreviousState(tx);

    if (!isDryRun) {
      // Throwing rolls the reload back, leaving the previous night's data in place.
      const abortedReport = { isDryRun, domains, steps: [] };
      const violations = domains.flatMap((report) => (report.dropLimitViolation ? [report.dropLimitViolation] : []));
      if (violations.length > 0) {
        throw new SyncAbortedError(violations.join("\n"), abortedReport);
      }
      await replaceAccountData(tx, plan, findCollidingLocalUserIds(previous.localUsers, plan.users.rows));
      const drift = await findAccountWriteDrift(tx, plan);
      if (drift.length > 0) {
        throw new SyncAbortedError(drift.join("\n"), abortedReport);
      }
    }

    return { domains, previous };
  }, TRANSACTION_OPTIONS);

  if (!isDryRun) {
    await deleteOrphanedProofOfIdFiles(
      previous.proofOfIdPaths,
      plan.mediaApplications.rows.map((application) => application.proofOfIdPath)
    );
  }

  const secretStep = await copyOauthSecrets(plan.oauthCredentials.rows, createLegacySecretReader(), isDryRun);

  if (!isDryRun) {
    await deleteRemovedOauthSecrets(
      previous.oauthUserIds,
      plan.oauthUsers.rows.map((user) => user.id)
    );
  }

  return {
    isDryRun,
    domains,
    steps: [{ ...secretStep, rejections: [...plan.oauthCredentials.rejections, ...secretStep.rejections] }]
  };
}

async function readReferenceData(): Promise<ReferenceData> {
  const listTypes = await prisma.listType.findMany({ where: { deletedAt: null }, select: { id: true, name: true } });
  const locations = await prisma.location.findMany({ select: { locationId: true } });

  return {
    listTypeIdByName: new Map(listTypes.map((listType) => [listType.name, listType.id])),
    locationIds: new Set(locations.map((location) => String(location.locationId)))
  };
}

async function buildAccountPlan(legacy: LegacyAccountData, referenceData: ReferenceData, storage: LegacyStorageReader, isDryRun: boolean) {
  const { listTypeIdByName, locationIds } = referenceData;

  const users = transformUsers(legacy.users);
  const migratedUserIds = new Set(users.rows.map((user) => user.userId));

  const courtelUsers = transformCourtelUsers(legacy.users);
  const courtelUserIds = new Set(courtelUsers.rows.map((user) => user.id));

  const oauthUsers = transformOauthUsers(legacy.apiUsers);
  const oauthContext = { oauthUserIds: new Set(oauthUsers.rows.map((user) => user.id)), listTypeIdByName };

  const media = transformMediaApplications(legacy.mediaApplications);
  const stagedMedia = await stageProofOfIdFiles(media.rows, storage, isDryRun);
  const mediaApplications: DomainTransform<MigratedMediaApplication> = {
    rows: stagedMedia.rows.map((load) => load.application),
    rejections: [...media.rejections, ...stagedMedia.rejections]
  };

  return {
    users,
    subscriptions: transformSubscriptions(legacy.subscriptions, { migratedUserIds, locationIds }),
    listTypeSubscriptions: transformListTypeSubscriptions(legacy.listTypeSubscriptions, { migratedUserIds, listTypeIdByName }),
    courtelUsers,
    courtelSubscriptions: transformCourtelSubscriptions(legacy.subscriptions, { courtelUserIds, listTypeIdByName }),
    oauthUsers,
    oauthSubscriptions: transformOauthSubscriptions(legacy.apiSubscriptions, oauthContext),
    oauthCredentials: transformOauthCredentials(legacy.apiOauthConfigurations, oauthContext),
    mediaApplications,
    auditLogs: transformAuditLogs(legacy.auditLogs),
    archivedUsers: transformArchivedUsers(legacy.archivedUsers),
    readCounts: {
      user: legacy.users.length,
      subscription: legacy.subscriptions.length,
      subscription_list_type: legacy.listTypeSubscriptions.length,
      legacy_third_party_user: courtelUsers.rows.length,
      legacy_third_party_subscription: legacy.subscriptions.filter((subscription) => subscription.channel === "API_COURTEL").length,
      third_party_user: legacy.apiUsers.length,
      third_party_subscription: legacy.apiSubscriptions.length,
      media_application: legacy.mediaApplications.length,
      audit_log: legacy.auditLogs.length,
      user_archive: legacy.archivedUsers.length
    }
  };
}

async function buildReports(tx: Prisma.TransactionClient, plan: AccountPlan, maxDropRatio: number): Promise<DomainReport[]> {
  const tables: [TableName, DomainTransform<unknown>, () => Promise<number>][] = [
    ["user", plan.users, () => tx.user.count({ where: MIGRATED_USER })],
    ["subscription", plan.subscriptions, () => tx.subscription.count({ where: { user: MIGRATED_USER } })],
    ["subscription_list_type", plan.listTypeSubscriptions, () => tx.subscriptionListType.count({ where: { user: MIGRATED_USER } })],
    ["legacy_third_party_user", plan.courtelUsers, () => tx.legacyThirdPartyUser.count()],
    ["legacy_third_party_subscription", plan.courtelSubscriptions, () => tx.legacyThirdPartySubscription.count()],
    ["third_party_user", plan.oauthUsers, () => tx.thirdPartyUser.count()],
    ["third_party_subscription", plan.oauthSubscriptions, () => tx.thirdPartySubscription.count()],
    ["media_application", plan.mediaApplications, () => tx.mediaApplication.count()],
    ["audit_log", plan.auditLogs, () => tx.auditLog.count()],
    ["user_archive", plan.archivedUsers, () => tx.userArchive.count()]
  ];

  const reports: DomainReport[] = [];
  for (const [entityType, transform, count] of tables) {
    const existing = await count();
    const loaded = transform.rows.length;
    reports.push({
      entityType,
      read: plan.readCounts[entityType],
      existing,
      loaded,
      rejections: transform.rejections,
      dropLimitViolation: findDropLimitViolation(entityType, existing, loaded, maxDropRatio, {
        canBeEmptied: TABLES_THAT_CAN_BE_EMPTIED.has(entityType)
      })
    });
  }
  return reports;
}

async function readPreviousState(tx: Prisma.TransactionClient) {
  const applications = await tx.mediaApplication.findMany({ select: { proofOfIdPath: true } });
  const oauthUsers = await tx.thirdPartyUser.findMany({ select: { id: true } });
  const localUsers = await tx.user.findMany({ where: { isLegacyMigrated: false }, select: { userId: true, userProvenanceId: true } });

  return {
    proofOfIdPaths: applications.flatMap((application) => (application.proofOfIdPath ? [application.proofOfIdPath] : [])),
    oauthUserIds: oauthUsers.map((user) => user.id),
    localUsers
  };
}

// userProvenanceId is unique, so a tester who signed in here as someone who is also in legacy
// has to make way for the legacy row. They find it by provenance ID on their next sign-in.
function findCollidingLocalUserIds(localUsers: LocalUser[], migratedUsers: MigratedUser[]): string[] {
  const migratedProvenanceIds = new Set(migratedUsers.map((user) => user.userProvenanceId));
  return localUsers.filter((user) => migratedProvenanceIds.has(user.userProvenanceId)).map((user) => user.userId);
}

// Deleting subscriptions cascades to notification_audit_log. Before cutover it only holds
// Skipped rows, because outbound notifications are disabled, so nothing of record is lost.
async function replaceAccountData(tx: Prisma.TransactionClient, plan: AccountPlan, collidingUserIds: string[]): Promise<void> {
  const replacedUsers = { OR: [MIGRATED_USER, { userId: { in: collidingUserIds } }] };
  await tx.subscriptionListType.deleteMany({ where: { user: replacedUsers } });
  await tx.subscription.deleteMany({ where: { user: replacedUsers } });
  await tx.user.deleteMany({ where: replacedUsers });
  await tx.legacyThirdPartySubscription.deleteMany();
  await tx.legacyThirdPartyUser.deleteMany();
  await tx.thirdPartySubscription.deleteMany();
  await tx.thirdPartyUser.deleteMany();
  await tx.mediaApplication.deleteMany();
  await tx.auditLog.deleteMany();
  await tx.userArchive.deleteMany();

  await tx.user.createMany({ data: plan.users.rows });
  await tx.subscription.createMany({ data: plan.subscriptions.rows });
  await tx.subscriptionListType.createMany({ data: plan.listTypeSubscriptions.rows });
  await tx.legacyThirdPartyUser.createMany({ data: plan.courtelUsers.rows });
  await tx.legacyThirdPartySubscription.createMany({ data: plan.courtelSubscriptions.rows });
  await tx.thirdPartyUser.createMany({ data: plan.oauthUsers.rows });
  await tx.thirdPartySubscription.createMany({ data: plan.oauthSubscriptions.rows });
  await tx.mediaApplication.createMany({ data: plan.mediaApplications.rows });
  await tx.auditLog.createMany({ data: plan.auditLogs.rows });
  await tx.userArchive.createMany({ data: plan.archivedUsers.rows });
}

async function findAccountWriteDrift(tx: Prisma.TransactionClient, plan: AccountPlan): Promise<string[]> {
  return [
    findWriteDrift("user", plan.users.rows, await tx.user.findMany({ where: MIGRATED_USER }), "userId"),
    findWriteDrift("subscription", plan.subscriptions.rows, await tx.subscription.findMany({ where: { user: MIGRATED_USER } }), "subscriptionId"),
    findWriteDrift(
      "subscription_list_type",
      plan.listTypeSubscriptions.rows,
      await tx.subscriptionListType.findMany({ where: { user: MIGRATED_USER } }),
      "subscriptionListTypeId"
    ),
    findWriteDrift("legacy_third_party_user", plan.courtelUsers.rows, await tx.legacyThirdPartyUser.findMany(), "id"),
    findWriteDrift("legacy_third_party_subscription", plan.courtelSubscriptions.rows, await tx.legacyThirdPartySubscription.findMany(), "id"),
    findWriteDrift("third_party_user", plan.oauthUsers.rows, await tx.thirdPartyUser.findMany(), "id"),
    findWriteDrift("third_party_subscription", plan.oauthSubscriptions.rows, await tx.thirdPartySubscription.findMany(), "id"),
    findWriteDrift("media_application", plan.mediaApplications.rows, await tx.mediaApplication.findMany(), "id"),
    findWriteDrift("audit_log", plan.auditLogs.rows, await tx.auditLog.findMany(), "id"),
    findWriteDrift("user_archive", plan.archivedUsers.rows, await tx.userArchive.findMany(), "userId")
  ].filter((message) => message !== null);
}

export interface LegacySyncOptions {
  legacyAccountDatabaseUrl: string;
  isDryRun: boolean;
  maxDropRatio: number;
}

interface LocalUser {
  userId: string;
  userProvenanceId: string;
}

interface ReferenceData {
  listTypeIdByName: Map<string, number>;
  locationIds: Set<string>;
}

type AccountPlan = Awaited<ReturnType<typeof buildAccountPlan>>;

type TableName = keyof AccountPlan["readCounts"];
