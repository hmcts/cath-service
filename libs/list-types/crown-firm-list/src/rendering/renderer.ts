import { formatContentDate } from "@hmcts/list-types-common";
import { getLocationById } from "@hmcts/location";
import { DateTime } from "luxon";
import type {
  CitizenName,
  CrownFirmCaseRendered,
  CrownFirmDaySitting,
  CrownFirmGroupedDay,
  CrownFirmHearingRendered,
  CrownFirmListData,
  PddaDefendant,
  PddaJudiciary,
  RenderOptions
} from "../models/types.js";

export async function renderCrownFirmListData(jsonData: CrownFirmListData, options: RenderOptions) {
  const { FirmList } = jsonData;
  const location = await getLocationById(Number.parseInt(options.locationId, 10));
  const locationName = options.locale === "cy" && location?.welshName ? location.welshName : location?.name || FirmList.CrownCourt.CourtHouseName;

  const header = {
    locationName,
    addressLines: formatAddress(FirmList.CrownCourt),
    contentDate: formatContentDate(options.contentDate, options.locale),
    lastUpdated: formatLastPublished(FirmList.ListHeader.LastPublicationDate, options.locale)
  };

  const openJustice = {
    venueName: FirmList.CrownCourt.CourtHouseName,
    email: FirmList.CrownCourt.CourtHouseAddress?.CourtHouseAddressEmail || "",
    phone: FirmList.CrownCourt.CourtHouseAddress?.CourtHouseAddressPhone || ""
  };

  const groupedListData = buildGroupedListData(jsonData, options.locale);

  return { header, openJustice, listData: null, groupedListData };
}

function formatAddress(court: CrownFirmListData["FirmList"]["CrownCourt"]): string[] {
  const parts: string[] = [];
  const addr = court.CourtHouseAddress;
  if (!addr) return parts;
  for (const line of addr.CourtHouseAddressLine ?? []) {
    if (line) parts.push(line);
  }
  if (addr.CourtHouseAddressTown) parts.push(addr.CourtHouseAddressTown);
  if (addr.CourtHouseAddressCounty) parts.push(addr.CourtHouseAddressCounty);
  if (addr.CourtHouseAddressPostCode) parts.push(addr.CourtHouseAddressPostCode);
  return parts;
}

function formatLastPublished(dateStr: string | undefined, locale: string): string {
  if (!dateStr) return "";
  const dt = DateTime.fromISO(dateStr);
  if (!dt.isValid) return dateStr;
  const localeCode = locale === "cy" ? "cy-GB" : "en-GB";
  return dt.toJSDate().toLocaleDateString(localeCode, { day: "2-digit", month: "long", year: "numeric" });
}

function formatSittingDate(dateStr: string, locale: string): string {
  const localeCode = locale === "cy" ? "cy-GB" : "en-GB";
  const dt = DateTime.fromISO(dateStr);
  if (!dt.isValid) return dateStr;
  return dt.toJSDate().toLocaleDateString(localeCode, { day: "2-digit", month: "long", year: "numeric" });
}

function formatSittingTime(timeStr: string | undefined): string {
  if (!timeStr) return "";
  const parts = timeStr.split(":");
  if (parts.length < 2) return timeStr;
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return timeStr;
  const ampm = hours >= 12 ? "pm" : "am";
  const displayHours = hours % 12 || 12;
  if (minutes === 0) return `${displayHours}${ampm}`;
  return `${displayHours}:${String(minutes).padStart(2, "0")}${ampm}`;
}

function formatCitizenName(name: CitizenName): string {
  return [name.CitizenNameTitle, name.CitizenNameForename, name.CitizenNameSurname].filter(Boolean).join(" ");
}

function formatJudiciary(judiciary: PddaJudiciary): string {
  const names: string[] = [];
  const judge = formatCitizenName(judiciary.Judge).trim();
  if (judge) names.push(judge);
  for (const justice of judiciary.Justice ?? []) {
    const name = formatCitizenName(justice).trim();
    if (name) names.push(name);
  }
  return names.join(", ");
}

function formatDefendantName(defendant: PddaDefendant): string {
  if (defendant.PersonalDetails.IsMasked === "yes" && defendant.PersonalDetails.MaskedName) {
    return defendant.PersonalDetails.MaskedName;
  }
  const name = defendant.PersonalDetails.Name;
  return [name.CitizenNameForename, name.CitizenNameSurname].filter(Boolean).join(" ");
}

function extractRepresentative(defendants: PddaDefendant[]): string {
  const reps: string[] = [];
  for (const defendant of defendants) {
    for (const counsel of defendant.Counsel ?? []) {
      for (const solicitor of counsel.Solicitor ?? []) {
        if (solicitor.Party?.Organisation?.OrganisationName) {
          reps.push(solicitor.Party.Organisation.OrganisationName);
        } else if (solicitor.Party?.Person) {
          const name = [solicitor.Party.Person.CitizenNameForename, solicitor.Party.Person.CitizenNameSurname].filter(Boolean).join(" ");
          if (name) reps.push(name);
        }
      }
    }
  }
  return reps.join(", ");
}

function renderHearing(hearing: NonNullable<CrownFirmListData["FirmList"]["CourtLists"][0]["Sittings"][0]["Hearings"]>[0]): CrownFirmHearingRendered {
  const defendants = hearing.Defendants ?? [];
  const caseRendered: CrownFirmCaseRendered = {
    caseNumber: hearing.CaseNumber,
    prosecutingAuthority: hearing.Prosecution?.ProsecutingAuthority || "",
    listingNotes: hearing.ListNote || "",
    defendants: defendants.map(formatDefendantName).filter(Boolean).join(", "),
    representative: extractRepresentative(defendants),
    formattedReportingRestriction: ""
  };

  return {
    displayHearingType: hearing.HearingDetails.HearingDescription || hearing.HearingDetails.HearingType || "",
    case: [caseRendered]
  };
}

function buildGroupedListData(jsonData: CrownFirmListData, locale: string): CrownFirmGroupedDay[] {
  const dayMap = new Map<string, CrownFirmDaySitting[]>();

  for (const courtList of jsonData.FirmList.CourtLists) {
    const day = formatSittingDate(courtList.SittingDate, locale);

    for (const sitting of courtList.Sittings) {
      const daySitting: CrownFirmDaySitting = {
        courtRoomName: sitting.CourtRoomNumber,
        formattedJudiciaries: formatJudiciary(sitting.Judiciary),
        time: formatSittingTime(sitting.SittingAt),
        hearing: (sitting.Hearings ?? []).map(renderHearing)
      };

      const existing = dayMap.get(day);
      if (existing) {
        existing.push(daySitting);
      } else {
        dayMap.set(day, [daySitting]);
      }
    }
  }

  return Array.from(dayMap.entries()).map(([day, sittings]) => ({ day, sittings }));
}
