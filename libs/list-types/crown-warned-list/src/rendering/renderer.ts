import { formatContentDate } from "@hmcts/list-types-common";
import { getLocationById } from "@hmcts/location";
import { DateTime } from "luxon";
import type { CitizenName, CrownWarnedCaseRow, CrownWarnedListData, GroupedHearingCategory, PddaCase, PddaDefendant, RenderOptions } from "../models/types.js";

export const TO_BE_ALLOCATED_KEY = "TO_BE_ALLOCATED";
const CUSTODY_STATUSES = ["On remand", "In custody", "In care"];

export async function renderCrownWarnedListData(jsonData: CrownWarnedListData, options: RenderOptions) {
  const { WarnedList } = jsonData;
  const location = await getLocationById(Number.parseInt(options.locationId, 10));
  const locationName = options.locale === "cy" && location?.welshName ? location.welshName : location?.name || WarnedList.CrownCourt.CourtHouseName;

  const address = WarnedList.CrownCourt.CourtHouseAddress;
  const dateSeparator = options.locale === "cy" ? "i" : "to";
  const formattedStart = WarnedList.ListHeader.StartDate ? formatLongDate(WarnedList.ListHeader.StartDate, options.locale) : "";
  const formattedEnd = WarnedList.ListHeader.EndDate ? formatLongDate(WarnedList.ListHeader.EndDate, options.locale) : "";
  const dateRange = formattedStart && formattedEnd ? `${formattedStart} ${dateSeparator} ${formattedEnd}` : formattedStart || formattedEnd || "";

  const header = {
    locationName,
    addressLines: formatAddress(address),
    dateRange,
    lastUpdated: formatLongDate(WarnedList.ListHeader.PublishedTime, options.locale),
    weekCommencing: formatContentDate(options.contentDate, options.locale),
    version: WarnedList.ListHeader.Version || ""
  };

  const openJustice = {
    venueName: WarnedList.CrownCourt.CourtHouseName,
    email: "",
    phone: WarnedList.CrownCourt.CourtHouseTelephone || ""
  };

  const categoryMap: Map<string, CrownWarnedCaseRow[]> = new Map();
  for (const courtList of WarnedList.CourtLists) {
    for (const entry of courtList.WithFixedDate ?? []) {
      for (const fixture of entry.Fixture ?? []) {
        for (const caseItem of fixture.Cases ?? []) {
          const hearings = caseItem.Hearing ?? [];
          const labels = [...new Set(hearings.map((h) => h.HearingDescription || "").filter(Boolean))];
          const effectiveLabels = labels.length > 0 ? labels : [""];
          for (const label of effectiveLabels) {
            if (!categoryMap.has(label)) categoryMap.set(label, []);
            categoryMap.get(label)!.push(processCase(caseItem, fixture.FixedDate));
          }
        }
      }
    }

    for (const entry of courtList.WithoutFixedDate ?? []) {
      if (!categoryMap.has(TO_BE_ALLOCATED_KEY)) categoryMap.set(TO_BE_ALLOCATED_KEY, []);
      for (const fixture of entry.Fixture ?? []) {
        for (const caseItem of fixture.Cases ?? []) {
          categoryMap.get(TO_BE_ALLOCATED_KEY)!.push(processCase(caseItem, fixture.FixedDate));
        }
      }
    }
  }

  const groupedCategories: GroupedHearingCategory[] = [];
  for (const [category, cases] of categoryMap.entries()) {
    if (cases.length > 0) groupedCategories.push({ category, cases });
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

function formatLongDate(dateStr: string | undefined, locale: string): string {
  if (!dateStr) return "";
  const localeCode = locale === "cy" ? "cy-GB" : "en-GB";
  const dt = DateTime.fromISO(dateStr);
  if (!dt.isValid) return dateStr;
  return dt.toJSDate().toLocaleDateString(localeCode, { day: "2-digit", month: "long", year: "numeric" });
}

function formatShortDate(dateStr: string | undefined): string {
  if (!dateStr) return "";
  const dt = DateTime.fromISO(dateStr);
  if (!dt.isValid) return dateStr;
  return dt.toFormat("dd/MM/yyyy");
}

function formatCitizenName(name: CitizenName): string {
  if (name.CitizenNameRequestedName) {
    return [name.CitizenNameTitle, name.CitizenNameRequestedName].filter(Boolean).join(" ");
  }
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

function processCase(caseItem: PddaCase, fixedDate: string | undefined): CrownWarnedCaseRow {
  const defendants = caseItem.Defendants ?? [];
  const names = defendants.map(formatDefendantName).filter((n) => n.length > 0);
  const inCustody = defendants.some(isDefendantInCustody);
  const linkedCases = (caseItem.LinkedCases ?? []).map((lc) => lc.CaseNumber ?? "").filter((n) => n.length > 0);
  const listNote = caseItem.Hearing?.[0]?.ListNote ?? "";

  return {
    fixedFor: formatShortDate(fixedDate),
    caseNumber: caseItem.CaseNumber ?? "",
    defendants: names.join(", "),
    prosecutingAuthority: caseItem.Prosecution?.ProsecutingAuthority ?? "",
    linkedCases: linkedCases.join(", "),
    listingNotes: listNote,
    isInCustody: inCustody
  };
}
