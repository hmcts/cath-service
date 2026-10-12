import type { LegacySubscription, LegacyUser } from "./legacy-account-source.js";
import type { DomainTransform, Rejection } from "./sync-report.js";
import { resolveListTypeId } from "./value-mapping.js";

// Legacy's pre-OAuth third parties are pi_user rows with THIRD_PARTY provenance whose
// subscriptions use the API_COURTEL channel. This service's Courtel push reads the
// legacy_third_party_* tables, so that is where they go.
export function transformCourtelUsers(legacyUsers: LegacyUser[]): DomainTransform<MigratedCourtelUser> {
  const rows = legacyUsers
    .filter((user) => user.user_provenance === "THIRD_PARTY")
    .map((user) => ({ id: user.user_id, name: user.provenance_user_id, createdDate: user.created_date ?? new Date(0) }));

  return { rows, rejections: [] };
}

export function transformCourtelSubscriptions(
  legacySubscriptions: LegacySubscription[],
  context: CourtelContext
): DomainTransform<MigratedCourtelSubscription> {
  const rejections: Rejection[] = [];
  const seenKeys = new Set<string>();
  const rows: MigratedCourtelSubscription[] = [];

  for (const legacy of legacySubscriptions.filter((subscription) => subscription.channel === "API_COURTEL")) {
    const listTypeId = resolveListTypeId(legacy.search_value, context.listTypeIdByName);

    if (!context.courtelUserIds.has(legacy.user_id)) {
      rejections.push({ entityId: legacy.id, reason: "Courtel subscription for a user that is not a legacy third party" });
    } else if (legacy.search_type !== "LIST_TYPE") {
      rejections.push({ entityId: legacy.id, reason: `Courtel subscription by ${legacy.search_type} is not supported` });
    } else if (listTypeId === undefined) {
      rejections.push({ entityId: legacy.id, reason: `unknown list type ${legacy.search_value}` });
    } else if (seenKeys.has(`${legacy.user_id}|${listTypeId}`)) {
      rejections.push({ entityId: legacy.id, reason: "duplicate Courtel subscription for list type" });
    } else {
      seenKeys.add(`${legacy.user_id}|${listTypeId}`);
      rows.push({ id: legacy.id, userId: legacy.user_id, listTypeId, createdDate: legacy.created_date ?? new Date(0) });
    }
  }

  return { rows, rejections };
}

export interface MigratedCourtelUser {
  id: string;
  name: string;
  createdDate: Date;
}

export interface MigratedCourtelSubscription {
  id: string;
  userId: string;
  listTypeId: number;
  createdDate: Date;
}

export interface CourtelContext {
  courtelUserIds: Set<string>;
  listTypeIdByName: Map<string, number>;
}
