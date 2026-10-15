import { describe, expect, it } from "vitest";
import type { LegacyApiOauthConfiguration, LegacyApiSubscription } from "./legacy-account-source.js";
import { transformOauthCredentials, transformOauthSubscriptions, transformOauthUsers } from "./oauth-third-party-transform.js";

const OAUTH_ID = "33333333-3333-3333-3333-333333333333";
const CONTEXT = { oauthUserIds: new Set([OAUTH_ID]), listTypeIdByName: new Map([["CIVIL_DAILY_CAUSE_LIST", 901]]) };

function buildSubscription(overrides: Partial<LegacyApiSubscription> = {}): LegacyApiSubscription {
  return { id: "api-sub-1", user_id: OAUTH_ID, list_type: "CIVIL_DAILY_CAUSE_LIST", sensitivity: "CLASSIFIED", ...overrides };
}

function buildConfiguration(overrides: Partial<LegacyApiOauthConfiguration> = {}): LegacyApiOauthConfiguration {
  return {
    user_id: OAUTH_ID,
    destination_url: "https://dest",
    token_url: "https://token",
    client_id_key: "id-key",
    client_secret_key: "secret-key",
    scope_key: "scope-key",
    ...overrides
  };
}

describe("transformOauthUsers", () => {
  it("should migrate only active third parties, because the new model has no status", () => {
    // Arrange
    const legacy = [
      { user_id: OAUTH_ID, name: "Subscriber", status: "ACTIVE", created_date: null },
      { user_id: "pending", name: "Pending", status: "PENDING", created_date: null },
      { user_id: "suspended", name: "Suspended", status: "SUSPENDED", created_date: null }
    ];

    // Act
    const result = transformOauthUsers(legacy);

    // Assert
    expect(result.rows).toEqual([{ id: OAUTH_ID, name: "Subscriber", createdAt: new Date(0) }]);
    expect(result.rejections.map(({ reason }) => reason)).toEqual(["status PENDING is not migrated", "status SUSPENDED is not migrated"]);
  });
});

describe("transformOauthSubscriptions", () => {
  it("should resolve the list type by name and keep the sensitivity", () => {
    // Act
    const result = transformOauthSubscriptions([buildSubscription()], CONTEXT);

    // Assert
    expect(result.rows).toEqual([{ id: "api-sub-1", thirdPartyUserId: OAUTH_ID, listTypeId: 901, sensitivity: "CLASSIFIED" }]);
  });

  it("should reject unmigrated users, unknown list types, INTERNAL sensitivity and duplicates", () => {
    // Arrange
    const legacy = [
      buildSubscription(),
      buildSubscription({ id: "orphan", user_id: "pending" }),
      buildSubscription({ id: "unknown", list_type: "SJP_PRESS_REGISTER" }),
      buildSubscription({ id: "internal", sensitivity: "INTERNAL" }),
      buildSubscription({ id: "duplicate" })
    ];

    // Act
    const result = transformOauthSubscriptions(legacy, CONTEXT);

    // Assert
    expect(result.rows.map(({ id }) => id)).toEqual(["api-sub-1"]);
    expect(result.rejections).toEqual([
      { entityId: "orphan", reason: "third party not migrated" },
      { entityId: "unknown", reason: "unknown list type SJP_PRESS_REGISTER" },
      { entityId: "internal", reason: "unsupported sensitivity INTERNAL" },
      { entityId: "duplicate", reason: "duplicate subscription for list type" }
    ]);
  });
});

describe("transformOauthCredentials", () => {
  it("should carry the legacy secret names for migrated third parties only", () => {
    // Arrange
    const legacy = [buildConfiguration(), buildConfiguration({ user_id: "pending" })];

    // Act
    const result = transformOauthCredentials(legacy, CONTEXT);

    // Assert
    expect(result.rows).toEqual([
      {
        userId: OAUTH_ID,
        destinationUrl: "https://dest",
        tokenUrl: "https://token",
        legacySecretNames: { "client-id": "id-key", "client-secret": "secret-key", scope: "scope-key" }
      }
    ]);
  });

  it("should reject an incomplete OAuth configuration", () => {
    // Act
    const result = transformOauthCredentials([buildConfiguration({ scope_key: null })], CONTEXT);

    // Assert
    expect(result.rejections).toEqual([{ entityId: OAUTH_ID, reason: "incomplete OAuth configuration" }]);
  });
});
