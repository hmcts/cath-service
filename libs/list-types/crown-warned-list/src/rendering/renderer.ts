import { formatContentDate } from "@hmcts/list-types-common";
import { getLocationById } from "@hmcts/location";
import { DateTime } from "luxon";
import type { CitizenName, CrownWarnedCaseRow, CrownWarnedListData, GroupedHearingCategory, PddaCase, PddaDefendant, RenderOptions } from "../models/types.js";

const CUSTODY_STATUSES = ["On remand", "In custody", "In care"];
const CATEGORIES = ["WithFixedDate", "WithoutFixedDate"];

export async function renderCrownWarnedListData(jsonData: CrownWarnedListData, options: RenderOptions) {
  const { WarnedList } = jsonData;
  const location = await getLocationById(Number.parseInt(options.locationId, 10));
  const locationName = options.locale === "cy" && location?.welshName ? location.welshName : location?.name || WarnedList.CrownCourt.CourtHouseName;

  const address = WarnedList.CrownCourt.CourtHouseAddress;

  const header = {
    locationName,
    addressLines: formatAddress(address),
    contentDate: formatContentDate(options.contentDate, options.locale),
    lastUpdated: formatDate(WarnedList.ListHeader.PublishedTime, options.locale),
    weekCommencing: formatDate(WarnedList.ListHeader.StartDate, options.locale)
  };

  const openJustice = {
    venueName: WarnedList.CrownCourt.CourtHouseName,
    email: "",
    phone: WarnedList.CrownCourt.CourtHouseTelephone || ""
  };

  const categoryMap: Map<string, CrownWarnedCaseRow[]> = new Map();
  for (const cat of CATEGORIES) {
    categoryMap.set(cat, []);
  }

  for (const courtList of WarnedList.CourtLists) {
    for (const entry of courtList.WithFixedDate ?? []) {
      for (const fixture of entry.Fixture ?? []) {
        for (const caseItem of fixture.Cases ?? []) {
          const row = processCase(caseItem, fixture.FixedDate, options.locale);
          categoryMap.get("WithFixedDate")!.push(row);
        }
      }
    }

    for (const entry of courtList.WithoutFixedDate ?? []) {
      for (const fixture of entry.Fixture ?? []) {
        for (const caseItem of fixture.Cases ?? []) {
          const row = processCase(caseItem, undefined, options.locale);
          categoryMap.get("WithoutFixedDate")!.push(row);
        }
      }
    }
  }

  const groupedCategories: GroupedHearingCategory[] = [];
  for (const cat of CATEGORIES) {
    const cases = categoryMap.get(cat) ?? [];
    if (cases.length > 0) {
      groupedCategories.push({ category: cat, cases });
    }
  }

  return { header, openJustice, groupedCategories };
}

function formatAddress(address: CrownWarnedListData["WarnedList"]["CrownCourt"]["CourtHouseAddress"]): string[] {
  if (!address) return [];
  const parts: string[] = [];
  for (const line of address.Line ?? []) {
    if (line && line.length > 0) parts.push(line);
  }
  if (address.PostCode && address.PostCode.length > 0) parts.push(address.PostCode);
  return parts;
}

function formatDate(dateStr: string | undefined, locale: string): string {
  if (!dateStr) return "";
  const localeCode = locale === "cy" ? "cy-GB" : "en-GB";
  const dt = DateTime.fromISO(dateStr);
  if (!dt.isValid) return dateStr;
  return dt.toJSDate().toLocaleDateString(localeCode, { day: "2-digit", month: "long", year: "numeric" });
}

function formatCitizenName(name: CitizenName): string {
  const forenames = (name.CitizenNameForename ?? []).join(" ");
  return [name.CitizenNameTitle, forenames, name.CitizenNameSurname].filter(Boolean).join(" ");
}

function formatDefendantName(defendant: PddaDefendant): string {
  if (defendant.PersonalDetails.IsMasked === "yes" && defendant.PersonalDetails.MaskedName) {
    return defendant.PersonalDetails.MaskedName;
  }
  return formatCitizenName(defendant.PersonalDetails.Name);
}

function isDefendantInCustody(defendant: PddaDefendant): boolean {
  return CUSTODY_STATUSES.includes(defendant.PersonalDetails.CustodyStatus ?? "");
}

function processCase(caseItem: PddaCase, fixedDate: string | undefined, locale: string): CrownWarnedCaseRow {
  const defendants = caseItem.Defendants ?? [];
  const names = defendants.map(formatDefendantName).filter((n) => n.length > 0);
  const inCustody = defendants.some(isDefendantInCustody);
  const linkedCases = (caseItem.LinkedCases ?? []).map((lc) => lc.CaseNumber ?? "").filter((n) => n.length > 0);
  const listNote = caseItem.Hearing?.[0]?.ListNote ?? "";

  return {
    fixedFor: fixedDate ? formatDate(fixedDate, locale) : "",
    caseNumber: caseItem.CaseNumber ?? "",
    defendants: names.join(", "),
    prosecutingAuthority: caseItem.Prosecution?.ProsecutingAuthority ?? "",
    linkedCases: linkedCases.join(", "),
    listingNotes: listNote,
    isInCustody: inCustody
  };
}
