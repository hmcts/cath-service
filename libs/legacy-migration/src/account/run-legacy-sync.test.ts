import { deleteBlob, uploadBlob } from "@hmcts/azure-blob";
import { prisma } from "@hmcts/postgres-prisma";
import { deleteSecrets, setSecret } from "@hmcts/third-party-user";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createLegacySecretReader } from "../key-vault/legacy-secret-source.js";
import { SyncAbortedError } from "../sync/sync-report.js";
import { type LegacyAccountData, readLegacyAccountData } from "./legacy-account-source.js";
import { runLegacySync } from "./run-legacy-sync.js";

const { tx, storage, secrets } = vi.hoisted(() => {
  const model = () => ({ count: vi.fn(), deleteMany: vi.fn(), createMany: vi.fn(), findMany: vi.fn() });
  return {
    tx: {
      user: model(),
      subscription: model(),
      subscriptionListType: model(),
      legacyThirdPartyUser: model(),
      legacyThirdPartySubscription: model(),
      thirdPartyUser: model(),
      thirdPartySubscription: model(),
      mediaApplication: model(),
      auditLog: model()
    },
    storage: { download: vi.fn(), exists: vi.fn() },
    secrets: { read: vi.fn() }
  };
});

vi.mock("@hmcts/postgres-prisma", () => ({
  prisma: {
    $transaction: vi.fn((callback: (client: typeof tx) => unknown) => callback(tx)),
    listType: { findMany: vi.fn() },
    location: { findMany: vi.fn() }
  }
}));

vi.mock("@hmcts/azure-blob", () => ({
  CONTAINER: { FILES: "files" },
  getContentType: vi.fn(() => "application/pdf"),
  uploadBlob: vi.fn(),
  deleteBlob: vi.fn()
}));

vi.mock("@hmcts/third-party-user", () => ({
  createKeyVaultSecretName: (userId: string, type: string) => `third-party-${userId}-${type}`,
  setSecret: vi.fn(),
  deleteSecrets: vi.fn()
}));

vi.mock("./legacy-account-source.js", () => ({ readLegacyAccountData: vi.fn() }));
vi.mock("../blob/legacy-storage-source.js", () => ({ createLegacyStorageReader: () => storage }));
vi.mock("../key-vault/legacy-secret-source.js", () => ({ createLegacySecretReader: vi.fn() }));

const USER_ID = "11111111-1111-1111-1111-111111111111";
const COURTEL_ID = "22222222-2222-2222-2222-222222222222";
const OAUTH_ID = "33333333-3333-3333-3333-333333333333";
const APPLICATION_ID = "44444444-4444-4444-4444-444444444444";
const OPTIONS = { legacyAccountDatabaseUrl: "postgres://legacy", maxDropRatio: 0.05 };

function buildLegacyData(): LegacyAccountData {
  const created = new Date("2024-01-01Z");
  return {
    users: [
      {
        user_id: USER_ID,
        user_provenance: "PI_AAD",
        provenance_user_id: "b2c-1",
        email: "jo@example.com",
        roles: "VERIFIED",
        forenames: "Jo",
        surname: "Bloggs",
        created_date: created,
        last_signed_in_date: null,
        last_verified_date: null
      },
      {
        user_id: COURTEL_ID,
        user_provenance: "THIRD_PARTY",
        provenance_user_id: "Courtel",
        email: "courtel@example.com",
        roles: "GENERAL_THIRD_PARTY",
        forenames: null,
        surname: null,
        created_date: created,
        last_signed_in_date: null,
        last_verified_date: null
      }
    ],
    subscriptions: [
      {
        id: "sub-1",
        user_id: USER_ID,
        search_type: "LOCATION_ID",
        search_value: "9",
        channel: "EMAIL",
        case_number: null,
        case_name: null,
        created_date: created
      },
      {
        id: "courtel-sub-1",
        user_id: COURTEL_ID,
        search_type: "LIST_TYPE",
        search_value: "CIVIL_DAILY_CAUSE_LIST",
        channel: "API_COURTEL",
        case_number: null,
        case_name: null,
        created_date: created
      }
    ],
    listTypeSubscriptions: [{ id: "lts-1", user_id: USER_ID, list_type: ["CIVIL_DAILY_CAUSE_LIST"], list_language: ["ENGLISH"] }],
    mediaApplications: [
      {
        id: APPLICATION_ID,
        full_name: "Jo Bloggs",
        email: "jo@example.com",
        employer: "News",
        image: "legacy-blob",
        image_name: "card.pdf",
        request_date: created
      }
    ],
    auditLogs: [
      {
        id: "audit-1",
        user_id: USER_ID,
        user_email: "admin@example.com",
        roles: "SYSTEM_ADMIN",
        user_provenance: "SSO",
        action: "MANAGE_USER",
        details: "x",
        timestamp: created
      }
    ],
    apiUsers: [{ user_id: OAUTH_ID, name: "Subscriber", status: "ACTIVE", created_date: created }],
    apiSubscriptions: [{ id: "api-sub-1", user_id: OAUTH_ID, list_type: "CIVIL_DAILY_CAUSE_LIST", sensitivity: "PUBLIC" }],
    apiOauthConfigurations: [
      {
        user_id: OAUTH_ID,
        destination_url: "https://dest",
        token_url: "https://token",
        client_id_key: "legacy-client-id",
        client_secret_key: "legacy-client-secret",
        scope_key: "legacy-scope"
      }
    ]
  };
}

function setExistingCounts(count: number) {
  for (const model of Object.values(tx)) {
    model.count.mockResolvedValue(count);
  }
}

function createManyIds(model: { createMany: ReturnType<typeof vi.fn> }, idField: string) {
  return model.createMany.mock.calls[0][0].data.map((row: Record<string, string>) => row[idField]);
}

describe("runLegacySync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(readLegacyAccountData).mockResolvedValue(buildLegacyData());
    vi.mocked(prisma.listType.findMany).mockResolvedValue([{ id: 901, name: "CIVIL_DAILY_CAUSE_LIST" }] as never);
    vi.mocked(prisma.location.findMany).mockResolvedValue([{ locationId: 9 }] as never);
    vi.mocked(createLegacySecretReader).mockReturnValue(secrets);
    setExistingCounts(1);
    for (const model of Object.values(tx)) {
      model.findMany.mockResolvedValue([]);
      // Rows read back as written, so the write check passes unless a test says otherwise.
      model.createMany.mockImplementation(async ({ data }: { data: unknown[] }) => {
        model.findMany.mockResolvedValue(data);
      });
    }
    storage.download.mockResolvedValue(Buffer.from("proof"));
    storage.exists.mockResolvedValue(true);
    secrets.read.mockImplementation(async (name: string) => `value-of-${name}`);
  });

  it("should replace every account table, deleting children before parents and inserting parents first", async () => {
    // Act
    await runLegacySync({ ...OPTIONS, isDryRun: false });

    // Assert
    const callOrder = (mock: ReturnType<typeof vi.fn>) => mock.mock.invocationCallOrder[0];
    expect(callOrder(tx.subscription.deleteMany)).toBeLessThan(callOrder(tx.user.deleteMany));
    expect(callOrder(tx.legacyThirdPartySubscription.deleteMany)).toBeLessThan(callOrder(tx.legacyThirdPartyUser.deleteMany));
    expect(callOrder(tx.thirdPartySubscription.deleteMany)).toBeLessThan(callOrder(tx.thirdPartyUser.deleteMany));
    expect(callOrder(tx.auditLog.deleteMany)).toBeLessThan(callOrder(tx.user.createMany));
    expect(callOrder(tx.user.createMany)).toBeLessThan(callOrder(tx.subscription.createMany));
    expect(callOrder(tx.legacyThirdPartyUser.createMany)).toBeLessThan(callOrder(tx.legacyThirdPartySubscription.createMany));
    expect(callOrder(tx.thirdPartyUser.createMany)).toBeLessThan(callOrder(tx.thirdPartySubscription.createMany));

    expect(createManyIds(tx.user, "userId")).toEqual([USER_ID]);
    expect(createManyIds(tx.subscription, "subscriptionId")).toEqual(["sub-1"]);
    expect(createManyIds(tx.legacyThirdPartyUser, "id")).toEqual([COURTEL_ID]);
    expect(tx.legacyThirdPartySubscription.createMany).toHaveBeenCalledWith({ data: [expect.objectContaining({ id: "courtel-sub-1", listTypeId: 901 })] });
    expect(createManyIds(tx.thirdPartyUser, "id")).toEqual([OAUTH_ID]);
    expect(tx.thirdPartySubscription.createMany).toHaveBeenCalledWith({ data: [expect.objectContaining({ id: "api-sub-1", sensitivity: "PUBLIC" })] });
    expect(tx.mediaApplication.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ id: APPLICATION_ID, proofOfIdPath: `${APPLICATION_ID}.pdf` })]
    });
    expect(createManyIds(tx.auditLog, "id")).toEqual(["audit-1"]);
  });

  it("should replace only migrated users and their subscriptions, keeping users created in this service", async () => {
    // Arrange
    const replacedUsers = { OR: [{ isLegacyMigrated: true }, { userId: { in: [] } }] };

    // Act
    await runLegacySync({ ...OPTIONS, isDryRun: false });

    // Assert
    expect(tx.user.deleteMany).toHaveBeenCalledWith({ where: replacedUsers });
    expect(tx.subscription.deleteMany).toHaveBeenCalledWith({ where: { user: replacedUsers } });
    expect(tx.subscriptionListType.deleteMany).toHaveBeenCalledWith({ where: { user: replacedUsers } });
    expect(tx.user.count).toHaveBeenCalledWith({ where: { isLegacyMigrated: true } });
    expect(tx.subscription.count).toHaveBeenCalledWith({ where: { user: { isLegacyMigrated: true } } });
    expect(tx.user.createMany).toHaveBeenCalledWith({ data: [expect.objectContaining({ userId: USER_ID, isLegacyMigrated: true })] });
  });

  it("should replace a local user who shares a provenance ID with a legacy user", async () => {
    // Arrange
    tx.user.findMany.mockResolvedValueOnce([
      { userId: "local-colliding", userProvenanceId: "b2c-1" },
      { userId: "local-tester", userProvenanceId: "tester-only" }
    ]);

    // Act
    await runLegacySync({ ...OPTIONS, isDryRun: false });

    // Assert
    expect(tx.user.deleteMany).toHaveBeenCalledWith({ where: { OR: [{ isLegacyMigrated: true }, { userId: { in: ["local-colliding"] } }] } });
  });

  it("should copy proof of ID files and OAuth secrets, and remove ones that are no longer in legacy", async () => {
    // Arrange
    tx.mediaApplication.findMany.mockResolvedValue([{ proofOfIdPath: "old-application.png" }, { proofOfIdPath: `${APPLICATION_ID}.pdf` }]);
    tx.thirdPartyUser.findMany.mockResolvedValue([{ id: "removed-subscriber" }, { id: OAUTH_ID }]);

    // Act
    const report = await runLegacySync({ ...OPTIONS, isDryRun: false });

    // Assert
    expect(uploadBlob).toHaveBeenCalledWith(`${APPLICATION_ID}.pdf`, Buffer.from("proof"), "application/pdf", "files");
    expect(deleteBlob).toHaveBeenCalledTimes(1);
    expect(deleteBlob).toHaveBeenCalledWith("old-application.png", "files");
    expect(setSecret).toHaveBeenCalledWith(`third-party-${OAUTH_ID}-client-secret`, "value-of-legacy-client-secret");
    expect(setSecret).toHaveBeenCalledWith(`third-party-${OAUTH_ID}-destination-url`, "https://dest");
    expect(setSecret).toHaveBeenCalledTimes(5);
    expect(deleteSecrets).toHaveBeenCalledTimes(1);
    expect(deleteSecrets).toHaveBeenCalledWith("removed-subscriber");
    expect(report.steps).toEqual([{ name: "third_party_secret", processed: 1, rejections: [] }]);
  });

  it("should report counts for every table without writing in a dry run", async () => {
    // Act
    const report = await runLegacySync({ ...OPTIONS, isDryRun: true });

    // Assert
    for (const model of Object.values(tx)) {
      expect(model.deleteMany).not.toHaveBeenCalled();
      expect(model.createMany).not.toHaveBeenCalled();
    }
    expect(uploadBlob).not.toHaveBeenCalled();
    expect(deleteBlob).not.toHaveBeenCalled();
    expect(setSecret).not.toHaveBeenCalled();
    expect(deleteSecrets).not.toHaveBeenCalled();
    expect(storage.exists).toHaveBeenCalledWith("files", "legacy-blob");
    expect(report.domains.map(({ entityType, loaded }) => [entityType, loaded])).toEqual([
      ["user", 1],
      ["subscription", 1],
      ["subscription_list_type", 1],
      ["legacy_third_party_user", 1],
      ["legacy_third_party_subscription", 1],
      ["third_party_user", 1],
      ["third_party_subscription", 1],
      ["media_application", 1],
      ["audit_log", 1]
    ]);
  });

  it("should reject a media application whose proof of ID is missing from legacy storage", async () => {
    // Arrange
    storage.download.mockResolvedValue(null);

    // Act
    const report = await runLegacySync({ ...OPTIONS, isDryRun: false });

    // Assert
    expect(tx.mediaApplication.createMany).toHaveBeenCalledWith({ data: [] });
    expect(report.domains.find(({ entityType }) => entityType === "media_application")?.rejections).toEqual([
      { entityId: APPLICATION_ID, reason: "proof of ID not found in legacy storage" }
    ]);
  });

  it("should skip the OAuth secret copy when no legacy vault is configured", async () => {
    // Arrange
    vi.mocked(createLegacySecretReader).mockReturnValue(undefined);

    // Act
    const report = await runLegacySync({ ...OPTIONS, isDryRun: false });

    // Assert
    expect(setSecret).not.toHaveBeenCalled();
    expect(report.steps[0].skipped).toBe("LEGACY_THIRD_PARTY_KEY_VAULT is not set");
  });

  it("should refuse to write anything when the legacy read would shrink a table too far", async () => {
    // Arrange
    vi.mocked(readLegacyAccountData).mockResolvedValue({ ...buildLegacyData(), users: [], subscriptions: [] });

    // Act & Assert
    await expect(runLegacySync({ ...OPTIONS, isDryRun: false })).rejects.toThrow("user: refusing to replace 1 rows with 0");
    expect(tx.user.deleteMany).not.toHaveBeenCalled();
    expect(deleteBlob).not.toHaveBeenCalled();
    expect(setSecret).not.toHaveBeenCalled();
  });

  it("should abort before copying files or secrets when a table does not hold what was written", async () => {
    // Arrange
    tx.subscription.createMany.mockImplementation(async () => {
      tx.subscription.findMany.mockResolvedValue([]);
    });

    // Act
    const run = runLegacySync({ ...OPTIONS, isDryRun: false });

    // Assert
    await expect(run).rejects.toThrow("subscription: written rows differ from the transformed legacy rows; 1 missing (sub-1)");
    expect(deleteBlob).not.toHaveBeenCalled();
    expect(setSecret).not.toHaveBeenCalled();
  });

  it("should carry the report built before the abort, so it can still be logged", async () => {
    // Arrange
    tx.subscription.createMany.mockImplementation(async () => {
      tx.subscription.findMany.mockResolvedValue([]);
    });

    // Act
    const error = await runLegacySync({ ...OPTIONS, isDryRun: false }).catch((caught: unknown) => caught);

    // Assert
    expect(error).toBeInstanceOf(SyncAbortedError);
    const { report } = error as SyncAbortedError;
    expect(report.isDryRun).toBe(false);
    expect(report.domains.map((domain) => domain.entityType)).toEqual([
      "user",
      "subscription",
      "subscription_list_type",
      "legacy_third_party_user",
      "legacy_third_party_subscription",
      "third_party_user",
      "third_party_subscription",
      "media_application",
      "audit_log"
    ]);
  });

  it("should report the guard violation instead of failing in a dry run", async () => {
    // Arrange
    vi.mocked(readLegacyAccountData).mockResolvedValue({ ...buildLegacyData(), users: [] });

    // Act
    const report = await runLegacySync({ ...OPTIONS, isDryRun: true });

    // Assert
    expect(report.domains[0].dropLimitViolation).toContain("user: refusing to replace 1 rows with 0");
    expect(tx.user.deleteMany).not.toHaveBeenCalled();
  });
});
