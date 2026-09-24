import { validateListTypeJson } from "@hmcts/list-types-common";
import { getLocationById, getLocationByProvenanceLocationId } from "@hmcts/location";
import { buildNoMatchLocationId } from "@hmcts/publication";
import { findAllListTypes } from "@hmcts/system-admin-pages";
import type { PublicationMetadata } from "./publication-headers.js";
import type { BlobValidationResult, ValidationError } from "./repository/model.js";
import { formatSchemaError } from "./schema-error-message.js";

export const MAX_BLOB_SIZE = 100 * 1024 * 1024; // 100MB default
const ALLOWED_PROVENANCES = ["MANUAL_UPLOAD", "SNL", "COMMON_PLATFORM", "CP_CATH", "PDDA"];
const EXTERNAL_PROVENANCES = ["SNL", "COMMON_PLATFORM", "CP_CATH", "PDDA"];

/**
 * Semantic checks that need the database or cross-field rules. Presence, enum and date-format
 * checks for the `x-*` headers already happened in parsePublicationHeaders, so this never
 * re-reports a missing header. Errors are keyed by header name so the joined `Message` body
 * is meaningful to a publisher.
 */
export async function validatePublicationMetadata(metadata: PublicationMetadata, payloadSize: number): Promise<BlobValidationResult> {
  const errors: ValidationError[] = [];

  if (payloadSize > MAX_BLOB_SIZE) {
    errors.push({
      field: "body",
      message: `Payload too large. Maximum size is ${MAX_BLOB_SIZE / 1024 / 1024}MB`
    });
  }

  if (!ALLOWED_PROVENANCES.includes(metadata.provenance)) {
    errors.push({
      field: "x-provenance",
      message: `Invalid x-provenance. Allowed values: ${ALLOWED_PROVENANCES.join(", ")}`
    });
  }

  let listTypeId: number | undefined;
  let listTypeLocationType: string | undefined;

  // LCSU carries no x-list-type (see parsePublicationHeaders), so there is nothing to resolve.
  if (metadata.listType !== null) {
    const listTypes = await findAllListTypes();
    const listType = listTypes.find((lt) => lt.name === metadata.listType);

    if (!listType) {
      errors.push({
        field: "x-list-type",
        message: `Invalid x-list-type. Allowed values: ${listTypes.map((lt) => lt.name).join(", ")}`
      });
    } else {
      listTypeId = listType.id;
      listTypeLocationType = listType.locationType ?? undefined;
    }
  }

  // Only applies when both dates are supplied — either may be omitted.
  if (metadata.displayFrom && metadata.displayTo) {
    const fromDate = new Date(metadata.displayFrom);
    const toDate = new Date(metadata.displayTo);

    if (toDate < fromDate) {
      errors.push({
        field: "x-display-to",
        message: "x-display-to must be after x-display-from"
      });
    }
  }

  // An unresolvable court id is not an error — the publication is still accepted, with the
  // submitted id carried behind the "NoMatch" prefix so downstream code can tell it apart.
  let resolvedLocationId: string | undefined;

  if (EXTERNAL_PROVENANCES.includes(metadata.provenance)) {
    const location = await getLocationByProvenanceLocationId(metadata.provenance, metadata.courtId, listTypeLocationType);
    resolvedLocationId = location ? location.locationId.toString() : buildNoMatchLocationId(metadata.courtId);
  } else {
    const locationId = Number.parseInt(metadata.courtId, 10);
    if (Number.isNaN(locationId)) {
      errors.push({ field: "x-court-id", message: "x-court-id must be a valid number" });
    } else {
      const location = await getLocationById(locationId);
      resolvedLocationId = location ? locationId.toString() : buildNoMatchLocationId(metadata.courtId);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    listTypeId,
    resolvedLocationId
  };
}

/**
 * The JSON body *is* the publication payload — there is no metadata envelope and no
 * `hearing_list` wrapper.
 */
export async function validateBlobRequest(metadata: PublicationMetadata, payload: unknown, rawBodySize: number): Promise<BlobValidationResult> {
  const result = await validatePublicationMetadata(metadata, rawBodySize);
  const errors = [...result.errors];

  if (isEmptyPayload(payload)) {
    errors.push({ field: "body", message: "Request body is required and must be the publication payload" });
  }

  if (result.listTypeId && !isEmptyPayload(payload) && errors.length === 0) {
    const listTypes = await findAllListTypes();

    try {
      const listTypesInfo = listTypes.map((lt) => ({
        id: lt.id,
        name: lt.name,
        friendlyName: lt.friendlyName
      }));
      const validationResult = await validateListTypeJson(result.listTypeId.toString(), payload, listTypesInfo);

      if (!validationResult.isValid) {
        for (const error of validationResult.errors) {
          errors.push({ field: "body", message: formatSchemaError(error) });
        }
      }
    } catch (_error) {
      errors.push({
        field: "body",
        message: "Failed to validate the publication payload against the schema"
      });
    }
  }

  return {
    ...result,
    isValid: errors.length === 0,
    errors
  };
}

export async function validateFlatFileRequest(metadata: PublicationMetadata, fileSize: number): Promise<BlobValidationResult> {
  return validatePublicationMetadata(metadata, fileSize);
}

function isEmptyPayload(payload: unknown): boolean {
  if (payload === null || payload === undefined) {
    return true;
  }

  if (Array.isArray(payload)) {
    return payload.length === 0;
  }

  if (typeof payload === "object") {
    return Object.keys(payload).length === 0;
  }

  return false;
}
