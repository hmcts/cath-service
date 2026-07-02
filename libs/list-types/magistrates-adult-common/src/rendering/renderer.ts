import { getLocationById } from "@hmcts/location";
import { DateTime } from "luxon";
import type { MagistratesAdultListData, MagistratesOffence, MagistratesParty, MagistratesSession } from "../models/types.js";

export interface MagistratesAdultRenderOptions {
  locationId: string;
  contentDate: Date;
  locale: string;
}

function formatTime(isoDateTime: string): string {
  const dt = DateTime.fromISO(isoDateTime).setZone("Europe/London");
  const period = dt.hour >= 12 ? "pm" : "am";
  const hour12 = dt.hour % 12 || 12;
  const minuteStr = dt.minute > 0 ? `:${dt.minute.toString().padStart(2, "0")}` : "";
  return `${hour12}${minuteStr}${period}`;
}

function formatContentDate(date: Date, locale: string): string {
  return date.toLocaleDateString(locale === "cy" ? "cy-GB" : "en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
}

function formatPublicationDateTime(isoDateTime: string, locale: string): string {
  const dt = DateTime.fromISO(isoDateTime).setZone("Europe/London").setLocale(locale);
  const period = dt.hour >= 12 ? "pm" : "am";
  const hour12 = dt.hour % 12 || 12;
  const minuteStr = dt.minute > 0 ? `:${dt.minute.toString().padStart(2, "0")}` : "";
  return `${dt.toFormat("d MMMM yyyy")} at ${hour12}${minuteStr}${period}`;
}

function formatVenueAddress(address: MagistratesAdultListData["venue"]["venueAddress"]): string[] {
  const parts: string[] = [];
  for (const line of address.line) {
    if (line && line.length > 0) parts.push(line);
  }
  if (address.town && address.town.length > 0) parts.push(address.town);
  if (address.county && address.county.length > 0) parts.push(address.county);
  if (address.postCode && address.postCode.length > 0) parts.push(address.postCode);
  return parts;
}

function formatJudiciaries(session: MagistratesSession): string {
  const judiciaries: string[] = [];
  for (const judiciary of session.judiciary ?? []) {
    const name = judiciary.johKnownAs?.trim();
    if (name) {
      if (judiciary.isPresiding) {
        judiciaries.unshift(name);
      } else {
        judiciaries.push(name);
      }
    }
  }
  return judiciaries.join(", ");
}

function formatDefendantName(party: MagistratesParty): string {
  const details = party.individualDetails;
  if (!details) return party.organisationDetails?.organisationName?.trim() || "";
  const parts = [details.individualForenames, details.individualMiddleName, details.individualSurname];
  return parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part && part.length > 0))
    .join(" ");
}

function formatDateOfBirth(isoDate: string | undefined, locale: string): string {
  if (!isoDate) return "";
  const dt = DateTime.fromISO(isoDate);
  if (!dt.isValid) return "";
  return dt.setLocale(locale === "cy" ? "cy" : "en").toFormat("dd MMMM yyyy");
}

function formatDefendantAddress(party: MagistratesParty): string {
  const address = party.individualDetails?.individualAddress;
  if (!address) return "";
  const parts: string[] = [];
  for (const line of address.line ?? []) {
    if (line && line.length > 0) parts.push(line);
  }
  if (address.town && address.town.length > 0) parts.push(address.town);
  if (address.county && address.county.length > 0) parts.push(address.county);
  if (address.postCode && address.postCode.length > 0) parts.push(address.postCode);
  return parts.join(", ");
}

function formatOffences(offences: MagistratesOffence[] | undefined) {
  return (offences ?? []).map((offence) => ({
    offenceCode: offence.offenceCode || "",
    offenceTitle: offence.offenceTitle || "",
    offenceSummary: offence.offenceWording || ""
  }));
}

export async function renderMagistratesAdultList(jsonData: MagistratesAdultListData, options: MagistratesAdultRenderOptions) {
  const location = await getLocationById(Number.parseInt(options.locationId, 10));
  const locationName = options.locale === "cy" && location?.welshName ? location.welshName : location?.name || jsonData.venue.venueName;

  const header = {
    locationName,
    addressLines: formatVenueAddress(jsonData.venue.venueAddress),
    contentDate: formatContentDate(options.contentDate, options.locale),
    lastUpdated: formatPublicationDateTime(jsonData.document.publicationDate, options.locale)
  };

  for (const courtList of jsonData.courtLists) {
    for (const courtRoom of courtList.courtHouse.courtRoom) {
      for (const session of courtRoom.session) {
        (session as { formattedJudiciaries?: string }).formattedJudiciaries = formatJudiciaries(session);
        for (const sitting of session.sittings) {
          (sitting as { blockStart?: string }).blockStart = sitting.sittingStart ? formatTime(sitting.sittingStart) : "";
          for (const hearing of sitting.hearing) {
            for (const caseItem of hearing.case) {
              const defendants = (caseItem.party ?? []).filter((party) => party.partyRole === "DEFENDANT");
              (caseItem as { defendants?: unknown[] }).defendants = defendants.map((party) => ({
                name: formatDefendantName(party),
                dateOfBirth: formatDateOfBirth(party.individualDetails?.dateOfBirth, options.locale),
                address: formatDefendantAddress(party),
                age: party.individualDetails?.age ?? "",
                offences: formatOffences(party.offence)
              }));
              const restrictions = caseItem.reportingRestrictionDetail?.filter((restriction) => restriction.length > 0) || [];
              (caseItem as { formattedReportingRestriction?: string }).formattedReportingRestriction = restrictions.join(", ");
            }
          }
        }
      }
    }
  }

  return { header, listData: jsonData };
}
