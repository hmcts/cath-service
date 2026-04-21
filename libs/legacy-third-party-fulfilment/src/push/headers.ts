import { getListTypeName } from "@hmcts/list-types-common";
import type { LocationDetails } from "@hmcts/location";

export interface PushHeaderParams {
  artefactId: string;
  listTypeId: number;
  contentDate: Date;
  sensitivity: string;
  language: string;
  displayFrom: Date;
  displayTo: Date;
  provenance: string;
  location?: LocationDetails | null;
}

export function buildPushHeaders(params: PushHeaderParams): Record<string, string> {
  const { artefactId, listTypeId, contentDate, sensitivity, language, displayFrom, displayTo, provenance, location } = params;

  const listTypeName = getListTypeName(listTypeId) ?? String(listTypeId);

  return {
    "x-provenance": provenance,
    "x-source-artefact-id": artefactId,
    "x-type": listTypeName,
    "x-list-type": listTypeName,
    "x-content-date": contentDate.toISOString(),
    "x-sensitivity": sensitivity,
    "x-language": language,
    "x-display-from": displayFrom.toISOString(),
    "x-display-to": displayTo.toISOString(),
    "x-location-name": location?.name ?? "",
    "x-location-jurisdiction": location?.subJurisdictions?.[0]?.jurisdictionName ?? "",
    "x-location-region": location?.regions?.[0]?.name ?? ""
  };
}
