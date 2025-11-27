import { mockListTypes, validateListTypeJson } from "@hmcts/list-types-common";
import { getLocationById } from "@hmcts/location";
import { Language, Sensitivity } from "@hmcts/publication";
import type { BlobIngestionRequest, BlobValidationResult, ValidationError } from "./repository/model.js";

const MAX_BLOB_SIZE = 10 * 1024 * 1024; // 10MB default
const ALLOWED_PROVENANCES = ["XHIBIT", "MANUAL_UPLOAD", "SNL", "COMMON_PLATFORM"];

export async function validateBlobRequest(request: BlobIngestionRequest, rawBodySize: number): Promise<BlobValidationResult> {
  const errors: ValidationError[] = [];

  // Size validation
  if (rawBodySize > MAX_BLOB_SIZE) {
    errors.push({
      field: "body",
      message: `Payload too large. Maximum size is ${MAX_BLOB_SIZE / 1024 / 1024}MB`
    });
  }

  // Required fields
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

  // Map list type name to ID for internal validation
  let listTypeId: string | undefined;
  if (request.list_type) {
    const listType = mockListTypes.find((lt) => lt.name === request.list_type);
    if (!listType) {
      errors.push({
        field: "list_type",
        message: `Invalid list type. Allowed values: ${mockListTypes.map((lt) => lt.name).join(", ")}`
      });
    } else {
      listTypeId = listType.id.toString();
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

  // Date comparison validation
  if (request.display_from && request.display_to) {
    const fromDate = new Date(request.display_from);
    const toDate = new Date(request.display_to);
    if (toDate < fromDate) {
      errors.push({
        field: "display_to",
        message: "display_to must be after display_from"
      });
    }
  }

  if (!request.hearing_list) {
    errors.push({ field: "hearing_list", message: "hearing_list is required" });
  }

  // Location validation - check if location exists in master reference data
  let locationExists = false;
  if (request.court_id) {
    const locationId = Number.parseInt(request.court_id, 10);
    if (Number.isNaN(locationId)) {
      errors.push({ field: "court_id", message: "court_id must be a valid number" });
    } else {
      const location = getLocationById(locationId);
      locationExists = !!location;
      // Note: We don't add an error if location doesn't exist
      // This is handled by setting no_match=true
    }
  }

  // JSON schema validation for hearing_list
  if (listTypeId && request.hearing_list && errors.length === 0) {
    try {
      const validationResult = await validateListTypeJson(listTypeId, request.hearing_list, mockListTypes);

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
    isValid: errors.length === 0,
    errors,
    locationExists,
    listTypeId: listTypeId ? Number.parseInt(listTypeId, 10) : undefined
  };
}

function isValidISODate(dateString: string): boolean {
  const date = new Date(dateString);
  return !Number.isNaN(date.getTime()) && /^\d{4}-\d{2}-\d{2}/.test(dateString);
}

function isValidISODateTime(dateString: string): boolean {
  const date = new Date(dateString);
  return !Number.isNaN(date.getTime()) && dateString.includes("T");
}
