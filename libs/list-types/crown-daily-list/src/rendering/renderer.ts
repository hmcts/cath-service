import { formatContentDate, formatCrownLastUpdated, formatPddaCitizenName, formatPddaDefendantName, formatPddaSittingTime } from "@hmcts/list-types-common";
import { getLocationById } from "@hmcts/location";
import type {
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

  const crownCourt = jsonData.DailyList.CrownCourt;
  const address = crownCourt.CourtHouseAddress;
  const addressLines = formatAddress(address);

  const publishedTime = jsonData.DailyList.ListHeader.PublishedTime;
  const lastUpdated = publishedTime ? formatCrownLastUpdated(publishedTime, options.locale) : "";

  const startDate = jsonData.DailyList.ListHeader.StartDate;
  const contentDate = startDate ? formatContentDate(new Date(startDate), options.locale) : formatContentDate(options.contentDate, options.locale);

  const header = {
    locationName,
    addressLines,
    contentDate,
    lastUpdated,
    version: jsonData.DailyList.ListHeader.Version || ""
  };

  const openJustice = {
    venueName: crownCourt.CourtHouseName,
    email: "",
    phone: crownCourt.CourtHouseTelephone || ""
  };

  const listData: CrownDailyListRendered = {
    courtLists: jsonData.DailyList.CourtLists.map((courtList) => {
      const courtHouseName = courtList.CourtHouse?.CourtHouseName || jsonData.DailyList.CrownCourt.CourtHouseName;
      const courtHouseAddressLines = formatAddress(courtList.CourtHouse?.CourtHouseAddress);
      const courtHousePhone = courtList.CourtHouse?.CourtHouseTelephone || "";
      const courtRoom = groupSittingsByCourtRoom(courtList.Sittings);
      return {
        courtHouse: {
          courtHouseName,
          courtHouseAddressLines,
          courtHousePhone,
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
  for (const line of address.Line ?? []) {
    if (line) parts.push(line);
  }
  if (address.PostCode) parts.push(address.PostCode);
  return parts;
}

function groupSittingsByCourtRoom(sittings: PddaSitting[]): CrownDailyCourtRoomRendered[] {
  const roomMap = new Map<string, PddaSitting[]>();
  for (const sitting of sittings) {
    const room = String(sitting.CourtRoomNumber);
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
  const hasListingNotes = (sitting.Hearings ?? []).some((h) => !!h.ListNote);
  return {
    formattedJudiciaries: formatJudiciary(sitting.Judiciary),
    hasListingNotes,
    sittings: [renderSitting(sitting)]
  };
}

function renderSitting(sitting: PddaSitting): CrownDailySittingRendered {
  return {
    time: formatPddaSittingTime(sitting.SittingAt),
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
    timeMarkingNote: hearing.TimeMarkingNote || "",
    defendants,
    representative: "",
    formattedReportingRestriction: ""
  };
}

function formatJudiciary(judiciary: PddaJudiciary): string {
  const names: string[] = [];
  const judgeName = formatPddaCitizenName(judiciary.Judge).trim();
  if (judgeName) names.push(judgeName);
  for (const justice of judiciary.Justice ?? []) {
    const justiceName = formatPddaCitizenName(justice).trim();
    if (justiceName) names.push(justiceName);
  }
  return names.join(", ");
}

function formatDefendantName(defendant: PddaDefendant): string {
  return formatPddaDefendantName(defendant.PersonalDetails);
}
