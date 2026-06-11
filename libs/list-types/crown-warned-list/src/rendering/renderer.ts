import { createPartyDetails, formatContentDate, formatPublicationDateTime, formatTime } from "@hmcts/list-types-common";
import { getLocationById } from "@hmcts/location";
import { DateTime } from "luxon";
import type { CrownWarnedCase, CrownWarnedCaseRow, CrownWarnedListData, GroupedHearingCategory, Party, RenderOptions } from "../models/types.js";

const HEARING_CATEGORIES = ["For Trial", "For Plea", "For Sentence", "For Appeal", "To be allocated"];

export async function renderCrownWarnedListData(jsonData: CrownWarnedListData, options: RenderOptions) {
  const location = await getLocationById(Number.parseInt(options.locationId, 10));
  const locationName = options.locale === "cy" && location?.welshName ? location.welshName : location?.name || jsonData.venue.venueName;

  const header = {
    locationName,
    addressLines: formatAddress(jsonData.venue.venueAddress),
    contentDate: formatContentDate(options.contentDate, options.locale),
    lastUpdated: formatPublicationDateTime(jsonData.document.publicationDate, options.locale),
    weekCommencing: formatWeekCommencing(jsonData.document.weekCommencing, options.locale)
  };

  const openJustice = {
    venueName: jsonData.venue.venueName,
    email: jsonData.venue.venueContact?.venueEmail || "",
    phone: jsonData.venue.venueContact?.venueTelephone || ""
  };

  const categoryMap: Map<string, CrownWarnedCaseRow[]> = new Map();
  for (const cat of HEARING_CATEGORIES) {
    categoryMap.set(cat, []);
  }

  for (const courtList of jsonData.courtLists) {
    for (const courtRoom of courtList.courtHouse.courtRoom) {
      for (const session of courtRoom.session) {
        for (const sitting of session.sittings) {
          const sittingTime = formatTime(sitting.sittingStart);

          for (const hearing of sitting.hearing) {
            const category = resolveCategoryFromDescription(hearing.hearingDescription || hearing.hearingType || "");

            for (const caseItem of hearing.case) {
              const { names, isInCustody } = extractDefendants(caseItem);
              const linkedCases = (caseItem.linkedCases || []).map((lc) => lc.caseReference || "").filter((r) => r.length > 0);

              const row: CrownWarnedCaseRow = {
                fixedFor: caseItem.fixedFor || sittingTime,
                caseNumber: caseItem.caseNumber || "",
                defendants: names.join(", "),
                prosecutingAuthority: caseItem.prosecutingAuthority || "",
                linkedCases: linkedCases.join(", "),
                listingNotes: caseItem.listingNotes || "",
                isInCustody
              };

              const categoryRows = categoryMap.get(category);
              if (categoryRows) categoryRows.push(row);
            }
          }
        }
      }
    }
  }

  const groupedCategories: GroupedHearingCategory[] = [];
  for (const cat of HEARING_CATEGORIES) {
    const cases = categoryMap.get(cat) || [];
    if (cases.length > 0) {
      groupedCategories.push({ category: cat, cases });
    }
  }

  return { header, openJustice, groupedCategories };
}

function formatAddress(address: CrownWarnedListData["venue"]["venueAddress"]): string[] {
  const parts: string[] = [];
  for (const line of address.line) {
    if (line && line.length > 0) parts.push(line);
  }
  if (address.town && address.town.length > 0) parts.push(address.town);
  if (address.county && address.county.length > 0) parts.push(address.county);
  if (address.postCode && address.postCode.length > 0) parts.push(address.postCode);
  return parts;
}

function formatWeekCommencing(isoOrText: string | undefined, locale: string): string {
  if (!isoOrText) return "";
  const localeCode = locale === "cy" ? "cy-GB" : "en-GB";
  const dt = DateTime.fromISO(isoOrText).setZone("Europe/London");
  if (dt.isValid) {
    return dt.toJSDate().toLocaleDateString(localeCode, {
      day: "2-digit",
      month: "long",
      year: "numeric"
    });
  }
  return isoOrText;
}

function extractDefendants(caseItem: CrownWarnedCase): { names: string[]; isInCustody: boolean } {
  const names: string[] = [];
  let isInCustody = false;

  for (const party of caseItem.party ?? []) {
    if (party.partyRole === "DEFENDANT") {
      const details = createPartyDetails(party as Party).trim();
      if (details) names.push(details);
    } else if (party.partyRole === "DEFENDANT_IN_CUSTODY") {
      const details = createPartyDetails(party as Party).trim();
      if (details) names.push(details);
      isInCustody = true;
    }
  }

  return { names, isInCustody };
}

function resolveCategoryFromDescription(description: string): string {
  const normalised = (description || "").toLowerCase();
  if (normalised.includes("trial")) return "For Trial";
  if (normalised.includes("plea")) return "For Plea";
  if (normalised.includes("sentence")) return "For Sentence";
  if (normalised.includes("appeal")) return "For Appeal";
  return "To be allocated";
}
