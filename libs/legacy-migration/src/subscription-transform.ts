import type { LegacySubscription } from "./legacy-account-source.js";
import type { DomainTransform, Rejection } from "./sync-report.js";
import { mapSearchType } from "./value-mapping.js";

export function transformSubscriptions(legacySubscriptions: LegacySubscription[], context: SubscriptionContext): DomainTransform<MigratedSubscription> {
  const rejections: Rejection[] = [];
  const seenKeys = new Set<string>();
  const rows: MigratedSubscription[] = [];

  // Oldest first so that when two legacy rows collapse onto one key (CASE_ID and CASE_URN
  // for the same value), the original subscription is the one kept.
  const ordered = [...legacySubscriptions].sort((a, b) => (a.created_date?.getTime() ?? 0) - (b.created_date?.getTime() ?? 0));

  for (const legacy of ordered) {
    const result = transformSubscription(legacy, context);
    if (!result.ok) {
      rejections.push({ entityId: legacy.id, reason: result.reason });
    } else if (seenKeys.has(naturalKey(result.subscription))) {
      rejections.push({ entityId: legacy.id, reason: "duplicate of an older subscription after search type mapping" });
    } else {
      seenKeys.add(naturalKey(result.subscription));
      rows.push(result.subscription);
    }
  }

  return { rows, rejections };
}

function transformSubscription(legacy: LegacySubscription, context: SubscriptionContext): TransformResult {
  if (legacy.channel === "API_COURTEL") {
    return { ok: false, reason: "API_COURTEL subscription belongs to a legacy third party" };
  }

  if (!context.migratedUserIds.has(legacy.user_id)) {
    return { ok: false, reason: "user not migrated" };
  }

  const searchType = mapSearchType(legacy.search_type);
  if (!searchType) {
    return { ok: false, reason: `unmapped search type ${legacy.search_type}` };
  }

  if (searchType === "LOCATION_ID" && !context.locationIds.has(legacy.search_value)) {
    return { ok: false, reason: `unknown location ${legacy.search_value}` };
  }

  return {
    ok: true,
    subscription: {
      subscriptionId: legacy.id,
      userId: legacy.user_id,
      searchType,
      searchValue: legacy.search_value,
      caseName: legacy.case_name,
      caseNumber: searchType === "CASE_NUMBER" ? (legacy.case_number ?? legacy.search_value) : legacy.case_number,
      dateAdded: legacy.created_date ?? new Date(0)
    }
  };
}

// Mirrors the unique_user_subscription constraint.
function naturalKey(subscription: MigratedSubscription): string {
  return `${subscription.userId}|${subscription.searchType}|${subscription.searchValue}`;
}

export interface MigratedSubscription {
  subscriptionId: string;
  userId: string;
  searchType: string;
  searchValue: string;
  caseName: string | null;
  caseNumber: string | null;
  dateAdded: Date;
}

export interface SubscriptionContext {
  migratedUserIds: Set<string>;
  locationIds: Set<string>;
}

type TransformResult = { ok: true; subscription: MigratedSubscription } | { ok: false; reason: string };
