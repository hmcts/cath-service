import { validateListTypeJson } from "@hmcts/list-types-common";
import { getLocationById, getLocationByProvenanceLocationId } from "@hmcts/location";
import { Language, Sensitivity } from "@hmcts/publication";
import { findAllListTypes } from "@hmcts/system-admin-pages";
import type { BlobIngestionRequest, BlobValidationResult, FlatFileIngestionRequest, ValidationError } from "./repository/model.js";

const MAX_BLOB_SIZE = 100 * 1024 * 1024; // 100MB default
const ALLOWED_PROVENANCES = ["MANUAL_UPLOAD", "SNL", "COMMON_PLATFORM", "CP_CATH", "PDDA"];
const EXTERNAL_PROVENANCES = ["SNL", "COMMON_PLATFORM", "CP_CATH", "PDDA"];

async function validateCommonFields(request: FlatFileIngestionRequest, payloadSize: number): Promise<BlobValidationResult> {
  const errors: ValidationError[] = [];

  if (payloadSize > MAX_BLOB_SIZE) {
    errors.push({
      field: "body",
      message: `Payload too large. Maximum size is ${MAX_BLOB_SIZE / 1024 / 1024}MB`
    });
  }

  if (!request.court_id) {
    errors.push({ field: "court_id", message: "court_id is required" });
  }

  if (!request.provenance) {
    errors.push({ field: "provenance", message: "provenance is required" });
  } else if (!ALLOWED_PROVENANCES.includes(request.provenance)) {
    errors.push({
      field: "provenance",
      message: `Invalid provenance. Allowed values: ${ALLOWED_PROVENANCES.join(", ")}`
    });
  }

  if (!request.content_date) {
    errors.push({ field: "content_date", message: "content_date is required" });
  } else if (!isValidISODate(request.content_date)) {
    errors.push({
      field: "content_date",
      message: "content_date must be a valid ISO 8601 date"
    });
  }

  if (!request.list_type) {
    errors.push({ field: "list_type", message: "list_type is required" });
  }

  let listTypeId: string | undefined;
  let listTypeLocationType: string | undefined;
  const listTypes = await findAllListTypes();
  if (request.list_type) {
    const listType = listTypes.find((lt) => lt.name === request.list_type);
    if (!listType) {
      errors.push({
        field: "list_type",
        message: `Invalid list type. Allowed values: ${listTypes.map((lt) => lt.name).join(", ")}`
      });
    } else {
      listTypeId = listType.id.toString();
      listTypeLocationType = listType.locationType ?? undefined;
    }
  }

  if (!request.sensitivity) {
    errors.push({ field: "sensitivity", message: "sensitivity is required" });
  } else if (!Object.values(Sensitivity).includes(request.sensitivity as Sensitivity)) {
    errors.push({
      field: "sensitivity",
      message: `Invalid sensitivity. Allowed values: ${Object.values(Sensitivity).join(", ")}`
    });
  }

  if (!request.language) {
    errors.push({ field: "language", message: "language is required" });
  } else if (!Object.values(Language).includes(request.language as Language)) {
    errors.push({
      field: "language",
      message: `Invalid language. Allowed values: ${Object.values(Language).join(", ")}`
    });
  }

  if (!request.display_from) {
    errors.push({ field: "display_from", message: "display_from is required" });
  } else if (!isValidISODateTime(request.display_from)) {
    errors.push({
      field: "display_from",
      message: "display_from must be a valid ISO 8601 datetime"
    });
  }

  if (!request.display_to) {
    errors.push({ field: "display_to", message: "display_to is required" });
  } else if (!isValidISODateTime(request.display_to)) {
    errors.push({
      field: "display_to",
      message: "display_to must be a valid ISO 8601 datetime"
    });
  }

  if (request.display_from && request.display_to) {
    const fromDate = new Date(request.display_from);
    const toDate = new Date(request.display_to);

    if (!Number.isNaN(fromDate.getTime()) && !Number.isNaN(toDate.getTime())) {
      if (toDate < fromDate) {
        errors.push({
          field: "display_to",
          message: "display_to must be after display_from"
        });
      }
    }
  }

  let locationExists = false;
  let resolvedLocationId: string | undefined;

  if (request.court_id) {
    if (EXTERNAL_PROVENANCES.includes(request.provenance)) {
      const location = await getLocationByProvenanceLocationId(request.provenance, request.court_id, listTypeLocationType);
      locationExists = !!location;
      if (location) {
        resolvedLocationId = location.locationId.toString();
      }
    } else {
      const locationId = Number.parseInt(request.court_id, 10);
      if (Number.isNaN(locationId)) {
        errors.push({ field: "court_id", message: "court_id must be a valid number" });
      } else {
        const location = await getLocationById(locationId);
        locationExists = !!location;
        if (location) {
          resolvedLocationId = locationId.toString();
        }
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    locationExists,
    listTypeId: listTypeId ? Number.parseInt(listTypeId, 10) : undefined,
    resolvedLocationId
  };
}

export async function validateBlobRequest(request: BlobIngestionRequest, rawBodySize: number): Promise<BlobValidationResult> {
  const result = await validateCommonFields(request, rawBodySize);
  const errors = [...result.errors];

  if (!request.hearing_list) {
    errors.push({ field: "hearing_list", message: "hearing_list is required" });
  }

  const listTypes = await findAllListTypes();
  const listTypeId = result.listTypeId;

  if (listTypeId && request.hearing_list && errors.length === 0) {
    try {
      const listTypesInfo = listTypes.map((lt) => ({
        id: lt.id,
        name: lt.name,
        friendlyName: lt.friendlyName
      }));
      const validationResult = await validateListTypeJson(listTypeId.toString(), request.hearing_list, listTypesInfo);

      if (!validationResult.isValid) {
        for (const error of validationResult.errors) {
          errors.push({
            field: "hearing_list",
            message: (error as { message?: string }).message || "Invalid hearing_list structure"
          });
        }
      }
    } catch (_error) {
      errors.push({
        field: "hearing_list",
        message: "Failed to validate hearing_list against schema"
      });
    }
  }

  return {
    ...result,
    isValid: errors.length === 0,
    errors
  };
}

export async function validateFlatFileRequest(request: FlatFileIngestionRequest, fileSize: number): Promise<BlobValidationResult> {
  return validateCommonFields(request, fileSize);
}

function isValidISODate(dateString: string): boolean {
  const date = new Date(dateString);
  return !Number.isNaN(date.getTime()) && /^\d{4}-\d{2}-\d{2}/.test(dateString);
}

function isValidISODateTime(dateString: string): boolean {
  const date = new Date(dateString);
  return !Number.isNaN(date.getTime()) && dateString.includes("T");
}
