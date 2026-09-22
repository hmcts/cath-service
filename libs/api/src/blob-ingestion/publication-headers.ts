import type { IncomingHttpHeaders } from "node:http";
import { ArtefactType, Language, Sensitivity } from "@hmcts/publication";
import type { ValidationError } from "./repository/model.js";

const HEADER = {
  provenance: "x-provenance",
  courtId: "x-court-id",
  locationId: "x-location-id",
  contentDate: "x-content-date",
  listType: "x-list-type",
  language: "x-language",
  type: "x-type",
  sensitivity: "x-sensitivity",
  displayFrom: "x-display-from",
  displayTo: "x-display-to",
  sourceArtefactId: "x-source-artefact-id"
} as const;

/**
 * Converts the inbound `x-*` headers into validated publication metadata. This is the only
 * module that knows the wire header names — nothing downstream reads the request.
 *
 * Database-backed checks (list type existence, location resolution) deliberately stay in
 * validation.ts so the LCSU path can reuse them without duplicating queries.
 */
export function parsePublicationHeaders(headers: IncomingHttpHeaders): ParsedPublicationHeaders {
  const errors: ValidationError[] = [];

  const provenance = readHeader(headers, HEADER.provenance);
  // The spec declares x-court-id but its supersede prose says x-location-id; accept either,
  // with x-court-id winning when both are sent.
  const courtId = readHeader(headers, HEADER.courtId) ?? readHeader(headers, HEADER.locationId);
  const contentDate = readHeader(headers, HEADER.contentDate);
  const listType = readHeader(headers, HEADER.listType);
  const language = readHeader(headers, HEADER.language);
  const rawType = readHeader(headers, HEADER.type);
  const sensitivity = readHeader(headers, HEADER.sensitivity);
  const displayFrom = readHeader(headers, HEADER.displayFrom);
  const displayTo = readHeader(headers, HEADER.displayTo);
  const sourceArtefactId = readHeader(headers, HEADER.sourceArtefactId);

  requirePresent(errors, HEADER.provenance, provenance);
  requirePresent(errors, HEADER.courtId, courtId);
  requirePresent(errors, HEADER.contentDate, contentDate);
  requirePresent(errors, HEADER.language, language);
  requirePresent(errors, HEADER.type, rawType);

  // The spec marks x-list-type required but notes "Only set when x-type is set to 'LIST'", and
  // the incumbent's own functional test uploads LCSU without it. Requiring it for LCSU would
  // reject every real PDDA HTML upload.
  if (rawType !== ArtefactType.LCSU) {
    requirePresent(errors, HEADER.listType, listType);
  }

  if (contentDate && !isValidISODate(contentDate)) {
    errors.push({ field: HEADER.contentDate, message: `${HEADER.contentDate} must be a valid ISO 8601 date or date-time` });
  }

  if (language && !isEnumValue(Language, language)) {
    errors.push({ field: HEADER.language, message: `${HEADER.language} must be one of ${Object.values(Language).join(", ")}` });
  }

  if (sensitivity && !isEnumValue(Sensitivity, sensitivity)) {
    errors.push({ field: HEADER.sensitivity, message: `${HEADER.sensitivity} must be one of ${Object.values(Sensitivity).join(", ")}` });
  }

  // Case-sensitive, matching the incumbent's Java enum resolution. An unknown value is
  // rejected rather than silently defaulting to LIST.
  if (rawType && !isEnumValue(ArtefactType, rawType)) {
    errors.push({ field: HEADER.type, message: `${HEADER.type} must be one of ${Object.values(ArtefactType).join(", ")}` });
  }

  if (displayFrom && !isValidISODateTime(displayFrom)) {
    errors.push({ field: HEADER.displayFrom, message: `${HEADER.displayFrom} must be a valid ISO 8601 date-time` });
  }

  if (displayTo && !isValidISODateTime(displayTo)) {
    errors.push({ field: HEADER.displayTo, message: `${HEADER.displayTo} must be a valid ISO 8601 date-time` });
  }

  if (errors.length > 0) {
    return { errors };
  }

  return {
    errors,
    metadata: {
      provenance: provenance as string,
      courtId: courtId as string,
      contentDate: contentDate as string,
      listType: listType ?? null,
      language: language as string,
      type: rawType as ArtefactType,
      sensitivity: sensitivity ?? Sensitivity.PUBLIC,
      displayFrom: displayFrom ?? null,
      displayTo: displayTo ?? null,
      sourceArtefactId: sourceArtefactId ?? null
    }
  };
}

function readHeader(headers: IncomingHttpHeaders, name: string): string | undefined {
  const raw = headers[name];
  const value = Array.isArray(raw) ? raw[0] : raw;
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed === "" ? undefined : trimmed;
}

function requirePresent(errors: ValidationError[], field: string, value: string | undefined) {
  if (!value) {
    errors.push({ field, message: `${field} is required` });
  }
}

function isEnumValue(enumObject: Record<string, string>, value: string): boolean {
  return Object.values(enumObject).includes(value);
}

function isValidISODate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}/.test(value) && !Number.isNaN(new Date(value).getTime());
}

function isValidISODateTime(value: string): boolean {
  return value.includes("T") && !Number.isNaN(new Date(value).getTime());
}

export interface PublicationMetadata {
  provenance: string;
  courtId: string;
  contentDate: string;
  listType: string | null;
  language: string;
  type: ArtefactType;
  sensitivity: string;
  displayFrom: string | null;
  displayTo: string | null;
  sourceArtefactId: string | null;
}

export interface ParsedPublicationHeaders {
  metadata?: PublicationMetadata;
  errors: ValidationError[];
}
