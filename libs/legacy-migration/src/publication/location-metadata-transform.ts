import { validateLocationMetadataInput } from "@hmcts/location";
import type { DomainTransform, Rejection } from "../sync/sync-report.js";
import type { LegacyLocationMetadata } from "./legacy-publication-source.js";

export function transformLocationMetadata(legacyRows: LegacyLocationMetadata[], context: LocationMetadataContext): DomainTransform<MigratedLocationMetadata> {
  const rejections: Rejection[] = [];
  const rows: MigratedLocationMetadata[] = [];

  for (const legacy of legacyRows) {
    const messages = {
      cautionMessage: trimToNull(legacy.caution_message),
      welshCautionMessage: trimToNull(legacy.welsh_caution_message),
      noListMessage: trimToNull(legacy.no_list_message),
      welshNoListMessage: trimToNull(legacy.welsh_no_list_message)
    };

    if (legacy.location_id === null || !context.locationIds.has(String(legacy.location_id))) {
      rejections.push({ entityId: legacy.location_metadata_id, reason: `unknown location ${legacy.location_id}` });
      continue;
    }

    // Same rules as the admin page, so markup this service would drop is reported, not loaded.
    const validation = validateLocationMetadataInput({
      locationId: legacy.location_id,
      cautionMessage: messages.cautionMessage ?? undefined,
      welshCautionMessage: messages.welshCautionMessage ?? undefined,
      noListMessage: messages.noListMessage ?? undefined,
      welshNoListMessage: messages.welshNoListMessage ?? undefined
    });
    if (!validation.valid) {
      rejections.push({ entityId: legacy.location_metadata_id, reason: validation.error ?? "invalid location metadata" });
      continue;
    }

    rows.push({ locationMetadataId: legacy.location_metadata_id, locationId: legacy.location_id, ...messages });
  }

  return { rows, rejections };
}

// Matches the new writer, which stores blank messages as null.
function trimToNull(message: string | null): string | null {
  const trimmed = message?.trim();
  return trimmed ? trimmed : null;
}

export interface MigratedLocationMetadata {
  locationMetadataId: string;
  locationId: number;
  cautionMessage: string | null;
  welshCautionMessage: string | null;
  noListMessage: string | null;
  welshNoListMessage: string | null;
}

export interface LocationMetadataContext {
  locationIds: Set<string>;
}
