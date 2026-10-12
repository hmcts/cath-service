import { ArtefactType, Language } from "@hmcts/publication";
import type { PublicationMetadata } from "./publication-headers.js";

// The spec's response enum spells bilingual with an underscore; our inbound enum does not.
const SPEC_LANGUAGE: Record<string, string> = {
  [Language.BILINGUAL]: "BI_LINGUAL"
};

export function toSpecLanguage(language: string): string {
  return SPEC_LANGUAGE[language] ?? language;
}

export function buildArtefactResponse(params: BuildArtefactResponseParams): ArtefactResponse {
  const { metadata, artefactId, isFlatFile, payload, locationId } = params;

  const response: ArtefactResponse = {
    artefactId,
    contentDate: new Date(metadata.contentDate).toISOString(),
    displayFrom: metadata.displayFrom ? new Date(metadata.displayFrom).toISOString() : null,
    displayTo: metadata.displayTo ? new Date(metadata.displayTo).toISOString() : null,
    isFlatFile,
    language: toSpecLanguage(metadata.language),
    listType: metadata.listType,
    // The persisted location id, which carries the "NoMatch" prefix when reference data had no
    // match. The incumbent returns the prefixed value too — its functional test asserts
    // getLocationId() *contains* the submitted court id rather than equalling it.
    locationId: locationId ?? metadata.courtId,
    provenance: metadata.provenance,
    sensitivity: metadata.sensitivity,
    sourceArtefactId: metadata.sourceArtefactId,
    type: metadata.type
  };

  if (payload) {
    response.payload = payload;
  }

  return response;
}

/**
 * LCSU is a pass-through to S3 — nothing is persisted, so the artefact carries a blank
 * artefactId and a null payload. `isFlatFile` is true because the incumbent builds the
 * LCSU metadata with the flat-file flag set (PublicationControllerTest#testUploadHtmlFile-
 * ToS3BucketSuccess and PublicationTest#testPublicationEndpointWithHtmlFileUploadToS3Bucket
 * both assert it), even though the file never reaches blob storage.
 *
 * `payload` is present and null rather than absent: the incumbent's Artefact declares no
 * @JsonInclude, so Jackson's default applies and an unset field serialises as null.
 */
export function buildLcsuArtefactResponse(metadata: PublicationMetadata): ArtefactResponse {
  return {
    artefactId: "",
    contentDate: new Date(metadata.contentDate).toISOString(),
    displayFrom: metadata.displayFrom ? new Date(metadata.displayFrom).toISOString() : null,
    displayTo: metadata.displayTo ? new Date(metadata.displayTo).toISOString() : null,
    isFlatFile: true,
    language: toSpecLanguage(metadata.language),
    listType: metadata.listType,
    locationId: metadata.courtId,
    payload: null,
    provenance: metadata.provenance,
    sensitivity: metadata.sensitivity,
    sourceArtefactId: metadata.sourceArtefactId,
    type: ArtefactType.LCSU
  };
}

export function buildMessage(message: string): SpecMessage {
  return { message, timestamp: localDateTimeNow() };
}

/**
 * Formats the current time the way the incumbent's `Message.timestamp` appears on the wire.
 *
 * There it is a Java `LocalDateTime` set from `LocalDateTime.now()` and serialised by Jackson as
 * ISO local date-time: no offset and no trailing `Z`, and the local wall clock rather than UTC.
 * `Date.prototype.toISOString` gives neither, so the components are read locally and assembled.
 *
 * Fractional digits: Jackson emits as many as the value needs, in groups of three — so a JVM
 * reports nanoseconds (`.611289331`) only because its clock has that resolution. A JS `Date` is
 * millisecond-resolution, so three digits is the faithful equivalent, and is exactly what the
 * incumbent itself prints when the nanoseconds land on a millisecond boundary. Zero-padding to
 * nine would look more like a JVM sample without being any more accurate.
 */
function localDateTimeNow(now = new Date()): string {
  const pad = (value: number, width = 2) => String(value).padStart(width, "0");

  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  return `${date}T${time}.${pad(now.getMilliseconds(), 3)}`;
}

// The incumbent joins its payload-schema failures with ", " (ValidationService, which throws
// PayloadValidationException(String.join(", ", errors))). Header failures arrive here as a
// single-element array, so this is a no-op for them.
export function joinValidationMessages(errors: { field: string; message: string }[]): string {
  return errors.map((error) => error.message).join(", ");
}

interface BuildArtefactResponseParams {
  metadata: PublicationMetadata;
  artefactId: string;
  isFlatFile: boolean;
  payload?: string | null;
  /** Persisted location id — may carry the "NoMatch" prefix. Falls back to the submitted court id. */
  locationId?: string;
}

/**
 * Mirrors the incumbent's `Artefact` (ArtefactView.External) field-for-field. The pinned swagger
 * calls this field `courtId`, but the Java model declares `locationId` with no @JsonProperty
 * rename, so `locationId` is what actually goes on the wire — the swagger is stale here, the
 * same way it is for the x-court-id / x-location-id request header.
 *
 * lastReceivedDate, supersededCount and payloadSize are ArtefactView.Internal and so are
 * deliberately absent — a publisher never sees them.
 */
export interface ArtefactResponse {
  artefactId: string;
  contentDate: string;
  displayFrom: string | null;
  displayTo: string | null;
  isFlatFile?: boolean;
  language: string;
  listType: string | null;
  locationId: string;
  payload?: string | null;
  provenance: string;
  sensitivity: string;
  sourceArtefactId: string | null;
  type: string;
}

export interface SpecMessage {
  message: string;
  timestamp: string;
}
