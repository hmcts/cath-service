import { createPartyDetails, formatContentDate, formatPublicationDateTime, formatTime } from "@hmcts/list-types-common";
import { getLocationById } from "@hmcts/location";
import { DateTime } from "luxon";
import type {
  CrownFirmCaseRendered,
  CrownFirmCourtRoomRendered,
  CrownFirmDaySitting,
  CrownFirmGroupedDay,
  CrownFirmHearingRendered,
  CrownFirmListData,
  CrownFirmListRendered,
  CrownFirmSessionRendered,
  CrownFirmSittingRendered,
  Party,
  RenderOptions,
  Session
} from "../models/types.js";

export async function renderCrownFirmListData(jsonData: CrownFirmListData, options: RenderOptions) {
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

  const listData: CrownFirmListRendered = {
    courtLists: jsonData.courtLists.map((courtList) => ({
      courtHouse: {
        courtHouseName: courtList.courtHouse.courtHouseName,
        courtHouseAddress: courtList.courtHouse.courtHouseAddress,
        courtRoom: courtList.courtHouse.courtRoom.map((courtRoom) => renderCourtRoom(courtRoom, options.locale))
      }
    }))
  };

  const groupedListData = buildGroupedListData(jsonData, options.locale);

  return { header, openJustice, listData, groupedListData };
}

function formatAddress(address: CrownFirmListData["venue"]["venueAddress"]): string[] {
  const parts: string[] = [];
  for (const line of address.line) {
    if (line && line.length > 0) parts.push(line);
  }
  if (address.town && address.town.length > 0) parts.push(address.town);
  if (address.county && address.county.length > 0) parts.push(address.county);
  if (address.postCode && address.postCode.length > 0) parts.push(address.postCode);
  return parts;
}

function renderCourtRoom(courtRoom: CrownFirmListData["courtLists"][0]["courtHouse"]["courtRoom"][0], locale: string): CrownFirmCourtRoomRendered {
  return {
    courtRoomName: courtRoom.courtRoomName,
    session: courtRoom.session.map((session) => renderSession(session, locale))
  };
}

function renderSession(session: Session, locale: string): CrownFirmSessionRendered {
  return {
    formattedJudiciaries: formatJudiciaries(session),
    sittings: session.sittings.map((sitting) => renderSitting(sitting, locale))
  };
}

function formatJudiciaries(session: Session): string {
  const presiding: string[] = [];
  const others: string[] = [];
  for (const judiciary of session.judiciary ?? []) {
    const name = judiciary.johKnownAs?.trim();
    if (name) {
      if (judiciary.isPresiding) {
        presiding.push(name);
      } else {
        others.push(name);
      }
    }
  }
  return [...presiding, ...others].join(", ");
}

function renderSitting(
  sitting: CrownFirmListData["courtLists"][0]["courtHouse"]["courtRoom"][0]["session"][0]["sittings"][0],
  locale: string
): CrownFirmSittingRendered {
  return {
    time: formatTime(sitting.sittingStart),
    sittingDay: formatSittingDay(sitting.sittingStart, locale),
    hearing: sitting.hearing.map(renderHearing)
  };
}

function formatSittingDay(isoDateTime: string, locale: string): string {
  const localeCode = locale === "cy" ? "cy-GB" : "en-GB";
  const dt = DateTime.fromISO(isoDateTime).setZone("Europe/London");
  return dt.toJSDate().toLocaleDateString(localeCode, {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
}

function renderHearing(
  hearing: CrownFirmListData["courtLists"][0]["courtHouse"]["courtRoom"][0]["session"][0]["sittings"][0]["hearing"][0]
): CrownFirmHearingRendered {
  return {
    displayHearingType: hearing.hearingDescription || hearing.hearingType || "",
    case: hearing.case.map(renderCase)
  };
}

function renderCase(
  caseItem: CrownFirmListData["courtLists"][0]["courtHouse"]["courtRoom"][0]["session"][0]["sittings"][0]["hearing"][0]["case"][0]
): CrownFirmCaseRendered {
  const defendants: string[] = [];
  let representative = "";

  for (const party of caseItem.party ?? []) {
    const details = createPartyDetails(party as Party).trim();
    if (!details) continue;

    if (party.partyRole === "DEFENDANT") {
      defendants.push(details);
    } else if (party.partyRole === "DEFENDANT_REPRESENTATIVE") {
      if (representative.length > 0) representative += ", ";
      representative += details;
    }
  }

  const restrictions = caseItem.reportingRestrictionDetail?.filter((r) => r.length > 0) || [];

  return {
    caseNumber: caseItem.caseNumber,
    prosecutingAuthority: caseItem.prosecutingAuthority || "",
    listingNotes: caseItem.listingNotes || "",
    defendants: defendants.join(", "),
    representative: representative.trim(),
    formattedReportingRestriction: restrictions.join(", ")
  };
}

function buildGroupedListData(jsonData: CrownFirmListData, locale: string): CrownFirmGroupedDay[] {
  const dayMap = new Map<string, CrownFirmDaySitting[]>();

  for (const courtList of jsonData.courtLists) {
    for (const courtRoom of courtList.courtHouse.courtRoom) {
      for (const session of courtRoom.session) {
        const formattedJudiciaries = formatJudiciaries(session);

        for (const sitting of session.sittings) {
          const day = formatSittingDay(sitting.sittingStart, locale);
          const time = formatTime(sitting.sittingStart);
          const hearings = sitting.hearing.map(renderHearing);

          const daySitting: CrownFirmDaySitting = {
            courtRoomName: courtRoom.courtRoomName,
            formattedJudiciaries,
            time,
            hearing: hearings
          };

          const existing = dayMap.get(day);
          if (existing) {
            existing.push(daySitting);
          } else {
            dayMap.set(day, [daySitting]);
          }
        }
      }
    }
  }

  return Array.from(dayMap.entries()).map(([day, sittings]) => ({ day, sittings }));
}
