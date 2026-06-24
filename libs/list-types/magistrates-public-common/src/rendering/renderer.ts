import { extractParty } from "@hmcts/daily-cause-list-common";
import { getLocationById } from "@hmcts/location";
import { DateTime } from "luxon";
import type { MagistratesPublicListData, MagistratesSession } from "../models/types.js";

export interface MagistratesPublicRenderOptions {
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

function formatAddress(address: MagistratesPublicListData["venue"]["venueAddress"]): string[] {
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

export async function renderMagistratesPublicList(jsonData: MagistratesPublicListData, options: MagistratesPublicRenderOptions) {
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
        (session as { formattedJudiciaries?: string }).formattedJudiciaries = formatJudiciaries(session);
        for (const sitting of session.sittings) {
          (sitting as { time?: string }).time = sitting.sittingStart ? formatTime(sitting.sittingStart) : "";
          for (const hearing of sitting.hearing) {
            for (const caseItem of hearing.case) {
              (caseItem as { defendant?: string }).defendant = extractParty(caseItem, "DEFENDANT");
              const restrictions = caseItem.reportingRestrictionDetail?.filter((r: string) => r.length > 0) || [];
              (caseItem as { formattedReportingRestriction?: string }).formattedReportingRestriction = restrictions.join(", ");
            }
          }
        }
      }
    }
  }

  return { header, openJustice, listData: jsonData };
}
