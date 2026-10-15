import type { DomainTransform, Rejection } from "../sync/sync-report.js";
import { resolveListTypeId } from "../sync/value-mapping.js";
import type { LegacyListTypeSubscription } from "./legacy-account-source.js";

const LIST_LANGUAGES = new Set(["ENGLISH", "WELSH"]);

export function transformListTypeSubscriptions(
  legacyRows: LegacyListTypeSubscription[],
  context: ListTypeSubscriptionContext
): DomainTransform<MigratedListTypeSubscription> {
  const rejections: Rejection[] = [];
  const seenUserIds = new Set<string>();
  const rows: MigratedListTypeSubscription[] = [];

  for (const legacy of legacyRows) {
    const result = transformListTypeSubscription(legacy, context);
    rejections.push(...result.droppedNames.map((name) => ({ entityId: legacy.id, reason: `unknown list type ${name} dropped` })));

    if (!result.ok) {
      rejections.push({ entityId: legacy.id, reason: result.reason });
    } else if (seenUserIds.has(result.row.userId)) {
      // This service allows one row per user (user_id is unique).
      rejections.push({ entityId: legacy.id, reason: "duplicate list type subscription for user" });
    } else {
      seenUserIds.add(result.row.userId);
      rows.push(result.row);
    }
  }

  return { rows, rejections };
}

function transformListTypeSubscription(legacy: LegacyListTypeSubscription, context: ListTypeSubscriptionContext): TransformResult {
  const legacyNames = legacy.list_type ?? [];
  const resolved = legacyNames.map((name) => ({ name, id: resolveListTypeId(name, context.listTypeIdByName) }));
  const droppedNames = resolved.filter(({ id }) => id === undefined).map(({ name }) => name);
  // Two legacy names can map to one list type (e.g. CROWN_DAILY_LIST and CROWN_DAILY_PDDA_LIST).
  const listTypeIds = [...new Set(resolved.flatMap(({ id }) => (id === undefined ? [] : [id])))].sort((a, b) => a - b);
  const listLanguage = [...(legacy.list_language ?? [])].sort();

  if (!context.migratedUserIds.has(legacy.user_id)) {
    return { ok: false, reason: "user not migrated", droppedNames };
  }

  // Legacy delivers every list type at the user's locations for an empty array. Here that is a user
  // with no list type row, so the row is skipped. Legacy's language filter is lost with it.
  if (legacyNames.length === 0) {
    return { ok: false, reason: "empty list type filter is not migrated", droppedNames };
  }

  if (listTypeIds.length === 0) {
    return { ok: false, reason: "no list types could be mapped", droppedNames };
  }

  if (listLanguage.length === 0 || listLanguage.some((language) => !LIST_LANGUAGES.has(language))) {
    return { ok: false, reason: `unsupported list language ${listLanguage.join(",")}`, droppedNames };
  }

  return {
    ok: true,
    droppedNames,
    row: { subscriptionListTypeId: legacy.id, userId: legacy.user_id, listTypeIds, listLanguage }
  };
}

export interface MigratedListTypeSubscription {
  subscriptionListTypeId: string;
  userId: string;
  listTypeIds: number[];
  listLanguage: string[];
}

export interface ListTypeSubscriptionContext {
  migratedUserIds: Set<string>;
  // Resolved per environment at run time; list type ids differ between environments.
  listTypeIdByName: Map<string, number>;
}

type TransformResult = { ok: true; row: MigratedListTypeSubscription; droppedNames: string[] } | { ok: false; reason: string; droppedNames: string[] };
