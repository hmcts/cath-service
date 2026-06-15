import { formatContentDate } from "@hmcts/list-types-common";
import { getLocationById } from "@hmcts/location";
import type {
  CitizenName,
  CrownDailyCaseRendered,
  CrownDailyCourtRoomRendered,
  CrownDailyHearingRendered,
  CrownDailyListData,
  CrownDailyListRendered,
  CrownDailySessionRendered,
  CrownDailySittingRendered,
  PddaDefendant,
  PddaHearing,
  PddaJudiciary,
  PddaSitting,
  RenderOptions
} from "../models/types.js";

export async function renderCrownDailyListData(jsonData: CrownDailyListData, options: RenderOptions) {
  const location = await getLocationById(Number.parseInt(options.locationId, 10));
  const locationName = options.locale === "cy" && location?.welshName ? location.welshName : location?.name || jsonData.DailyList.CrownCourt.CourtHouseName;

  const address = jsonData.DailyList.CrownCourt.CourtHouseAddress;
  const addressLines = formatAddress(address);

  const lastPubDate = jsonData.DailyList.ListHeader.LastPublicationDate;
  const lastUpdated = lastPubDate ? formatContentDate(new Date(lastPubDate), options.locale) : "";

  const header = {
    locationName,
    addressLines,
    contentDate: formatContentDate(options.contentDate, options.locale),
    lastUpdated
  };

  const openJustice = {
    venueName: jsonData.DailyList.CrownCourt.CourtHouseName,
    email: address?.CourtHouseAddressEmail || "",
    phone: address?.CourtHouseAddressPhone || ""
  };

  const listData: CrownDailyListRendered = {
    courtLists: jsonData.DailyList.CourtLists.map((courtList) => {
      const courtHouseName = courtList.CourtHouse?.CourtHouseName || jsonData.DailyList.CrownCourt.CourtHouseName;
      const courtRoom = groupSittingsByCourtRoom(courtList.Sittings);
      return {
        courtHouse: {
          courtHouseName,
          courtRoom
        }
      };
    })
  };

  return { header, openJustice, listData };
}

function formatAddress(address: CrownDailyListData["DailyList"]["CrownCourt"]["CourtHouseAddress"]): string[] {
  if (!address) return [];
  const parts: string[] = [];
  for (const line of address.CourtHouseAddressLine ?? []) {
    if (line) parts.push(line);
  }
  if (address.CourtHouseAddressTown) parts.push(address.CourtHouseAddressTown);
  if (address.CourtHouseAddressCounty) parts.push(address.CourtHouseAddressCounty);
  if (address.CourtHouseAddressPostCode) parts.push(address.CourtHouseAddressPostCode);
  return parts;
}

function groupSittingsByCourtRoom(sittings: PddaSitting[]): CrownDailyCourtRoomRendered[] {
  const roomMap = new Map<string, PddaSitting[]>();
  for (const sitting of sittings) {
    const room = sitting.CourtRoomNumber;
    const existing = roomMap.get(room);
    if (existing) {
      existing.push(sitting);
    } else {
      roomMap.set(room, [sitting]);
    }
  }
  const result: CrownDailyCourtRoomRendered[] = [];
  for (const [roomName, roomSittings] of roomMap) {
    result.push({
      courtRoomName: roomName,
      session: roomSittings.map(renderSession)
    });
  }
  return result;
}

function renderSession(sitting: PddaSitting): CrownDailySessionRendered {
  return {
    formattedJudiciaries: formatJudiciary(sitting.Judiciary),
    sittings: [renderSitting(sitting)]
  };
}

function renderSitting(sitting: PddaSitting): CrownDailySittingRendered {
  return {
    time: formatSittingTime(sitting.SittingAt),
    hearing: (sitting.Hearings ?? []).map(renderHearing)
  };
}

function renderHearing(hearing: PddaHearing): CrownDailyHearingRendered {
  return {
    displayHearingType: hearing.HearingDetails.HearingDescription || hearing.HearingDetails.HearingType || "",
    case: [renderCase(hearing)]
  };
}

function renderCase(hearing: PddaHearing): CrownDailyCaseRendered {
  const defendants = (hearing.Defendants ?? []).map(formatDefendantName).filter(Boolean).join(", ");
  return {
    caseNumber: hearing.CaseNumber,
    prosecutingAuthority: hearing.Prosecution?.ProsecutingAuthority || "",
    listingNotes: hearing.ListNote || "",
    defendants,
    representative: "",
    formattedReportingRestriction: ""
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
  if (minutes === 0) {
    return `${displayHours}${ampm}`;
  }
  return `${displayHours}:${String(minutes).padStart(2, "0")}${ampm}`;
}

function formatCitizenName(name: CitizenName): string {
  const parts = [name.CitizenNameTitle, name.CitizenNameForename, name.CitizenNameSurname].filter(Boolean);
  return parts.join(" ");
}

function formatJudiciary(judiciary: PddaJudiciary): string {
  const names: string[] = [];
  const judgeName = formatCitizenName(judiciary.Judge).trim();
  if (judgeName) names.push(judgeName);
  for (const justice of judiciary.Justice ?? []) {
    const justiceName = formatCitizenName(justice).trim();
    if (justiceName) names.push(justiceName);
  }
  return names.join(", ");
}

function formatDefendantName(defendant: PddaDefendant): string {
  if (defendant.PersonalDetails.IsMasked === "yes" && defendant.PersonalDetails.MaskedName) {
    return defendant.PersonalDetails.MaskedName;
  }
  const name = defendant.PersonalDetails.Name;
  const parts = [name.CitizenNameForename, name.CitizenNameSurname].filter(Boolean);
  return parts.join(" ");
}
