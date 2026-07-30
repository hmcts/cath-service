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
import type { CauseListData, RenderOptions } from "../models/types.js";

export async function renderEtDailyList(jsonData: CauseListData, options: RenderOptions) {
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

  for (const courtList of jsonData.courtLists) {
    for (const courtRoom of courtList.courtHouse.courtRoom) {
      for (const session of courtRoom.session) {
        for (const sitting of session.sittings) {
          if (sitting.sittingStart) {
            (sitting as any).time = formatTime(sitting.sittingStart);
          }
          const { durationAsHours, durationAsMinutes } = calculateSittingDuration(sitting);
          (sitting as any).durationAsHours = durationAsHours;
          (sitting as any).durationAsMinutes = durationAsMinutes;
          (sitting as any).caseHearingChannel = resolveHearingChannel(sitting, session);

          for (const hearing of sitting.hearing) {
            for (const caseItem of hearing.case) {
              (caseItem as any).applicant = extractEtParty(caseItem, "APPLICANT_PETITIONER");
              (caseItem as any).respondent = extractEtParty(caseItem, "RESPONDENT");
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
