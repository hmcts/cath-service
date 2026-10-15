import type { DomainTransform, Rejection } from "../sync/sync-report.js";
import { resolveListTypeId } from "../sync/value-mapping.js";
import type { LegacyListSearchConfig } from "./legacy-publication-source.js";

// list_search_config field names are varchar(100) here and varchar(255) in legacy.
const MAX_FIELD_NAME_LENGTH = 100;

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
    // Legacy accepts a config with either field; the extractor here skips a blank one.
    const caseNumberFieldName = legacy.case_number_field_name?.trim() ?? "";
    const caseNameFieldName = legacy.case_name_field_name?.trim() ?? "";

    if (listTypeId === undefined) {
      rejections.push({ entityId: legacy.id, reason: `unknown list type ${legacy.list_type}` });
    } else if (!caseNumberFieldName && !caseNameFieldName) {
      rejections.push({ entityId: legacy.id, reason: "missing case number and case name field names" });
    } else if (caseNumberFieldName.length > MAX_FIELD_NAME_LENGTH || caseNameFieldName.length > MAX_FIELD_NAME_LENGTH) {
      rejections.push({ entityId: legacy.id, reason: `field name longer than ${MAX_FIELD_NAME_LENGTH} characters` });
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
