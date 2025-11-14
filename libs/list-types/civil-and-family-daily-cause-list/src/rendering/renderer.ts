import { getLocationById } from "@hmcts/location";
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

function formatAddress(address: CauseListData["venue"]["venueAddress"]): string[] {
  const parts = [...address.line];
  parts.push(address.postCode);
  return parts;
}

function formatJudiciaries(session: Session): string {
  const judiciaries: string[] = [];

  session.judiciary?.forEach((judiciary) => {
    const name = judiciary.johKnownAs?.trim();
    if (name) {
      if (judiciary.isPresiding) {
        judiciaries.unshift(name);
      } else {
        judiciaries.push(name);
      }
    }
  });

  return judiciaries.join(", ");
}

function calculateDuration(sitting: Sitting): void {
  if (!sitting.sittingStart || !sitting.sittingEnd) {
    (sitting as any).duration = "";
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
  (sitting as any).time = formatTime(sitting.sittingStart);
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

function convertPartyRole(role: string): string {
  const roleMap: Record<string, string> = {
    APPLICANT_PETITIONER: "APPLICANT_PETITIONER",
    "APPLICANT/PETITIONER": "APPLICANT_PETITIONER",
    APPLICANT_PETITIONER_REPRESENTATIVE: "APPLICANT_PETITIONER_REPRESENTATIVE",
    "APPLICANT/PETITIONER REPRESENTATIVE": "APPLICANT_PETITIONER_REPRESENTATIVE",
    RESPONDENT: "RESPONDENT",
    RESPONDENT_REPRESENTATIVE: "RESPONDENT_REPRESENTATIVE"
  };

  return roleMap[role] || role;
}

function createPartyDetails(party: Party): string {
  if (party.individualDetails) {
    const details = party.individualDetails;
    const parts: string[] = [];

    if (details.title) parts.push(details.title);
    if (details.individualForenames) parts.push(details.individualForenames);
    if (details.individualMiddleName) parts.push(details.individualMiddleName);
    if (details.individualSurname) parts.push(details.individualSurname);

    return parts.filter((n) => n.length > 0).join(" ");
  }

  if (party.organisationDetails?.organisationName) {
    return party.organisationDetails.organisationName;
  }

  return "";
}

function processParties(caseItem: CauseListCase): void {
  let applicant = "";
  let respondent = "";
  let applicantRepresentative = "";
  let respondentRepresentative = "";

  caseItem.party?.forEach((party) => {
    const role = convertPartyRole(party.partyRole);
    const details = createPartyDetails(party).trim();

    if (!details) return;

    switch (role) {
      case "APPLICANT_PETITIONER":
        if (applicant.length > 0) applicant += ", ";
        applicant += details;
        break;
      case "APPLICANT_PETITIONER_REPRESENTATIVE":
        if (applicantRepresentative.length > 0) applicantRepresentative += ", ";
        applicantRepresentative += details;
        break;
      case "RESPONDENT":
        if (respondent.length > 0) respondent += ", ";
        respondent += details;
        break;
      case "RESPONDENT_REPRESENTATIVE":
        if (respondentRepresentative.length > 0) respondentRepresentative += ", ";
        respondentRepresentative += details;
        break;
    }
  });

  (caseItem as any).applicant = applicant.replace(/,\s*$/, "").trim();
  (caseItem as any).applicantRepresentative = applicantRepresentative.replace(/,\s*$/, "").trim();
  (caseItem as any).respondent = respondent.replace(/,\s*$/, "").trim();
  (caseItem as any).respondentRepresentative = respondentRepresentative.replace(/,\s*$/, "").trim();
}

function formatReportingRestrictions(caseItem: CauseListCase): void {
  const restrictions = caseItem.reportingRestrictionDetail?.filter((r) => r.length > 0) || [];
  (caseItem as any).formattedReportingRestriction = restrictions.join(", ");
}

export function renderCauseListData(jsonData: CauseListData, options: RenderOptions) {
  const location = getLocationById(Number.parseInt(options.locationId, 10));
  const locationName = options.locale === "cy" && location?.welshName ? location.welshName : location?.name || jsonData.venue.venueName;

  const header = {
    locationName: locationName,
    addressLines: formatAddress(jsonData.venue.venueAddress),
    contentDate: formatContentDate(options.contentDate, options.locale),
    lastUpdated: formatPublicationDateTime(jsonData.document.publicationDate, options.locale)
  };

  const openJustice = {
    venueName: jsonData.venue.venueName,
    email: jsonData.venue.venueContact?.venueEmail || "",
    phone: jsonData.venue.venueContact?.venueTelephone || ""
  };

  // Manipulate the data by adding computed fields
  for (const courtList of jsonData.courtLists) {
    for (const courtRoom of courtList.courtHouse.courtRoom) {
      for (const session of courtRoom.session) {
        // Add formatted judiciaries to session
        (session as any).formattedJudiciaries = formatJudiciaries(session);

        for (const sitting of session.sittings) {
          // Calculate duration and format time
          calculateDuration(sitting);

          // Add hearing channel
          formatHearingChannel(sitting, session);

          for (const hearing of sitting.hearing) {
            for (const caseItem of hearing.case) {
              // Process party information
              processParties(caseItem);

              // Format reporting restrictions
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
