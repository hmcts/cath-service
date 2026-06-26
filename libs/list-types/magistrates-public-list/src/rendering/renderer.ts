import { getLocationById } from "@hmcts/location";
import { DateTime } from "luxon";
import type { MagistratesCase, MagistratesListData, Party, RenderOptions, Session, Sitting } from "../models/types.js";

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
    day: "2-digit",
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

function formatAddress(address: MagistratesListData["venue"]["venueAddress"]): string[] {
  const parts: string[] = [];

  for (const line of address.line) {
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
  if (!sitting.sittingStart || !sitting.sittingEnd) {
    sitting.duration = "";
    sitting.durationAsHours = 0;
    sitting.durationAsMinutes = 0;
    return;
  }

  const start = new Date(sitting.sittingStart);
  const end = new Date(sitting.sittingEnd);

  const totalMinutes = Math.round((end.getTime() - start.getTime()) / (1000 * 60));

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  sitting.durationAsHours = hours;
  sitting.durationAsMinutes = minutes;
  sitting.time = formatTime(sitting.sittingStart);
}

function formatHearingChannel(sitting: Sitting, session: Session): void {
  let channel = "";

  if (sitting.channel && sitting.channel.length > 0) {
    channel = sitting.channel.join(", ");
  } else if (session.sessionChannel && session.sessionChannel.length > 0) {
    channel = session.sessionChannel.join(", ");
  }

  sitting.caseHearingChannel = channel;
}

function createPartyDetails(party: Party): string {
  if (party.individualDetails) {
    const details = party.individualDetails;
    const parts: string[] = [];

    if (details.title) parts.push(details.title);
    if (details.individualForenames) parts.push(details.individualForenames);
    if (details.individualMiddleName) parts.push(details.individualMiddleName);
    if (details.individualSurname) parts.push(details.individualSurname);

    return parts.join(" ");
  }

  if (party.organisationDetails?.organisationName) {
    return party.organisationDetails.organisationName;
  }

  return "";
}

function extractDefendantName(caseItem: MagistratesCase): void {
  let defendantName = "";

  for (const party of caseItem.party ?? []) {
    if (party.partyRole === "DEFENDANT" || party.partyRole === "ACCUSED") {
      const details = createPartyDetails(party).trim();
      if (details) {
        if (defendantName.length > 0) defendantName += ", ";
        defendantName += details;
      }
    }
  }

  caseItem.defendantName = defendantName.trim();
}

function formatReportingRestrictions(caseItem: MagistratesCase): void {
  const restrictions = caseItem.reportingRestrictionDetail?.filter((r: string) => r.length > 0) || [];
  caseItem.formattedReportingRestriction = restrictions.join(", ");
}

export async function renderMagistratesListData(jsonData: MagistratesListData, options: RenderOptions) {
  const location = await getLocationById(Number.parseInt(options.locationId, 10));
  const locationName = options.locale === "cy" && location?.welshName ? location.welshName : location?.name || jsonData.venue.venueName;

  const header = {
    locationName,
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
              extractDefendantName(caseItem);
              formatReportingRestrictions(caseItem);
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
