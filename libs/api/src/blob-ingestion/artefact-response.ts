import { ArtefactType, type CaseData, Language } from "@hmcts/publication";
import type { PublicationMetadata } from "./publication-headers.js";

// The spec's response enum spells bilingual with an underscore; our inbound enum does not.
const SPEC_LANGUAGE: Record<string, string> = {
  [Language.BILINGUAL]: "BI_LINGUAL"
};

export function toSpecLanguage(language: string): string {
  return SPEC_LANGUAGE[language] ?? language;
}

export function buildArtefactResponse(params: BuildArtefactResponseParams): ArtefactResponse {
  const { metadata, artefactId, isFlatFile, payload, cases, locationId } = params;

  const response: ArtefactResponse = {
    artefactId,
    contentDate: new Date(metadata.contentDate).toISOString(),
    // The persisted location id, which carries the "NoMatch" prefix when reference data had no
    // match. The incumbent returns the prefixed value too — its functional test asserts
    // getLocationId() *contains* the submitted court id rather than equalling it.
    courtId: locationId ?? metadata.courtId,
    displayFrom: metadata.displayFrom ? new Date(metadata.displayFrom).toISOString() : null,
    displayTo: metadata.displayTo ? new Date(metadata.displayTo).toISOString() : null,
    isFlatFile,
    language: toSpecLanguage(metadata.language),
    listType: metadata.listType,
    provenance: metadata.provenance,
    sensitivity: metadata.sensitivity,
    sourceArtefactId: metadata.sourceArtefactId,
    type: metadata.type
  };

  if (payload) {
    response.payload = payload;
  }

  // Flat files extract nothing, so `search` is omitted rather than sent empty.
  if (cases && cases.length > 0) {
    response.search = { cases };
  }

  return response;
}

/**
 * LCSU is a pass-through to S3 — nothing is persisted, so the artefact carries a blank
 * artefactId and no payload or search. `isFlatFile` is true because the incumbent builds the
 * LCSU metadata with the flat-file flag set (PublicationControllerTest#testUploadHtmlFile-
 * ToS3BucketSuccess and PublicationTest#testPublicationEndpointWithHtmlFileUploadToS3Bucket
 * both assert it), even though the file never reaches blob storage.
 */
export function buildLcsuArtefactResponse(metadata: PublicationMetadata): ArtefactResponse {
  return {
    artefactId: "",
    contentDate: new Date(metadata.contentDate).toISOString(),
    courtId: metadata.courtId,
    displayFrom: metadata.displayFrom ? new Date(metadata.displayFrom).toISOString() : null,
    displayTo: metadata.displayTo ? new Date(metadata.displayTo).toISOString() : null,
    isFlatFile: true,
    language: toSpecLanguage(metadata.language),
    listType: metadata.listType,
    provenance: metadata.provenance,
    sensitivity: metadata.sensitivity,
    sourceArtefactId: metadata.sourceArtefactId,
    type: ArtefactType.LCSU
  };
}

export function buildMessage(message: string): SpecMessage {
  return { message, timestamp: new Date().toISOString() };
}

export function joinValidationMessages(errors: { field: string; message: string }[]): string {
  return errors.map((error) => error.message).join("; ");
}

interface BuildArtefactResponseParams {
  metadata: PublicationMetadata;
  artefactId: string;
  isFlatFile: boolean;
  payload?: string;
  cases?: CaseData[];
  /** Persisted location id — may carry the "NoMatch" prefix. Falls back to the submitted court id. */
  locationId?: string;
}

export interface ArtefactResponse {
  artefactId: string;
  contentDate: string;
  courtId: string;
  displayFrom: string | null;
  displayTo: string | null;
  isFlatFile?: boolean;
  language: string;
  listType: string | null;
  payload?: string;
  provenance: string;
  search?: { cases: CaseData[] };
  sensitivity: string;
  sourceArtefactId: string | null;
  type: string;
}

export interface SpecMessage {
  message: string;
  timestamp: string;
}
