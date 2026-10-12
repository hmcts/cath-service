import type { LegacyListSearchConfig } from "./legacy-publication-source.js";
import type { DomainTransform, Rejection } from "./sync-report.js";
import { resolveListTypeId } from "./value-mapping.js";

// Without these rows artefact_search is never populated, so migrated lists have no case search.
export function transformListSearchConfigs(
  legacyConfigs: LegacyListSearchConfig[],
  context: ListSearchConfigContext
): DomainTransform<MigratedListSearchConfig> {
  const rejections: Rejection[] = [];
  const seenListTypeIds = new Set<number>();
  const rows: MigratedListSearchConfig[] = [];

  for (const legacy of legacyConfigs) {
    const listTypeId = legacy.list_type ? resolveListTypeId(legacy.list_type, context.listTypeIdByName) : undefined;
    const caseNumberFieldName = legacy.case_number_field_name?.trim();
    const caseNameFieldName = legacy.case_name_field_name?.trim();

    if (listTypeId === undefined) {
      rejections.push({ entityId: legacy.id, reason: `unknown list type ${legacy.list_type}` });
    } else if (!caseNumberFieldName || !caseNameFieldName) {
      rejections.push({ entityId: legacy.id, reason: "missing case number or case name field name" });
    } else if (seenListTypeIds.has(listTypeId)) {
      // Two legacy names can map to one list type here, which allows one config per list type.
      rejections.push({ entityId: legacy.id, reason: "duplicate config for list type" });
    } else {
      seenListTypeIds.add(listTypeId);
      rows.push({ id: legacy.id, listTypeId, caseNumberFieldName, caseNameFieldName });
    }
  }

  return { rows, rejections };
}

export interface MigratedListSearchConfig {
  id: string;
  listTypeId: number;
  caseNumberFieldName: string;
  caseNameFieldName: string;
}

export interface ListSearchConfigContext {
  listTypeIdByName: Map<string, number>;
}
