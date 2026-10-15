import type { DomainTransform, Rejection } from "../sync/sync-report.js";
import { resolveListTypeId } from "../sync/value-mapping.js";
import type { LegacyArtefact } from "./legacy-publication-source.js";

// This service only renders lists; legacy JUDGEMENTS_AND_OUTCOMES, GENERAL_PUBLICATION and LCSU
// artefacts have no equivalent and are reported.
const ARTEFACT_TYPES = new Set(["LIST"]);
const LANGUAGE_MAP: Record<string, string> = { ENGLISH: "ENGLISH", WELSH: "WELSH", BI_LINGUAL: "BILINGUAL" };
// Legacy INTERNAL has no equivalent here.
const SENSITIVITIES = new Set(["PUBLIC", "PRIVATE", "CLASSIFIED"]);
const NO_MATCH_PREFIX = "NoMatch";

export function transformArtefacts(legacyArtefacts: LegacyArtefact[], context: ArtefactContext): DomainTransform<ArtefactLoad> {
  const rejections: Rejection[] = [];
  const rows: ArtefactLoad[] = [];

  for (const legacy of legacyArtefacts) {
    const result = transformArtefact(legacy, context);
    if (result.ok) {
      rows.push(result.load);
    } else {
      rejections.push({ entityId: legacy.artefact_id, reason: result.reason });
    }
  }

  return { rows, rejections };
}

function transformArtefact(legacy: LegacyArtefact, context: ArtefactContext): TransformResult {
  const listTypeId = legacy.list_type ? resolveListTypeId(legacy.list_type, context.listTypeIdByName) : undefined;
  const language = legacy.language ? LANGUAGE_MAP[legacy.language] : undefined;
  const payloadBlob = legacy.payload?.split("/").at(-1);
  const { location_id: locationId, content_date: contentDate, provenance, sensitivity, type } = legacy;

  if (listTypeId === undefined) return { ok: false, reason: `unknown list type ${legacy.list_type}` };
  if (!type || !ARTEFACT_TYPES.has(type)) return { ok: false, reason: `artefact type ${type} is not supported` };
  if (!sensitivity || !SENSITIVITIES.has(sensitivity)) return { ok: false, reason: `unsupported sensitivity ${sensitivity}` };
  if (!language) return { ok: false, reason: `unsupported language ${legacy.language}` };
  if (!locationId) return { ok: false, reason: "missing location" };
  if (!locationId.startsWith(NO_MATCH_PREFIX) && !context.locationIds.has(locationId)) {
    return { ok: false, reason: `unknown location ${locationId}` };
  }
  if (!contentDate || !provenance || !payloadBlob) return { ok: false, reason: "missing content date, provenance or payload" };

  return {
    ok: true,
    load: {
      artefact: {
        artefactId: legacy.artefact_id,
        type,
        locationId,
        listTypeId,
        contentDate: toDateOnly(contentDate),
        sensitivity,
        language,
        displayFrom: legacy.display_from,
        displayTo: legacy.display_to,
        lastReceivedDate: legacy.last_received_date ?? new Date(0),
        isFlatFile: legacy.is_flat_file ?? false,
        provenance,
        supersededCount: legacy.superseded_count ?? 0,
        sourceArtefactId: legacy.source_artefact_id
      },
      legacyPayloadBlob: payloadBlob
    }
  };
}

// content_date is a date column here but a timestamp in legacy. The legacy reader returns
// timestamps as UTC, so the UTC date is the date legacy stored.
function toDateOnly(timestamp: Date): Date {
  return new Date(Date.UTC(timestamp.getUTCFullYear(), timestamp.getUTCMonth(), timestamp.getUTCDate()));
}

export interface MigratedArtefact {
  artefactId: string;
  type: string;
  locationId: string;
  listTypeId: number;
  contentDate: Date;
  sensitivity: string;
  language: string;
  displayFrom: Date | null;
  displayTo: Date | null;
  lastReceivedDate: Date;
  isFlatFile: boolean;
  provenance: string;
  supersededCount: number;
  sourceArtefactId: string | null;
}

export interface ArtefactLoad {
  artefact: MigratedArtefact;
  legacyPayloadBlob: string;
}

export interface ArtefactContext {
  listTypeIdByName: Map<string, number>;
  locationIds: Set<string>;
}

type TransformResult = { ok: true; load: ArtefactLoad } | { ok: false; reason: string };
