import { getLocationWithDetails } from "@hmcts/location";
import { DateTime } from "luxon";
import type { CauseListCase, CauseListData, Party, RenderOptions, Session, Sitting } from "../models/types.js";

function formatTime(isoDateTime: string): string {
  const dt = DateTime.fromISO(isoDateTime).setZone("Europe/London");
  const hours = dt.hour;
  const minutes = dt.minute;
  const period = hours >= 12 ? "pm" : "am";
  const hour12 = hours % 12 || 12;
  const minuteStr = minutes > 0 ? `:${minutes.toString().padStart(2, "0")}` : "";
  return `${hour12}${minuteStr}${period}`;
}

function formatSittingDate(isoDateTime: string, locale: string): string {
  return DateTime.fromISO(isoDateTime)
    .setZone("Europe/London")
    .setLocale(locale === "cy" ? "cy" : "en")
    .toFormat("EEEE dd MMMM yyyy");
}

function formatContentDate(date: Date, locale: string): string {
  const localeCode = locale === "cy" ? "cy-GB" : "en-GB";
  return date.toLocaleDateString(localeCode, {
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

function formatPublicationDateTime(isoDateTime: string, locale: string): string {
  const dt = DateTime.fromISO(isoDateTime).setZone("Europe/London").setLocale(locale);

  const dateStr = dt.toFormat("d MMMM yyyy");

  const hours = dt.hour;
  const minutes = dt.minute;
  const period = hours >= 12 ? "pm" : "am";
  const hour12 = hours % 12 || 12;

  const minuteStr = minutes > 0 ? `:${minutes.toString().padStart(2, "0")}` : "";
  const timeStr = `${hour12}${minuteStr}${period}`;

  return `${dateStr} at ${timeStr}`;
}

function formatAddress(address: CauseListData["venue"]["venueAddress"]): string[] {
  const parts: string[] = [];

  if (!address) {
    return parts;
  }

  for (const line of address.line ?? []) {
    if (line && line.length > 0) {
      parts.push(line);
    }
  }

  if (address.town && address.town.length > 0) {
    parts.push(address.town);
  }

  if (address.county && address.county.length > 0) {
    parts.push(address.county);
  }

  if (address.postCode && address.postCode.length > 0) {
    parts.push(address.postCode);
  }

  return parts;
}

function calculateDuration(sitting: Sitting): { durationAsHours: number; durationAsMinutes: number } {
  if (!sitting.sittingStart || !sitting.sittingEnd) {
    return { durationAsHours: 0, durationAsMinutes: 0 };
  }

  const start = new Date(sitting.sittingStart);
  const end = new Date(sitting.sittingEnd);
  const totalMinutes = Math.round((end.getTime() - start.getTime()) / (1000 * 60));

  return {
    durationAsHours: Math.floor(totalMinutes / 60),
    durationAsMinutes: totalMinutes % 60
  };
}

function formatHearingChannel(sitting: Sitting, session: Session): string {
  if (sitting.channel && sitting.channel.length > 0) {
    return sitting.channel.join(", ");
  }
  if (session.sessionChannel && session.sessionChannel.length > 0) {
    return session.sessionChannel.join(", ");
  }
  return "";
}

// ET lists show party names as initials (e.g. "Mr J. Smith") rather than full forenames,
// mirroring pip-frontend's createIndividualDetails(..., initialised = true).
function createPartyName(party: Party): string {
  if (party.individualDetails) {
    const details = party.individualDetails;
    const title = details.title?.trim() ?? "";
    const forenameInitial = details.individualForenames?.trim().charAt(0) ?? "";
    const surname = details.individualSurname?.trim() ?? "";

    return `${title}${title.length > 0 ? " " : ""}${forenameInitial}${forenameInitial.length > 0 ? ". " : ""}${surname}`.trim();
  }

  if (party.organisationDetails?.organisationName) {
    return party.organisationDetails.organisationName;
  }

  return "";
}

function joinPartyNames(caseItem: CauseListCase, targetRole: string): string {
  const names: string[] = [];

  for (const party of caseItem.party ?? []) {
    if (party.partyRole !== targetRole) continue;
    const name = createPartyName(party).trim();
    if (name) names.push(name);
  }

  return names.join(", ");
}

export interface FortnightlyRow {
  sittingTime: string;
  durationAsHours: number;
  durationAsMinutes: number;
  caseNumber: string;
  caseSequenceIndicator: string;
  applicant: string;
  applicantRepresentative: string;
  respondent: string;
  respondentRepresentative: string;
  hearingType: string;
  hearingPlatform: string;
}

export interface FortnightlyDay {
  sittingDate: string;
  rows: FortnightlyRow[];
}

export interface FortnightlyCourt {
  courtName: string;
  addressLines: string[];
  days: FortnightlyDay[];
}

// Splits the reshaped ET data into courthouses, then into sitting days, mirroring
// pip-frontend's EtListsService.reshapeEtFortnightlyListData / dataSplitterEtList.
function splitByCourtAndDate(jsonData: CauseListData, locale: string): FortnightlyCourt[] {
  const courts: FortnightlyCourt[] = [];

  for (const courtList of jsonData.courtLists) {
    const courtHouse = courtList.courtHouse;
    const address = courtHouse.courtHouseAddress;
    const addressLines: string[] = [];
    for (const line of address?.line ?? []) {
      if (line && line.length > 0) addressLines.push(line);
    }
    if (address?.town) addressLines.push(address.town);
    if (address?.county) addressLines.push(address.county);
    if (address?.postCode) addressLines.push(address.postCode);

    let court = courts.find((c) => c.courtName === courtHouse.courtHouseName);
    if (!court) {
      court = { courtName: courtHouse.courtHouseName, addressLines, days: [] };
      courts.push(court);
    }

    for (const courtRoom of courtHouse.courtRoom) {
      for (const session of courtRoom.session) {
        for (const sitting of session.sittings) {
          const sittingDate = formatSittingDate(sitting.sittingStart, locale);
          const sittingTime = sitting.sittingStart ? formatTime(sitting.sittingStart) : "";
          const { durationAsHours, durationAsMinutes } = calculateDuration(sitting);
          const hearingPlatform = formatHearingChannel(sitting, session);

          let day = court.days.find((d) => d.sittingDate === sittingDate);
          if (!day) {
            day = { sittingDate, rows: [] };
            court.days.push(day);
          }

          for (const hearing of sitting.hearing) {
            for (const caseItem of hearing.case) {
              day.rows.push({
                sittingTime,
                durationAsHours,
                durationAsMinutes,
                caseNumber: caseItem.caseNumber ?? "",
                caseSequenceIndicator: caseItem.caseSequenceIndicator ?? "",
                applicant: joinPartyNames(caseItem, "APPLICANT_PETITIONER"),
                applicantRepresentative: joinPartyNames(caseItem, "APPLICANT_PETITIONER_REPRESENTATIVE"),
                respondent: joinPartyNames(caseItem, "RESPONDENT"),
                respondentRepresentative: joinPartyNames(caseItem, "RESPONDENT_REPRESENTATIVE"),
                hearingType: hearing.hearingType ?? "",
                hearingPlatform
              });
            }
          }
        }
      }
    }
  }

  return courts;
}

export async function renderEtFortnightlyList(jsonData: CauseListData, options: RenderOptions) {
  const location = await getLocationWithDetails(Number.parseInt(options.locationId, 10));
  const regionName = (location?.regions ?? [])
    .map((region) => (options.locale === "cy" && region.welshName ? region.welshName : region.name))
    .filter((name) => name && name.length > 0)
    .join(", ");

  const header = {
    regionName,
    addressLines: formatAddress(jsonData.venue.venueAddress),
    contentDate: formatContentDate(options.contentDate, options.locale),
    lastUpdated: formatPublicationDateTime(jsonData.document.publicationDate, options.locale)
  };

  const openJustice = {
    venueName: jsonData.venue.venueName,
    email: jsonData.venue.venueContact?.venueEmail || "",
    phone: jsonData.venue.venueContact?.venueTelephone || ""
  };

  const courts = splitByCourtAndDate(jsonData, options.locale);

  return {
    header,
    openJustice,
    courts
  };
}
