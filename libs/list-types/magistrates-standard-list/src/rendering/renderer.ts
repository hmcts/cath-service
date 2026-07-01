import { getLocationById } from "@hmcts/location";
import type {
  Application,
  Case,
  CourtList,
  IndividualDetails,
  Judiciary,
  MagistratesStandardList,
  OrganisationDetails,
  Party,
  RenderedCourtRoom,
  RenderedHearing,
  RenderedMagistratesStandardListHeader,
  RenderedOffence,
  RenderedPartyInfo,
  RenderedSitting,
  Sitting
} from "../models/types.js";

export interface RenderOptions {
  locale: string;
  locationId: string;
  contentDate: Date;
}

export interface RenderedMagistratesStandardListData {
  header: RenderedMagistratesStandardListHeader;
  listData: RenderedCourtRoom[];
}

export async function renderMagistratesStandardListData(
  jsonData: MagistratesStandardList,
  options: RenderOptions
): Promise<RenderedMagistratesStandardListData> {
  const header = await buildHeader(jsonData, options);
  const listData = processCourtLists(jsonData.courtLists, options.locale);
  return { header, listData };
}

async function buildHeader(jsonData: MagistratesStandardList, options: RenderOptions): Promise<RenderedMagistratesStandardListHeader> {
  const pubDateTime = jsonData.document.publicationDate;
  const { date: publishedDate, time: publishedTime } = formatDateAndTime(pubDateTime, options.locale);
  const location = await getLocationById(Number.parseInt(options.locationId, 10));
  const locationName = options.locale === "cy" && location?.welshName ? location.welshName : (location?.name ?? "");
  return {
    locationName,
    contentDate: formatDate(options.contentDate, options.locale),
    publishedDate,
    publishedTime,
    venueAddress: formatAddressLines(jsonData.venue?.venueAddress)
  };
}

function processCourtLists(courtLists: CourtList[], locale: string): RenderedCourtRoom[] {
  const result: RenderedCourtRoom[] = [];

  for (const courtList of courtLists) {
    const { courtHouse } = courtList;
    for (const courtRoom of courtHouse.courtRoom) {
      for (const session of courtRoom.session) {
        const sittings: RenderedSitting[] = [];
        for (const sitting of session.sittings) {
          processSitting(sitting, sittings, locale);
        }

        if (sittings.length === 0) continue;

        const courtRoomName = formatCourtRoomWithJudiciary(courtRoom.courtRoomName, session.judiciary ?? []);
        const courtHouseName = courtHouse.courtHouseName ?? "";
        const existingIndex = result.findIndex((r) => r.courtRoomName === courtRoomName && r.courtHouseName === courtHouseName);

        if (existingIndex === -1) {
          result.push({
            courtHouseName,
            courtRoomName,
            lja: courtHouse.lja ?? "",
            sittings
          });
        } else {
          result[existingIndex].sittings.push(...sittings);
        }
      }
    }
  }

  return result;
}

function processSitting(sitting: Sitting, sittings: RenderedSitting[], locale: string): void {
  const sittingStartTime = formatSittingTime(sitting.sittingStart);

  for (const hearing of sitting.hearing) {
    const attendanceMethod = (hearing.channel ?? []).filter(Boolean).join(", ");
    const hearingType = hearing.hearingType ?? "";
    const panel = hearing.panel ?? "";

    for (const caseItem of hearing.case ?? []) {
      const baseHearingInfo = buildCaseHearingInfo(caseItem, sittingStartTime, attendanceMethod, hearingType, panel);
      for (const party of caseItem.party ?? []) {
        if (party.partyRole === "DEFENDANT") {
          addHearingToSittings(sittings, baseHearingInfo, party, locale);
        }
      }
    }

    for (const application of hearing.application ?? []) {
      const baseHearingInfo = buildApplicationHearingInfo(application, sittingStartTime, attendanceMethod, hearingType, panel);
      for (const party of application.party ?? []) {
        if (party.subject === true) {
          addHearingToSittings(sittings, baseHearingInfo, party, locale);
        }
      }
    }
  }
}

function buildCaseHearingInfo(caseItem: Case, sittingStartTime: string, attendanceMethod: string, hearingType: string, panel: string) {
  return {
    sittingStartTime,
    prosecutingAuthority: findProsecutingAuthority(caseItem.party ?? []),
    attendanceMethod,
    reference: caseItem.caseUrn ?? "",
    applicationType: "",
    caseSequenceIndicator: caseItem.caseSequenceIndicator ?? "",
    hearingType,
    panel,
    applicationParticulars: "",
    reportingRestriction: caseItem.reportingRestriction ?? false,
    reportingRestrictionDetails: formatReportingRestrictionDetails(caseItem.reportingRestrictionDetails)
  };
}

function buildApplicationHearingInfo(application: Application, sittingStartTime: string, attendanceMethod: string, hearingType: string, panel: string) {
  return {
    sittingStartTime,
    prosecutingAuthority: findProsecutingAuthority(application.party ?? []),
    attendanceMethod,
    reference: application.applicationReference ?? "",
    applicationType: application.applicationType ?? "",
    caseSequenceIndicator: "",
    hearingType,
    panel,
    applicationParticulars: application.applicationParticulars ?? "",
    reportingRestriction: application.reportingRestriction ?? false,
    reportingRestrictionDetails: formatReportingRestrictionDetails(application.reportingRestrictionDetails)
  };
}

function addHearingToSittings(sittings: RenderedSitting[], hearingInfo: ReturnType<typeof buildCaseHearingInfo>, party: Party, locale: string): void {
  const sittingHeading = buildSittingHeading(hearingInfo.sittingStartTime, hearingInfo.caseSequenceIndicator);
  const partyInfo = buildPartyInfo(party, locale);
  const offences = processOffences(party, locale);

  const hearing: RenderedHearing = { ...hearingInfo, partyInfo, offences };

  const existingSitting = sittings.find((s) => s.sittingHeading === sittingHeading);
  if (existingSitting) {
    existingSitting.hearings.push(hearing);
  } else {
    sittings.push({ sittingHeading, hearings: [hearing] });
  }
}

function buildSittingHeading(sittingStartTime: string, caseSequenceIndicator: string): string {
  if (!sittingStartTime) return "";
  return caseSequenceIndicator ? `${sittingStartTime} [${caseSequenceIndicator}]` : sittingStartTime;
}

function buildPartyInfo(party: Party, locale: string): RenderedPartyInfo {
  if (party.organisationDetails) {
    return buildOrganisationPartyInfo(party.organisationDetails);
  }
  if (party.individualDetails) {
    return buildIndividualPartyInfo(party.individualDetails, locale);
  }
  return { name: "", dob: "", age: "", address: "", asn: "", pncId: "" };
}

function buildIndividualPartyInfo(details: IndividualDetails, _locale: string): RenderedPartyInfo {
  return {
    name: formatIndividualName(details),
    dob: details.dateOfBirth ? formatDateFromIso(details.dateOfBirth) : "",
    age: details.age !== undefined ? String(details.age) : "",
    address: formatAddress(details.address),
    asn: details.asn ?? "",
    pncId: details.pncId ?? ""
  };
}

function buildOrganisationPartyInfo(details: OrganisationDetails): RenderedPartyInfo {
  return {
    name: details.organisationName,
    dob: "",
    age: "",
    address: formatAddress(details.organisationAddress),
    asn: "",
    pncId: ""
  };
}

function formatIndividualName(details: IndividualDetails): string {
  const nameParts = [details.individualSurname, [details.individualForenames, details.individualMiddleName].filter(Boolean).join(" ")]
    .filter(Boolean)
    .join(", ");
  const gender = details.gender ? ` (${details.gender})` : "";
  const custody = details.inCustody ? "*" : "";
  return nameParts + gender + custody;
}

function findProsecutingAuthority(parties: Party[]): string {
  const authority = parties.find((p) => p.partyRole === "PROSECUTING_AUTHORITY" && p.organisationDetails);
  return authority?.organisationDetails?.organisationName ?? "";
}

function processOffences(party: Party, _locale: string): RenderedOffence[] {
  return (party.offence ?? []).map((offence) => ({
    offenceCode: offence.offenceCode ?? "",
    offenceTitle: offence.offenceTitle ?? "",
    offenceWording: offence.offenceWording ?? "",
    plea: offence.plea ?? "",
    pleaDate: offence.pleaDate ? formatDateFromIso(offence.pleaDate) : "",
    convictionDate: offence.convictionDate ? formatDateFromIso(offence.convictionDate) : "",
    adjournedDate: offence.adjournedDate ? formatDateFromIso(offence.adjournedDate) : "",
    offenceLegislation: offence.offenceLegislation ?? "",
    offenceMaxPenalty: offence.offenceMaxPen ?? "",
    reportingRestriction: offence.reportingRestriction ?? false,
    reportingRestrictionDetails: formatReportingRestrictionDetails(offence.reportingRestrictionDetails)
  }));
}

function formatCourtRoomWithJudiciary(courtRoomName: string, judiciary: Judiciary[]): string {
  const judiciaryNames = judiciary
    .filter((j) => j.johKnownAs)
    .map((j) => j.johKnownAs as string)
    .join(", ");
  return judiciaryNames ? `${courtRoomName}: ${judiciaryNames}` : courtRoomName;
}

function formatReportingRestrictionDetails(details?: string[]): string {
  if (!details) return "";
  return details.filter((d) => d.length > 0).join(", ");
}

function formatAddressLines(address?: { line?: string[]; town?: string; county?: string; postCode?: string }): string[] {
  if (!address) return [];
  return [...(address.line ?? []), address.town, address.county, address.postCode].filter((p): p is string => Boolean(p));
}

function formatAddress(address?: { line?: string[]; town?: string; county?: string; postCode?: string }): string {
  if (!address) return "";
  return [...(address.line ?? []), address.town, address.county, address.postCode].filter(Boolean).join(", ");
}

function formatDate(date: Date, locale: string): string {
  return date.toLocaleDateString(locale === "cy" ? "cy-GB" : "en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "Europe/London"
  });
}

function formatDateAndTime(isoDateTime: string, locale: string): { date: string; time: string } {
  const date = new Date(isoDateTime);
  return {
    date: date.toLocaleDateString(locale === "cy" ? "cy-GB" : "en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      timeZone: "Europe/London"
    }),
    time: formatAmPmTime(date)
  };
}

function formatDateFromIso(isoDateTime: string): string {
  const date = new Date(isoDateTime);
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = String(date.getUTCFullYear());
  return `${day}/${month}/${year}`;
}

function formatSittingTime(isoDateTime: string): string {
  return formatAmPmTime(new Date(isoDateTime));
}

function formatAmPmTime(date: Date): string {
  const minutes = date.toLocaleString("en-GB", { minute: "numeric", timeZone: "Europe/London" });
  const options: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    hour12: true,
    timeZone: "Europe/London",
    ...(minutes !== "0" && { minute: "2-digit" })
  };
  const raw = date.toLocaleTimeString("en-GB", options);
  return raw.replace(/\s+(am|pm)$/i, (_, s) => s.toLowerCase());
}
