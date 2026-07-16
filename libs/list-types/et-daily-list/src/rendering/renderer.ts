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

function calculateDuration(sitting: Sitting): void {
  if (sitting.sittingStart) {
    (sitting as any).time = formatTime(sitting.sittingStart);
  }

  if (!sitting.sittingStart || !sitting.sittingEnd) {
    (sitting as any).durationAsHours = 0;
    (sitting as any).durationAsMinutes = 0;
    return;
  }

  const start = new Date(sitting.sittingStart);
  const end = new Date(sitting.sittingEnd);

  const totalMinutes = Math.round((end.getTime() - start.getTime()) / (1000 * 60));

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  (sitting as any).durationAsHours = hours;
  (sitting as any).durationAsMinutes = minutes;
}

function formatHearingChannel(sitting: Sitting, session: Session): void {
  let channel = "";

  if (sitting.channel && sitting.channel.length > 0) {
    channel = sitting.channel.join(", ");
  } else if (session.sessionChannel && session.sessionChannel.length > 0) {
    channel = session.sessionChannel.join(", ");
  }

  (sitting as any).caseHearingChannel = channel;
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

function processParties(caseItem: CauseListCase): void {
  let applicant = "";
  let respondent = "";

  for (const party of caseItem.party ?? []) {
    const name = createPartyName(party).trim();

    if (!name) continue;

    switch (party.partyRole) {
      case "APPLICANT_PETITIONER":
        if (applicant.length > 0) applicant += ", ";
        applicant += name;
        break;
      case "RESPONDENT":
        if (respondent.length > 0) respondent += ", ";
        respondent += name;
        break;
    }
  }

  (caseItem as any).applicant = applicant.replace(/,\s*$/, "").trim();
  (caseItem as any).respondent = respondent.replace(/,\s*$/, "").trim();
}

export async function renderEtDailyList(jsonData: CauseListData, options: RenderOptions) {
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

  for (const courtList of jsonData.courtLists) {
    for (const courtRoom of courtList.courtHouse.courtRoom) {
      for (const session of courtRoom.session) {
        for (const sitting of session.sittings) {
          calculateDuration(sitting);
          formatHearingChannel(sitting, session);

          for (const hearing of sitting.hearing) {
            for (const caseItem of hearing.case) {
              processParties(caseItem);
            }
          }
        }
      }
    }
  }

  return {
    header,
    openJustice,
    listData: jsonData
  };
}
