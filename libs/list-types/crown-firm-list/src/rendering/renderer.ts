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
  PddaCourtHouse,
  PddaDefendant,
  PddaJudiciary,
  RenderOptions
} from "../models/types.js";

export async function renderCrownFirmListData(jsonData: CrownFirmListData, options: RenderOptions) {
  const { FirmList } = jsonData;
  const location = await getLocationById(Number.parseInt(options.locationId, 10));
  const locationName = options.locale === "cy" && location?.welshName ? location.welshName : location?.name || FirmList.CrownCourt.CourtHouseName;

  const publishedTime = FirmList.ListHeader.PublishedTime;
  const lastUpdated = publishedTime ? formatCrownLastUpdated(publishedTime, options.locale) : "";

  const startDate = FirmList.ListHeader.StartDate;
  const endDate = FirmList.ListHeader.EndDate;

  const formattedStart = startDate ? formatContentDate(new Date(startDate), options.locale) : formatContentDate(options.contentDate, options.locale);
  const formattedEnd = endDate ? formatContentDate(new Date(endDate), options.locale) : "";
  const dateSeparator = options.locale === "cy" ? "i" : "to";
  const contentDate = formattedEnd ? `${formattedStart} ${dateSeparator} ${formattedEnd}` : formattedStart;

  const header = {
    locationName,
    addressLines: formatAddress(FirmList.CrownCourt),
    contentDate,
    lastUpdated,
    version: FirmList.ListHeader.Version || ""
  };

  const openJustice = {
    venueName: FirmList.CrownCourt.CourtHouseName,
    email: "",
    phone: FirmList.CrownCourt.CourtHouseTelephone || ""
  };

  const groupedListData = buildGroupedListData(jsonData, options.locale);

  return { header, openJustice, listData: null, groupedListData };
}

function formatCrownLastUpdated(isoDateTime: string, locale: string): string {
  const dt = DateTime.fromISO(isoDateTime).setZone("Europe/London").setLocale(locale);
  const date = dt.toFormat("dd MMMM yyyy");
  const hours = dt.hour;
  const minutes = dt.minute;
  const period = hours >= 12 ? "pm" : "am";
  const hour12 = hours % 12 || 12;
  const minuteStr = minutes > 0 ? `:${minutes.toString().padStart(2, "0")}` : "";
  return `${date} at ${hour12}${minuteStr}${period}`;
}

function formatAddress(court: CrownFirmListData["FirmList"]["CrownCourt"]): string[] {
  const parts: string[] = [];
  const addr = court.CourtHouseAddress;
  if (!addr) return parts;
  for (const line of addr.Line ?? []) {
    if (line) parts.push(line);
  }
  if (addr.PostCode) parts.push(addr.PostCode);
  return parts;
}

function formatSittingDate(dateStr: string, locale: string): string {
  const localeCode = locale === "cy" ? "cy-GB" : "en-GB";
  const dt = DateTime.fromISO(dateStr);
  if (!dt.isValid) return dateStr;
  const weekday = dt.toJSDate().toLocaleDateString(localeCode, { weekday: "long" });
  const date = dt.toJSDate().toLocaleDateString(localeCode, { day: "numeric", month: "long", year: "numeric" });
  return `${weekday} ${date}`;
}

function formatCourtHouseInfo(courtHouse: PddaCourtHouse) {
  const addressLines: string[] = [];
  for (const line of courtHouse.CourtHouseAddress?.Line ?? []) {
    if (line) addressLines.push(line);
  }
  if (courtHouse.CourtHouseAddress?.PostCode) {
    addressLines.push(courtHouse.CourtHouseAddress.PostCode);
  }
  return {
    name: courtHouse.CourtHouseName,
    addressLines,
    phone: courtHouse.CourtHouseTelephone || ""
  };
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
  if (name.CitizenNameRequestedName) {
    return [name.CitizenNameTitle, name.CitizenNameRequestedName].filter(Boolean).join(" ");
  }
  const forenames = (name.CitizenNameForename ?? []).join(" ");
  return [name.CitizenNameTitle, forenames, name.CitizenNameSurname].filter(Boolean).join(" ");
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
  return formatCitizenName(defendant.PersonalDetails.Name);
}

function extractRepresentative(defendants: PddaDefendant[]): string {
  const reps: string[] = [];
  for (const defendant of defendants) {
    for (const counsel of defendant.Counsel ?? []) {
      for (const solicitor of counsel.Solicitor ?? []) {
        if (solicitor.Party?.Organisation?.OrganisationName) {
          reps.push(solicitor.Party.Organisation.OrganisationName);
        } else if (solicitor.Party?.Person) {
          const name = formatCitizenName(solicitor.Party.Person);
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
    timeMarkingNote: hearing.TimeMarkingNote || "",
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
  const dayMap = new Map<string, { courtHouseInfo: ReturnType<typeof formatCourtHouseInfo>; sittings: CrownFirmDaySitting[] }>();

  for (const courtList of jsonData.FirmList.CourtLists) {
    const day = formatSittingDate(courtList.SittingDate, locale);
    const courtHouseInfo = formatCourtHouseInfo(courtList.CourtHouse);

    for (const sitting of courtList.Sittings) {
      const daySitting: CrownFirmDaySitting = {
        courtRoomName: String(sitting.CourtRoomNumber),
        formattedJudiciaries: formatJudiciary(sitting.Judiciary),
        time: formatSittingTime(sitting.SittingAt),
        hearing: (sitting.Hearings ?? []).map(renderHearing)
      };

      const existing = dayMap.get(day);
      if (existing) {
        existing.sittings.push(daySitting);
      } else {
        dayMap.set(day, { courtHouseInfo, sittings: [daySitting] });
      }
    }
  }

  return Array.from(dayMap.entries()).map(([day, data]) => ({ day, courtHouseInfo: data.courtHouseInfo, sittings: data.sittings }));
}
