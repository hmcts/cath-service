import { formatContentDate, formatCrownLastUpdated, formatPddaDefendantName } from "@hmcts/list-types-common";
import { getLocationById } from "@hmcts/location";
import { DateTime } from "luxon";
import { formatShortDate } from "../date-formatting.js";
import type { CrownWarnedCaseRow, CrownWarnedListData, GroupedHearingCategory, PddaCase, PddaDefendant, RenderOptions } from "../models/types.js";

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
    lastUpdated: WarnedList.ListHeader.PublishedTime ? formatCrownLastUpdated(WarnedList.ListHeader.PublishedTime, options.locale) : "",
    weekCommencing: formatContentDate(toStartOfWeek(options.contentDate), options.locale),
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
          const iterations = hearings.length > 0 ? hearings : [undefined];
          for (const hearing of iterations) {
            const category = hearing?.HearingDescription || "";
            if (!categoryMap.has(category)) categoryMap.set(category, []);
            categoryMap.get(category)!.push(processCase(caseItem, fixture.FixedDate, hearing));
          }
        }
      }
    }

    for (const entry of courtList.WithoutFixedDate ?? []) {
      if (!categoryMap.has(TO_BE_ALLOCATED_KEY)) categoryMap.set(TO_BE_ALLOCATED_KEY, []);
      for (const fixture of entry.Fixture ?? []) {
        for (const caseItem of fixture.Cases ?? []) {
          const hearings = caseItem.Hearing ?? [];
          const iterations = hearings.length > 0 ? hearings : [undefined];
          for (const hearing of iterations) {
            categoryMap.get(TO_BE_ALLOCATED_KEY)!.push(processCase(caseItem, fixture.FixedDate, hearing));
          }
        }
      }
    }
  }

  for (const cases of categoryMap.values()) {
    cases.sort((a, b) => {
      const aDate = a.fixedFor ? new Date(a.fixedFor.split("/").reverse().join("-")).getTime() : 0;
      const bDate = b.fixedFor ? new Date(b.fixedFor.split("/").reverse().join("-")).getTime() : 0;
      return aDate - bDate;
    });
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

function toStartOfWeek(date: Date): Date {
  const dt = DateTime.fromJSDate(date);
  if (dt.weekday === 1) return date;
  return dt.startOf("week").toJSDate();
}

function formatDefendantName(defendant: PddaDefendant): string {
  return formatPddaDefendantName(defendant.PersonalDetails);
}

function isDefendantInCustody(defendant: PddaDefendant): boolean {
  return CUSTODY_STATUSES.includes(defendant.PersonalDetails.CustodyStatus ?? "");
}

type Hearing = NonNullable<PddaCase["Hearing"]>[0];

function processCase(caseItem: PddaCase, fixedDate: string | undefined, hearing: Hearing | undefined): CrownWarnedCaseRow {
  const defendants = caseItem.Defendants ?? [];
  const names = defendants.map(formatDefendantName).filter((n) => n.length > 0);
  const inCustody = defendants.some(isDefendantInCustody);
  const linkedCases = (caseItem.LinkedCases ?? []).map((lc) => lc.CaseNumber ?? "").filter((n) => n.length > 0);

  return {
    fixedFor: formatShortDate(fixedDate),
    caseNumber: caseItem.CaseNumberCaTH ?? caseItem.CaseNumber ?? "",
    defendants: names.join(", "),
    prosecutingAuthority: caseItem.Prosecution?.ProsecutingAuthority ?? "",
    linkedCases: linkedCases.join(", "),
    listingNotes: hearing?.ListNote ?? "",
    isInCustody: inCustody
  };
}
