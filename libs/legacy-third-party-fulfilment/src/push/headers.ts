import { validateHeaderValue } from "node:http";
import type { LocationDetails } from "@hmcts/location";
import { prisma } from "@hmcts/postgres-prisma";

// Legacy sends the PDF as CaTH's own rendering, so it is attributed to CATH rather than the source system.
const PDF_PROVENANCE = "CATH";
const DEFAULT_SENSITIVITY = "PUBLIC";
// Legacy's Language enum spells bilingual with an underscore, where CaTH stores BILINGUAL.
const LANGUAGE_HEADER_VALUES: Record<string, string> = { BILINGUAL: "BI_LINGUAL" };

export async function buildPushHeaders(params: PushHeaderParams): Promise<Record<string, string>> {
  const { artefactId, sourceArtefactId, type, listTypeId, contentDate, sensitivity, language, displayFrom, displayTo, provenance, location } = params;

  const listType = await prisma.listType.findUnique({ where: { id: listTypeId }, select: { name: true } });
  const listTypeName = listType?.name ?? String(listTypeId);

  return {
    "x-provenance": provenance,
    "x-source-artefact-id": toSourceArtefactIdHeader(artefactId, sourceArtefactId),
    "x-type": type,
    "x-list-type": listTypeName,
    "x-content-date": toLocalDateTimeString(contentDate),
    "x-sensitivity": sensitivity || DEFAULT_SENSITIVITY,
    "x-language": LANGUAGE_HEADER_VALUES[language] ?? language,
    // CaTH accepts publications without display dates, so these are omitted rather than sent empty.
    ...(displayFrom ? { "x-display-from": toLocalDateTimeString(displayFrom) } : {}),
    ...(displayTo ? { "x-display-to": toLocalDateTimeString(displayTo) } : {}),
    "x-location-name": location?.name ?? "",
    "x-location-jurisdiction": joinDistinct(location?.subJurisdictions?.map((subJurisdiction) => subJurisdiction.jurisdictionName) ?? []),
    "x-location-region": (location?.regions ?? []).map((region) => region.name).join(",")
  };
}

export function buildPdfPushHeaders(headers: Record<string, string>): Record<string, string> {
  return { ...headers, "x-provenance": PDF_PROVENANCE };
}

// sourceArtefactId is optional on API ingestion, and Courtel needs a non-empty identifier and file name.
export function resolveSourceArtefactId(artefactId: string, sourceArtefactId: string | null): string {
  return sourceArtefactId || artefactId;
}

// CaTH's manual upload stores the file name as given, so it can hold characters (e.g. ŵ, ’) that Node refuses
// in a header. Sending it would throw and the whole push would fail, so the artefactId is used instead.
// Legacy never met this because its upload sent the name as a header and failed first.
function toSourceArtefactIdHeader(artefactId: string, sourceArtefactId: string | null): string {
  const value = resolveSourceArtefactId(artefactId, sourceArtefactId);
  try {
    validateHeaderValue("x-source-artefact-id", value);
    return value;
  } catch {
    return artefactId;
  }
}

// Matches Java's LocalDateTime.toString(), which legacy sends: seconds and milliseconds appear only when non-zero.
// UTC getters are used so the output does not depend on the server's time zone.
function toLocalDateTimeString(date: Date): string {
  const dateTime = `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}T${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
  const seconds = date.getUTCSeconds();
  const milliseconds = date.getUTCMilliseconds();

  if (seconds === 0 && milliseconds === 0) return dateTime;
  if (milliseconds === 0) return `${dateTime}:${pad(seconds)}`;
  return `${dateTime}:${pad(seconds)}.${pad(milliseconds, 3)}`;
}

function pad(value: number, length = 2): string {
  return String(value).padStart(length, "0");
}

function joinDistinct(values: string[]): string {
  return [...new Set(values)].join(",");
}

export interface PushHeaderParams {
  artefactId: string;
  sourceArtefactId: string | null;
  type: string;
  listTypeId: number;
  contentDate: Date;
  sensitivity: string;
  language: string;
  displayFrom?: Date | null;
  displayTo?: Date | null;
  provenance: string;
  location?: LocationDetails | null;
}
