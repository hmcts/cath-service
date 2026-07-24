import {
  calculateSittingDuration,
  extractEtParty,
  formatAddress,
  formatContentDate,
  formatPublicationDateTime,
  formatTime,
  resolveHearingChannel,
  resolveRegionName
} from "@hmcts/et-list-common";
import { DateTime } from "luxon";
import type { CauseListData, RenderOptions } from "../models/types.js";

function formatSittingDate(isoDateTime: string, locale: string): string {
  return DateTime.fromISO(isoDateTime)
    .setZone("Europe/London")
    .setLocale(locale === "cy" ? "cy" : "en")
    .toFormat("EEEE dd MMMM yyyy");
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

    let court = courts.find((c) => c.courtName === courtHouse.courtHouseName);
    if (!court) {
      court = {
        courtName: courtHouse.courtHouseName,
        addressLines: formatAddress(courtHouse.courtHouseAddress),
        days: []
      };
      courts.push(court);
    }

    for (const courtRoom of courtHouse.courtRoom) {
      for (const session of courtRoom.session) {
        for (const sitting of session.sittings) {
          const sittingDate = formatSittingDate(sitting.sittingStart, locale);
          const sittingTime = sitting.sittingStart ? formatTime(sitting.sittingStart) : "";
          const { durationAsHours, durationAsMinutes } = calculateSittingDuration(sitting);
          const hearingPlatform = resolveHearingChannel(sitting, session);

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
                applicant: extractEtParty(caseItem, "APPLICANT_PETITIONER"),
                applicantRepresentative: extractEtParty(caseItem, "APPLICANT_PETITIONER_REPRESENTATIVE"),
                respondent: extractEtParty(caseItem, "RESPONDENT"),
                respondentRepresentative: extractEtParty(caseItem, "RESPONDENT_REPRESENTATIVE"),
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
  const regionName = await resolveRegionName(options.locationId, options.locale);

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
