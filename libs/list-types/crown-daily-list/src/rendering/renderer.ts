import { createPartyDetails, formatContentDate, formatPublicationDateTime, formatTime } from "@hmcts/list-types-common";
import { getLocationById } from "@hmcts/location";
import type {
  CrownDailyCaseRendered,
  CrownDailyCourtRoomRendered,
  CrownDailyHearingRendered,
  CrownDailyListData,
  CrownDailyListRendered,
  CrownDailySessionRendered,
  CrownDailySittingRendered,
  Party,
  RenderOptions,
  Session
} from "../models/types.js";

export async function renderCrownDailyListData(jsonData: CrownDailyListData, options: RenderOptions) {
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

  const listData: CrownDailyListRendered = {
    courtLists: jsonData.courtLists.map((courtList) => ({
      courtHouse: {
        courtHouseName: courtList.courtHouse.courtHouseName,
        courtHouseAddress: courtList.courtHouse.courtHouseAddress,
        courtRoom: courtList.courtHouse.courtRoom.map(renderCourtRoom)
      }
    }))
  };

  return { header, openJustice, listData };
}

function formatAddress(address: CrownDailyListData["venue"]["venueAddress"]): string[] {
  const parts: string[] = [];
  for (const line of address.line) {
    if (line && line.length > 0) parts.push(line);
  }
  if (address.town && address.town.length > 0) parts.push(address.town);
  if (address.county && address.county.length > 0) parts.push(address.county);
  if (address.postCode && address.postCode.length > 0) parts.push(address.postCode);
  return parts;
}

function renderCourtRoom(courtRoom: CrownDailyListData["courtLists"][0]["courtHouse"]["courtRoom"][0]): CrownDailyCourtRoomRendered {
  return {
    courtRoomName: courtRoom.courtRoomName,
    session: courtRoom.session.map(renderSession)
  };
}

function renderSession(session: Session): CrownDailySessionRendered {
  return {
    formattedJudiciaries: formatJudiciaries(session),
    sittings: session.sittings.map(renderSitting)
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

function renderSitting(sitting: CrownDailyListData["courtLists"][0]["courtHouse"]["courtRoom"][0]["session"][0]["sittings"][0]): CrownDailySittingRendered {
  return {
    time: formatTime(sitting.sittingStart),
    hearing: sitting.hearing.map(renderHearing)
  };
}

function renderHearing(
  hearing: CrownDailyListData["courtLists"][0]["courtHouse"]["courtRoom"][0]["session"][0]["sittings"][0]["hearing"][0]
): CrownDailyHearingRendered {
  return {
    displayHearingType: hearing.hearingDescription || hearing.hearingType || "",
    case: hearing.case.map(renderCase)
  };
}

function renderCase(
  caseItem: CrownDailyListData["courtLists"][0]["courtHouse"]["courtRoom"][0]["session"][0]["sittings"][0]["hearing"][0]["case"][0]
): CrownDailyCaseRendered {
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
