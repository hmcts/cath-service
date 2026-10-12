import type { LegacyApiOauthConfiguration, LegacyApiSubscription, LegacyApiUser } from "./legacy-account-source.js";
import type { DomainTransform, Rejection } from "./sync-report.js";
import { resolveListTypeId } from "./value-mapping.js";

const SENSITIVITIES = new Set(["PUBLIC", "PRIVATE", "CLASSIFIED"]);

// third_party_user has no status column, so anything migrated would look live.
export function transformOauthUsers(legacyUsers: LegacyApiUser[]): DomainTransform<MigratedOauthUser> {
  const rejections: Rejection[] = [];
  const rows: MigratedOauthUser[] = [];

  for (const legacy of legacyUsers) {
    const name = legacy.name?.trim();
    if (legacy.status !== "ACTIVE") {
      rejections.push({ entityId: legacy.user_id, reason: `status ${legacy.status} is not migrated` });
    } else if (!name) {
      rejections.push({ entityId: legacy.user_id, reason: "missing name" });
    } else {
      rows.push({ id: legacy.user_id, name, createdAt: legacy.created_date ?? new Date(0) });
    }
  }

  return { rows, rejections };
}

export function transformOauthSubscriptions(legacySubscriptions: LegacyApiSubscription[], context: OauthContext): DomainTransform<MigratedOauthSubscription> {
  const rejections: Rejection[] = [];
  const seenKeys = new Set<string>();
  const rows: MigratedOauthSubscription[] = [];

  for (const legacy of legacySubscriptions) {
    const listTypeId = legacy.list_type ? resolveListTypeId(legacy.list_type, context.listTypeIdByName) : undefined;
    const key = `${legacy.user_id}|${listTypeId}`;

    if (!context.oauthUserIds.has(legacy.user_id)) {
      rejections.push({ entityId: legacy.id, reason: "third party not migrated" });
    } else if (listTypeId === undefined) {
      rejections.push({ entityId: legacy.id, reason: `unknown list type ${legacy.list_type}` });
    } else if (!legacy.sensitivity || !SENSITIVITIES.has(legacy.sensitivity)) {
      rejections.push({ entityId: legacy.id, reason: `unsupported sensitivity ${legacy.sensitivity}` });
    } else if (seenKeys.has(key)) {
      // Legacy has no unique constraint here; this service does.
      rejections.push({ entityId: legacy.id, reason: "duplicate subscription for list type" });
    } else {
      seenKeys.add(key);
      rows.push({ id: legacy.id, thirdPartyUserId: legacy.user_id, listTypeId, sensitivity: legacy.sensitivity });
    }
  }

  return { rows, rejections };
}

export function transformOauthCredentials(legacyConfigurations: LegacyApiOauthConfiguration[], context: OauthContext): DomainTransform<OauthCredentialSource> {
  const rejections: Rejection[] = [];
  const rows: OauthCredentialSource[] = [];

  for (const legacy of legacyConfigurations.filter((configuration) => context.oauthUserIds.has(configuration.user_id))) {
    const { destination_url, token_url, client_id_key, client_secret_key, scope_key } = legacy;

    if (!destination_url || !token_url || !client_id_key || !client_secret_key || !scope_key) {
      rejections.push({ entityId: legacy.user_id, reason: "incomplete OAuth configuration" });
    } else {
      rows.push({
        userId: legacy.user_id,
        destinationUrl: destination_url,
        tokenUrl: token_url,
        legacySecretNames: { "client-id": client_id_key, "client-secret": client_secret_key, scope: scope_key }
      });
    }
  }

  return { rows, rejections };
}

export interface MigratedOauthUser {
  id: string;
  name: string;
  createdAt: Date;
}

export interface MigratedOauthSubscription {
  id: string;
  thirdPartyUserId: string;
  listTypeId: number;
  sensitivity: string;
}

export interface OauthCredentialSource {
  userId: string;
  destinationUrl: string;
  tokenUrl: string;
  legacySecretNames: Record<"client-id" | "client-secret" | "scope", string>;
}

export interface OauthContext {
  oauthUserIds: Set<string>;
  listTypeIdByName: Map<string, number>;
}
