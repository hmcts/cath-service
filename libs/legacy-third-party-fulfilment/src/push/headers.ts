import type { LocationDetails } from "@hmcts/location";
import { prisma } from "@hmcts/postgres-prisma";

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

function toDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function buildPushHeaders(params: PushHeaderParams): Promise<Record<string, string>> {
  const { artefactId, listTypeId, contentDate, sensitivity, language, displayFrom, displayTo, provenance, location } = params;

  const listType = await prisma.listType.findUnique({ where: { id: listTypeId }, select: { name: true } });
  const listTypeName = listType?.name ?? String(listTypeId);

  return {
    "x-provenance": provenance,
    "x-source-artefact-id": artefactId,
    "x-type": "LIST",
    "x-list-type": listTypeName,
    "x-content-date": toDateString(contentDate),
    "x-sensitivity": sensitivity,
    "x-language": language,
    "x-display-from": toDateString(displayFrom),
    "x-display-to": toDateString(displayTo),
    "x-location-name": location?.name ?? "",
    "x-location-jurisdiction": location?.subJurisdictions?.[0]?.jurisdictionName ?? "",
    "x-location-region": location?.regions?.[0]?.name ?? ""
  };
}
